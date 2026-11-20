from flask import Flask, request, jsonify
import os
import traceback
from speech_app import transcribe_with_words
from faster_whisper import WhisperModel

# The visual analyzer needs mediapipe (Python 3.12 venv). If it isn't installed,
# the app still works and body language just shows "coming soon".
try:
    from visual_timeline import analyze_recording
    VISUAL_ERROR = None
except Exception as e:  # mediapipe/opencv missing or wrong version
    analyze_recording = None
    VISUAL_ERROR = f"Visual analyzer unavailable: {e}"
    print(VISUAL_ERROR)

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
model = WhisperModel("small", device="cpu", compute_type="int8")

VIDEO_TYPES = {".webm", ".mp4", ".mov", ".mkv", ".avi"}


# Let the browser read every response, including errors, so the real message reaches the frontend.
@app.after_request
def add_cors_header(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


@app.route("/upload", methods=["POST"])
def upload_audio():
    if "file" not in request.files:
        return {"error": "No file part in the request"}, 400

    file = request.files["file"]
    if file.filename == "":
        return {"error": "No file selected for uploading"}, 400

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)
    print("Saved upload to", file_path, "-", os.path.getsize(file_path), "bytes")

    try:
        result = transcribe_with_words(model, file_path)
    except Exception as e:
        traceback.print_exc()  # prints the full error in this terminal
        return {"error": str(e)}, 500

    # Body language (rules 5–7). A failure here never breaks the transcript.
    if os.path.splitext(file.filename)[1].lower() not in VIDEO_TYPES:
        result["visual"] = {"error": "Audio-only file, so no body language to check."}
    elif analyze_recording is None:
        result["visual"] = {"error": VISUAL_ERROR}
    else:
        try:
            print("analyzing body language")
            result["visual"] = analyze_recording(file_path)
            print("visual summary:", result["visual"]["summary"])
        except Exception as e:
            traceback.print_exc()
            result["visual"] = {"error": str(e)}

    # result = {"text", "words", "duration", "visual": {"summary", "moments", "duration"} or {"error"}}
    return jsonify(result), 200


@app.route("/transcript", methods=["GET"])
def get_transcript():
    transcript_file = os.path.join(UPLOAD_FOLDER, "transcript.txt")
    if not os.path.exists(transcript_file):
        return {"error": "Transcript not found. Ensure the file is saved correctly after processing."}, 404

    try:
        with open(transcript_file, "r", encoding="utf-8") as file:
            transcript = file.read()
        return jsonify({"text": transcript}), 200
    except Exception as e:
        return {"error": f"Error reading transcript: {str(e)}"}, 500


app.run(port=5000)

## Run order:
## 1. backend folder:  .venv\Scripts\activate   then   python server.py
## 2. frontend folder: npm run dev