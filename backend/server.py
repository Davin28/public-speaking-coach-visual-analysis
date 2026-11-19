from flask import Flask, request, jsonify
import os
from speech_app import transcribe_audio
from faster_whisper import WhisperModel

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
model = WhisperModel("base", device="cpu", compute_type="int8")

@app.route("/upload", methods=["POST"])
def upload_audio():
    if "file" not in request.files:
        return {"error": "No file part in the request"}, 400

    file = request.files["file"]
    if file.filename == "":
        return {"error": "No file selected for uploading"}, 400

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        transcript = transcribe_audio(model, file_path)
    except Exception as e:
        return {"error": str(e)}, 500

    return jsonify({"text": transcript}), 200, {"Access-Control-Allow-Origin": "*"}

@app.route("/transcript", methods=["GET"])
def get_transcript():
    transcript_file = os.path.join(UPLOAD_FOLDER, "transcript.txt")
    if not os.path.exists(transcript_file):
        return {"error": "Transcript not found. Ensure the file is saved correctly after processing."}, 404

    try:
        with open(transcript_file, "r", encoding="utf-8") as file:
            transcript = file.read()
        return jsonify({"text": transcript}), 200, {"Access-Control-Allow-Origin": "*"}
    except Exception as e:
        return {"error": f"Error reading transcript: {str(e)}"}, 500
app.run(port=5000)
##run frontend server in frontend folder with npm run dev
## run python speech_app.py in the backend folder, insert audio file 
## then run pythin server.py in backend folder