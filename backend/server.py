from flask import Flask

app = Flask(__name__)

@app.route("/transcript")
def get_transcript():
    with open("transcript.txt", encoding="utf-8") as f:
        text = f.read()
    return {"text": text}, 200, {"Access-Control-Allow-Origin": "*"}

app.run(port=5000)

##run frontend server in frontend folder with npm run dev
## run python speech_app.py in the backend folder, insert audio file 
## then run pythin server.py in backend folder