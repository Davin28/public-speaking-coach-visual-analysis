import { useEffect, useMemo, useState } from "react";
import { getTranscript } from "../api.js";

// Words/phrases we flag as filler. Add more here.
const FILLERS = ["um", "umm", "uh", "uhh", "like", "you know", "basically", "kinda", "sort of", "i mean"];
const FILLER_RE = new RegExp(`\\b(${FILLERS.join("|")})\\b`, "gi");
// Common words that shouldn't count as "repeated phrases".
const STOPWORDS = new Set("gonna wanna gotta really then them when were been your the a an and or but to of in on for is it that this he she they we you i was are be with at as so his her its have has not just can all there what about from".split(" "));

// Find content words said 3+ times (simple repeated-phrase check, rule 8).
function findRepeats(text) {
  const counts = {};
  for (const w of text.toLowerCase().match(/[a-z']+/g) || []) {
    if (w.length > 3 && !w.includes("'") && !STOPWORDS.has(w) && !FILLERS.includes(w)) counts[w] = (counts[w] || 0) + 1;
  }
  return Object.entries(counts).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
}

// Split the transcript into plain text, filler marks and repeat underlines.
function highlight(text, repeatWords) {
  const repeatRe = repeatWords.length ? new RegExp(`\\b(${repeatWords.join("|")})\\b`, "gi") : null;
  const parts = [];
  text.split(FILLER_RE).forEach((chunk, i) => {
    if (i % 2 === 1) return parts.push(<mark key={`f${i}`} className="filler">{chunk}</mark>);
    if (!repeatRe) return parts.push(chunk);
    chunk.split(repeatRe).forEach((piece, j) =>
      parts.push(j % 2 === 1 ? <span key={`r${i}-${j}`} className="repeat">{piece}</span> : piece),
    );
  });
  return parts;
}

export default function Report({ analysis, go }) {
  const [text, setText] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getTranscript()
      .then(setText)
      .catch(() => setError("Couldn't reach the backend. Is server.py running in the backend folder?"));
  }, []);

  const stats = useMemo(() => {
    if (!text) return null;
    const words = (text.match(/[A-Za-z']+/g) || []).length;
    const fillers = (text.match(FILLER_RE) || []).length;
    const repeats = findRepeats(text);
    return { words, fillers, repeats };
  }, [text]);

  const { overall, categories, paceSeries, goals } = analysis;
  // Chart shows 100–200 wpm top to bottom.
  const y = (wpm) => 150 - ((wpm - 100) / 100) * 140;
  const points = paceSeries.map((w, i) => `${(i / (paceSeries.length - 1)) * 480},${y(w)}`).join(" ");
  const band = { top: y(160), bottom: y(130) };

  return (
    <div className="wrap stack-lg">
      <section className="report-head" aria-label="Grades">
        <div className="grade-sticker">
          <div className="display">{overall.grade}</div>
          <small>overall</small>
        </div>
        <div className="stack">
          <span className="mono tag-ink">SPEECH REPORT · TRANSCRIPT IS LIVE FROM THE BACKEND</span>
          <h1 className="display report-title">Your speech, <span className="marker">graded</span></h1>
          <div className="row">
            {categories.map((c, i) => (
              <span key={c.id} className={`grade-pill gp-${i}`}><b className="display">{c.grade}</b>{c.name}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="report-stats">
        <figure className="pace-chart">
          <figcaption className="card-head"><span className="display">Pace over time</span><span className="small">band = 130–160 wpm · sample</span></figcaption>
          <svg viewBox="0 0 480 160" width="100%" role="img" aria-label="Pace over the speech compared to the target band">
            <rect x="0" y={band.top} width="480" height={band.bottom - band.top} rx="8" fill="#D4FF3F" opacity="0.22" />
            <polyline points={points} fill="none" stroke="#D4FF3F" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </figure>
        <div className="mini-grid">
          <div className="card card-coral"><div className="card-label">Words</div><div className="display mid-num">{stats ? stats.words : "…"}</div></div>
          <div className="card card-violet"><div className="card-label">Fillers found</div><div className="display mid-num">{stats ? stats.fillers : "…"}</div></div>
          <div className="card card-outline"><div className="card-label">Most repeated</div><div className="display mid-num small-num">{stats?.repeats[0] ? `${stats.repeats[0][0]} ×${stats.repeats[0][1]}` : "—"}</div></div>
          <div className="card card-lime"><div className="card-label">Repeat words</div><div className="display mid-num">{stats ? stats.repeats.length : "…"}</div></div>
        </div>
      </section>

      <div className="report-body">
        <section className="stack" aria-label="Annotated transcript">
          <h2 className="display h2">The receipts</h2>
          <div className="legend">
            <span><mark className="filler">um</mark> filler</span>
            <span><span className="repeat">word</span> said 3+ times</span>
          </div>
          <div className="transcript">
            {error && <p className="error">{error}</p>}
            {!error && !text && <p>Loading transcript…</p>}
            {text && <p>{highlight(text, stats.repeats.map(([w]) => w))}</p>}
          </div>
          {stats?.fillers === 0 && (
            <p className="small">Zero fillers? Whisper often deletes “um” and “uh” from transcripts, so this may be too nice. The backend needs to keep them.</p>
          )}
        </section>

        <aside className="goals" aria-label="Goals">
          <h2 className="display h3">Next time, try</h2>
          {goals.map((g) => (
            <label key={g} className="goal"><input type="checkbox" />{g}</label>
          ))}
          <button type="button" className="btn btn-lime" onClick={() => go("replay")}>See these moments on replay</button>
        </aside>
      </div>
    </div>
  );
}