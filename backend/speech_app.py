import os
import av
from faster_whisper import WhisperModel

# Compatibility fix: newer versions of the `av` library removed the `metadata_errors`
# option that faster-whisper still passes in. Drop it so audio decoding works on any version.
_original_av_open = av.open

def _av_open_compat(*args, **kwargs):
    kwargs.pop("metadata_errors", None)
    return _original_av_open(*args, **kwargs)

av.open = _av_open_compat

# Whisper normally cleans up "um"s and "uh"s. Starting it off with a prompt full of
# fillers nudges it to keep them, which is the whole point of this app.
FILLER_PROMPT = "Um, so, uh, I was like, you know, thinking, hmm, basically, I mean, it's, uh, kind of like this."


def check_audio_file(file_path):
    if not os.path.exists(file_path):
        print("Error: File not found:", file_path)
        return False

    allowed_types = [".mp3", ".m4a", ".mp4"]
    file_type = os.path.splitext(file_path)[1].lower()

    if file_type not in allowed_types:
        print("Error: Unsupported file type:", file_type)
        return False

    return True


def transcribe_with_words(model, file_path, output_file="uploads/transcript.txt"):
    """Transcribe and return the text plus every word with its start/end time (in seconds)."""
    print("converting audio")
    segments, info = model.transcribe(
        file_path,
        word_timestamps=True,
        initial_prompt=FILLER_PROMPT,
    )

    print("language:", info.language)

    full_text = ""
    words = []
    for segment in segments:
        print(f"[{segment.start:.1f}s - {segment.end:.1f}s] {segment.text}")
        full_text = full_text + segment.text + " "
        for w in segment.words or []:
            words.append({"word": w.word, "start": round(w.start, 2), "end": round(w.end, 2)})

    full_text = full_text.strip()

    with open(output_file, "w", encoding="utf-8") as file:
        file.write(full_text)
    print("Saved transcript to", output_file)

    return {"text": full_text, "words": words, "duration": round(info.duration, 2)}


def transcribe_audio(model, file_path, output_file="uploads/transcript.txt"):
    """Text only (kept so older code that expects a string still works)."""
    return transcribe_with_words(model, file_path, output_file)["text"]


def main():
    audio_file = input("Enter audio file: ")
    audio_file = audio_file.strip().strip("'\"")
    if not check_audio_file(audio_file):
        return

    print("Loading")
    model = WhisperModel("base", device="cpu", compute_type="int8")

    text = transcribe_audio(model, audio_file)

if __name__ == "__main__":
    main()