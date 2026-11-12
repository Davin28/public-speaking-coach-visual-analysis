import { useMemo, useRef, useState } from "react";
import { GROUPS, RULE_LABELS, formatTime } from "../mockAnalysis.js";

const FILTERS = ["all", "voice", "body", "content"];

export default function Replay({ analysis, videoUrl, go }) {
  const videoRef = useRef(null);
  const [filter, setFilter] = useState("all");
  const [selId, setSelId] = useState(null);
  const duration = analysis.durationSec;

  const shown = useMemo(
    () => analysis.issues.filter((i) => filter === "all" || i.group === filter).sort((a, b) => a.t - b.t),
    [analysis.issues, filter],
  );
  const sel = shown.find((i) => i.id === selId) || shown[0];
  const idx = shown.indexOf(sel);
  const lanes = Object.keys(RULE_LABELS).filter((rule) => shown.some((i) => i.rule === rule));

  function pick(issue) {
    setSelId(issue.id);
    if (videoRef.current) videoRef.current.currentTime = issue.t;
  }

  return (
    <div className="wrap stack-lg">
      <div className="replay-top">
        <div className="player">
          {videoUrl ? (
            <video ref={videoRef} src={videoUrl} controls playsInline />
          ) : (
            <div className="player-empty">
              <p>No recording yet.</p>
              <button type="button" className="btn btn-lime" onClick={() => go("record")}>Record one</button>
            </div>
          )}
        </div>

        {sel && (
          <aside className="moment" style={{ borderTopColor: GROUPS[sel.group].color }} aria-live="polite">
            <div className="mono small">AT {formatTime(sel.t)} · {RULE_LABELS[sel.rule].toUpperCase()}</div>
            <h2 className="display h3">{sel.label}</h2>
            <p>{sel.tip}</p>
            <div className="row">
              <button type="button" className="btn btn-outline" onClick={() => pick(shown[(idx - 1 + shown.length) % shown.length])}>Previous</button>
              <button type="button" className="btn btn-violet" onClick={() => pick(shown[(idx + 1) % shown.length])}>Next issue</button>
            </div>
          </aside>
        )}
      </div>

      <section className="timeline" aria-label="Issue timeline">
        <div className="card-head wrap-row">
          <h2 className="display h3">{shown.length} moments, caught</h2>
          <div className="row" role="group" aria-label="Filter">
            {FILTERS.map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} className={`filter ${filter === f ? "is-on" : ""}`} onClick={() => { setFilter(f); setSelId(null); }}>
                {f === "all" ? "All" : GROUPS[f].name}
              </button>
            ))}
          </div>
        </div>

        <div className="lanes">
          {lanes.map((rule) => {
            const items = shown.filter((i) => i.rule === rule);
            const color = GROUPS[items[0].group].color;
            return (
              <div key={rule} className="lane">
                <div className="lane-name"><span className="swatch" style={{ background: color }} />{RULE_LABELS[rule]}</div>
                <div className="lane-track">
                  {items.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      className={`mark ${sel?.id === i.id ? "is-sel" : ""}`}
                      style={{ left: `${(i.t / duration) * 100}%`, "--c": color }}
                      aria-label={`${RULE_LABELS[rule]} at ${formatTime(i.t)}: ${i.label}`}
                      onClick={() => pick(i)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {sel && <div className="playhead" style={{ "--p": sel.t / duration }} aria-hidden="true" />}
        </div>
        <div className="ticks mono"><span>0:00</span><span>{formatTime(duration / 2)}</span><span>{formatTime(duration)}</span></div>
        <p className="small">Markers are sample data until the backend sends timestamps.</p>
      </section>
    </div>
  );
}