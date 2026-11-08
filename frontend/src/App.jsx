import { useEffect, useState } from "react";

export default function App() {
  const [transcript, setTranscript] = useState("Loading...");

  useEffect(() => {
    fetch("http://localhost:5000/transcript")
      .then((res) => res.json())
      .then((data) => setTranscript(data.text))
      .catch(() => setTranscript("Could not load transcript. Is server.py running?"));
  }, []);

  return (
    <div>
      <h1>Transcript</h1>
      <p>{transcript}</p>
    </div>
  );
}