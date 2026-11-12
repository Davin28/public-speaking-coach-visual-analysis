import { useEffect, useRef, useState } from "react";

const BAR_COUNT = 24;

// Practice screen: real webcam preview, real recording (MediaRecorder),
// a real mic volume meter, and placeholder numbers for pace/fillers.
export default function Record({ onDone }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [camError, setCamError] = useState("");
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [bars, setBars] = useState(() => Array(BAR_COUNT).fill(8));
  const [nudges, setNudges] = useState(true);

  // Turn on camera + mic, and hook the mic up to a volume meter.
  useEffect(() => {
    let audioCtx;
    let meterTimer;
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("This browser can't use the camera here. Upload a video below instead.");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        audioCtx = new AudioContext();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        audioCtx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        meterTimer = setInterval(() => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (const v of data) sum += ((v - 128) / 128) ** 2;
          const level = Math.min(100, Math.max(8, Math.sqrt(sum / data.length) * 400));
          setBars((prev) => [...prev.slice(1), level]);
        }, 120);
      })
      .catch(() => setCamError("Camera or mic is blocked. Allow access in your browser, or upload a video below."));

    return () => {
      cancelled = true;
      clearInterval(meterTimer);
      audioCtx?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Recording timer.
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  function start() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const rec = new MediaRecorder(streamRef.current);
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
      onDone(URL.createObjectURL(blob));
    };
    rec.start();
    recorderRef.current = rec;
    setSecs(0);
    setRecording(true);
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function upload(e) {
    const file = e.target.files?.[0];
    if (file) onDone(URL.createObjectURL(file));
  }

  const time = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div className="wrap">
      <h1 className="display hero">
        Hit record. We'll catch <span className="marker">the ums.</span>
      </h1>

      <div className="record-grid">
        <section aria-label="Camera" className="stack">
          <div className={`cam ${recording ? "is-recording" : ""}`}>
            {camError ? (
              <p className="cam-error">{camError}</p>
            ) : (
              <video ref={videoRef} autoPlay muted playsInline className="cam-video" />
            )}
            <span className="sticker sticker-violet" style={{ top: 16, left: 16, rotate: "-3deg" }}>eye contact: locked in</span>
            <span className="sticker sticker-coral" style={{ top: 58, left: 28, rotate: "2deg" }}>posture: kinda leaning</span>
            {recording && <span className="rec-pill">● REC {time}</span>}
            {nudges && (
              <div className="nudge">
                <span className="nudge-tag">NUDGE</span>
                <span>That's 3 “like”s in a minute. A pause hits harder.</span>
              </div>
            )}
          </div>

          <div className="controls">
            {recording ? (
              <button type="button" className="btn-big btn-coral" onClick={stop}>
                <span className="dot dot-square" /> Done, roast me
              </button>
            ) : (
              <button type="button" className="btn-big btn-lime" onClick={start} disabled={!!camError}>
                <span className="dot" /> Start talking
              </button>
            )}
            <span className="mono muted">{time} / 05:00</span>
            <label className="upload-link">
              Upload a video instead
              <input type="file" accept="video/*,audio/*" onChange={upload} hidden />
            </label>
          </div>
        </section>

        <aside aria-label="Live signals" className="signals">
          <div className="card card-coral span-2">
            <div className="card-head"><span>Pace</span><span className="chip chip-ink">slow down</span></div>
            <div className="display big-num">172<small> wpm</small></div>
            <div className="pace-track"><div className="pace-band" /><div className="pace-needle" style={{ left: "74%" }} /></div>
            <div className="small">sweet spot: 130–160 · sample number</div>
          </div>

          <div className="card card-violet span-2">
            <div className="card-head"><span>Volume</span><span className="chip chip-white">live</span></div>
            <div className="meter" aria-hidden="true">
              {bars.map((h, i) => <div key={i} style={{ height: `${h}%` }} />)}
            </div>
          </div>

          <div className="card card-lime">
            <div className="card-label">Fillers</div>
            <div className="display big-num">7</div>
            <div className="small">um ×4 · like ×3</div>
          </div>
          <div className="card card-cream">
            <div className="card-label">Longest pause</div>
            <div className="display big-num">2.4s</div>
            <div className="small">chef's kiss</div>
          </div>

          <label className="toggle span-2">
            <input type="checkbox" checked={nudges} onChange={(e) => setNudges(e.target.checked)} />
            Nudge me while I talk
          </label>
        </aside>
      </div>
    </div>
  );
}