import { useEffect, useRef, useState } from "react";

const BAR_COUNT = 24;
const TICK_MS = 120;
// Mic level (8–100) below this counts as silence. Raise it if a noisy room never registers pauses.
const SILENCE_LEVEL = 14;
const FILLERS = ["um", "umm", "uh", "uhh", "like", "you know", "basically", "kinda", "sort of", "i mean"];
const FILLER_RE = new RegExp(`\\b(${FILLERS.join("|")})\\b`, "gi");
// Pace bar shows 80–220 wpm left to right.
const paceToPct = (wpm) => Math.min(100, Math.max(0, ((wpm - 80) / 140) * 100));

// Chrome and Edge have built-in live speech-to-text. Firefox/Safari don't, so pace/fillers wait for the backend there.
const SpeechRecognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

// Practice screen: real webcam + recording, and live signals measured while you talk.
export default function Record({ onDone }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const recordingRef = useRef(false);
  // Pause tracking lives in a ref so the mic loop can update it without re-subscribing.
  const pauseRef = useRef({ spoke: false, silentMs: 0, longestMs: 0 });
  // Mic levels while you're actually talking, for the Volume check on Results.
  const volumeRef = useRef([]);

  const [camError, setCamError] = useState("");
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [bars, setBars] = useState(() => Array(BAR_COUNT).fill(8));
  const [nudgesOn, setNudgesOn] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [pause, setPause] = useState({ silentMs: 0, longestMs: 0 });

  // Camera + mic on, and a mic loop that drives the volume meter and pause detection.
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

          if (recordingRef.current) {
            const p = pauseRef.current;
            if (level >= SILENCE_LEVEL) {
              p.spoke = true;
              p.silentMs = 0;
              volumeRef.current.push(level);
            } else if (p.spoke) {
              // Only count silence after you've started talking.
              p.silentMs += TICK_MS;
              p.longestMs = Math.max(p.longestMs, p.silentMs);
            }
            setPause({ silentMs: p.silentMs, longestMs: p.longestMs });
          }
        }, TICK_MS);
      })
      .catch(() => setCamError("Camera or mic is blocked. Allow access in your browser, or upload a video below."));

    return () => {
      cancelled = true;
      recordingRef.current = false;
      clearInterval(meterTimer);
      audioCtx?.close();
      recognitionRef.current?.abort();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Recording timer.
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  function startSpeechRecognition() {
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      setLiveText(finalText + interim);
    };
    // Chrome stops listening after a quiet stretch; restart it while we're still recording.
    rec.onend = () => {
      if (recordingRef.current) {
        try { rec.start(); } catch { /* already restarting */ }
      }
    };
    rec.onerror = () => {};
    try { rec.start(); } catch { /* ignore double start */ }
    recognitionRef.current = rec;
  }

  function start() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    pauseRef.current = { spoke: false, silentMs: 0, longestMs: 0 };
    volumeRef.current = [];
    setPause({ silentMs: 0, longestMs: 0 });
    setLiveText("");
    setSecs(0);

    const rec = new MediaRecorder(streamRef.current);
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
      uploadToBackend(blob, "recording.webm", volumeStats(volumeRef.current));
    };
    rec.start();
    recorderRef.current = rec;
    recordingRef.current = true;
    setRecording(true);
    startSpeechRecognition();
  }

  function stop() {
    recordingRef.current = false;
    recognitionRef.current?.stop();
    recorderRef.current?.stop();
    setRecording(false);
  }

  // avg = how loud you were while talking; spread = how much it jumped around (0 = perfectly even).
  function volumeStats(levels) {
    if (!levels.length) return null;
    const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
    const sd = Math.sqrt(levels.reduce((a, b) => a + (b - avg) ** 2, 0) / levels.length);
    return { avg, spread: sd / avg, samples: levels.length };
  }

  async function uploadToBackend(file, filename, volume = null) {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file, filename);

    try {
      const response = await fetch("http://127.0.0.1:5000/upload", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(`Error: ${data.error || `backend returned ${response.status}`}`);
        return;
      }
      console.log("Transcript:", data.text);
      // Hand App the video (for Replay) and the timestamped transcript (for Replay's moments).
      onDone({ videoUrl: URL.createObjectURL(file), transcript: data, volume });
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Couldn't reach the backend. Is server.py running?");
    } finally {
      setIsUploading(false);
    }
  }

  function upload(e) {
    const file = e.target.files?.[0];
    if (file) uploadToBackend(file, file.name);
  }

  // ----- live numbers -----
  const fillerHits = (liveText.match(FILLER_RE) || []).map((f) => f.toLowerCase());
  const fillerCounts = fillerHits.reduce((acc, f) => ({ ...acc, [f]: (acc[f] || 0) + 1 }), {});
  const fillerSummary = Object.entries(fillerCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([w, n]) => `${w} ×${n}`).join(" · ");
  const wordCount = (liveText.match(/[A-Za-z']+/g) || []).length;
  const wpm = secs >= 5 && wordCount > 0 ? Math.round(wordCount / (secs / 60)) : null;
  const paceLabel = wpm == null ? null : wpm > 160 ? "slow down" : wpm < 130 ? "speed up" : "sweet spot";
  const longestPause = pause.longestMs / 1000;
  const hasLiveSpeech = Boolean(SpeechRecognition);
  const started = recording || secs > 0;

  // Only nudge about things that are actually happening right now.
  let nudge = null;
  if (recording) {
    if (pause.silentMs > 3000) nudge = "Long pause. Lost your place? Glance at your notes, then back to the lens.";
    else if (wpm && secs > 10 && wpm > 165) nudge = "You're speeding up. Breathe between sentences.";
    else if (fillerHits.length >= 2) nudge = `${fillerHits.length} fillers so far. A silent pause hits harder.`;
    else if (wpm && secs > 15 && wpm < 110) nudge = "Pick up the pace a little.";
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
            {recording && <span className="rec-pill">● REC {time}</span>}

            {!recording && !isUploading && !camError && (
              <div className="nudge">
                <span className="nudge-tag">TIP</span>
                <span>Look at the lens, not at yourself. Eye contact, posture and gestures get checked after you finish.</span>
              </div>
            )}
            {nudgesOn && nudge && (
              <div className="nudge" role="status">
                <span className="nudge-tag">NUDGE</span>
                <span>{nudge}</span>
              </div>
            )}
            {isUploading && (
              <div className="cam-overlay" role="status">
                <span className="spinner" aria-hidden="true" />
                Roasting you…
                <small>Transcribing your recording. Longer videos take longer.</small>
              </div>
            )}
          </div>

          <div className="controls">
            {recording ? (
              <button type="button" className="btn-big btn-coral" onClick={stop}>
                <span className="dot dot-square" /> Done, roast me
              </button>
            ) : (
              <button type="button" className="btn-big btn-lime" onClick={start} disabled={!!camError || isUploading}>
                <span className="dot" /> Start talking
              </button>
            )}
            <span className="mono muted">{time} / 05:00</span>
            <label className="upload-link">
              Upload a video instead
              <input type="file" accept="video/*,audio/*" onChange={upload} hidden disabled={isUploading} />
            </label>
          </div>
        </section>

        <aside aria-label="Live signals" className="signals">
          <div className="card card-coral span-2">
            <div className="card-head">
              <span>Pace</span>
              {paceLabel && <span className="chip chip-ink">{paceLabel}</span>}
            </div>
            <div className="display big-num">{wpm ?? "—"}<small> wpm</small></div>
            <div className="pace-track">
              <div className="pace-band" style={{ left: `${paceToPct(130)}%`, width: `${paceToPct(160) - paceToPct(130)}%` }} />
              {wpm && <div className="pace-needle" style={{ left: `${paceToPct(wpm)}%` }} />}
            </div>
            <div className="small">
              sweet spot: 130–160 · {!hasLiveSpeech ? "measured after you finish in this browser" : started ? "live" : "starts when you do"}
            </div>
          </div>

          <div className="card card-violet span-2">
            <div className="card-head"><span>Volume</span><span className="chip chip-white">live</span></div>
            <div className="meter" aria-hidden="true">
              {bars.map((h, i) => <div key={i} style={{ height: `${h}%` }} />)}
            </div>
          </div>

          <div className="card card-lime">
            <div className="card-label">Fillers</div>
            <div className="display big-num">{hasLiveSpeech && started ? fillerHits.length : "—"}</div>
            <div className="small">{fillerSummary || (hasLiveSpeech ? (started ? "none yet" : "starts when you do") : "after you finish")}</div>
          </div>
          <div className="card card-cream">
            <div className="card-label">Longest pause</div>
            <div className="display big-num">{started && longestPause >= 0.5 ? `${longestPause.toFixed(1)}s` : "—"}</div>
            <div className="small">{!started ? "starts when you do" : longestPause > 3 ? "a bit long" : "all good"}</div>
          </div>

          <label className="toggle span-2">
            <input type="checkbox" checked={nudgesOn} onChange={(e) => setNudgesOn(e.target.checked)} />
            Nudge me while I talk
          </label>
          {hasLiveSpeech && (
            <p className="small muted span-2 hint">Live counts are a preview and can miss some “um”s. The full analysis runs after you finish.</p>
          )}
        </aside>
      </div>
    </div>
  );
}