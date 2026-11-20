import { useMemo } from "react";
import { buildIssues } from "../transcriptIssues.js";

// Report: grades, pace chart and your transcript with the fillers and repeats marked,
// all from your real recording (results come from buildResults.js, moments from transcriptIssues.js).
export default function Report({ results, transcript, go }) {
  const { issues } = useMemo(() => buildIssues(transcript), [transcript]);

  if (!results || !transcript) {
    return (
      <div className="wrap">
        <div className="player-empty replay-empty">
          <h1 className="display h2">No report yet.</h1>
          <p>Record or upload something on Practice and your graded transcript shows up here.</p>
          <button type="button" className="btn btn-lime" onClick={() => go("record")}>Go practice</button>
        </div>
      </div>
    );
  }

  const words = transcript.words || [];
  // Which word positions to mark: fillers (from their timestamps) and words said 3+ times.
  const fillerStarts = new Set(issues.filter((i) => i.rule === "fillers").map((i) => i.t));
  const repeatWords = new Set(
    issues.filter((i) => i.rule === "repeats").map((i) => i.label.split("×")[0].replace(/[“”\s]/g, "")),
  );
  const clean = (w) => w.toLowerCase().replace(/[^a-z']/g, "");
  const fillerCount = issues.filter((i) => i.rule === "fillers").length;
  const topRepeat = issues.filter((i) => i.rule === "repeats")
    .map((i) => ({ label: i.label, n: parseInt(i.label.split("×")[1], 10) }))
    .sort((a, b) => b.n - a.n)[0];

  // A filler can be two words ("you know"), so mark the word after a two-word filler too.
  const marked = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (fillerStarts.has(w.start)) {
      const pair = i + 1 < words.length ? `${clean(w.word)} ${clean(words[i + 1].word)}` : "";
      const twoWord = ["you know", "i mean", "sort of", "kind of"].includes(pair);
      marked.push(<mark key={i} className="filler">{twoWord ? `${w.word.trim()} ${words[i + 1].word.trim()}` : w.word.trim()}</mark>, " ");
      if (twoWord) i++;
    } else if (repeatWords.has(clean(w.word))) {
      marked.push(<span key={i} className="repeat">{w.word.trim()}</span>, " ");
    } else {
      marked.push(w.word.trim() + " ");
    }
  }

  const { overall, categories, paceSeries, goals, date, length, wpm } = results;
  // Chart shows 60–220 wpm top to bottom.
  const y = (v) => 150 - ((Math.min(220, Math.max(60, v)) - 60) / 160) * 140;
  const points = paceSeries.length > 1
    ? paceSeries.map((v, i) => `${(i / (paceSeries.length - 1)) * 480},${y(v)}`).join(" ")
    : `0,${y(paceSeries[0] || wpm)} 480,${y(paceSeries[0] || wpm)}`;
  const band = { top: y(160), bottom: y(130) };

  return (
    <div className="wrap stack-lg">
      <section className="report-head" aria-label="Grades">
        <div className="grade-sticker">
          <div className="display">{overall.grade}</div>
          <small>overall</small>
        </div>
        <div className="stack">
          <span className="mono tag-ink">SPEECH REPORT · {date} · {length}</span>
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
          <figcaption className="card-head"><span className="display">Pace over time</span><span className="small">band = 130–160 wpm · avg {wpm}</span></figcaption>
          <svg viewBox="0 0 480 160" width="100%" role="img" aria-label={`Pace over the speech, averaging ${wpm} words per minute, compared to the 130 to 160 target band`}>
            <rect x="0" y={band.top} width="480" height={band.bottom - band.top} rx="8" fill="#D4FF3F" opacity="0.22" />
            <polyline points={points} fill="none" stroke="#D4FF3F" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </figure>
        <div className="mini-grid">
          <div className="card card-coral"><div className="card-label">Words</div><div className="display mid-num">{words.length}</div></div>
          <div className="card card-violet"><div className="card-label">Fillers found</div><div className="display mid-num">{fillerCount}</div></div>
          <div className="card card-outline"><div className="card-label">Most repeated</div><div className="display mid-num small-num">{topRepeat ? topRepeat.label : "—"}</div></div>
          <div className="card card-lime"><div className="card-label">Long pauses</div><div className="display mid-num">{issues.filter((i) => i.rule === "pauses").length}</div></div>
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
            <p>{words.length ? marked : transcript.text || "No speech detected."}</p>
          </div>
          {fillerCount === 0 && words.length > 0 && (
            <p className="small">No fillers caught. Either you're that good, or Whisper cleaned some up. It sometimes hears “um” as a real word.</p>
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