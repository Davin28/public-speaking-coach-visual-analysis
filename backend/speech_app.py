import os
from faster_whisper import WhisperModel


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


def transcribe_audio(model, file_path, output_file="transcript.txt"):
    print("converting audio")
    segments, info = model.transcribe(file_path)

    print("language:", info.language)

    full_text = ""
    for segment in segments:
        print(f"[{segment.start:.1f}s - {segment.end:.1f}s] {segment.text}")
        full_text = full_text + segment.text + " "

    full_text = full_text.strip()

    with open(output_file, "w", encoding="utf-8") as file:
        file.write(full_text)
    print("Saved transcript to", output_file)

    return full_text


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