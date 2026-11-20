import { useMemo, useRef, useState } from "react";
import { GROUPS, RULE_LABELS, formatTime } from "../mockAnalysis.js";
import { buildIssues } from "../transcriptIssues.js";

const FILTERS = ["all", "voice", "body", "content"];

// Replay: your recording plus a timeline of real moments found in your transcript.
export default function Replay({ videoUrl, transcript, go }) {
  const videoRef = useRef(null);
  const [filter, setFilter] = useState("all");
  const [selId, setSelId] = useState(null);

  const { duration, issues } = useMemo(() => buildIssues(transcript), [transcript]);
  const shown = issues.filter((i) => filter === "all" || i.group === filter);
  const sel = shown.find((i) => i.id === selId) || shown[0];
  const idx = shown.indexOf(sel);
  const lanes = Object.keys(RULE_LABELS).filter((rule) => shown.some((i) => i.rule === rule));

  function pick(issue) {
    setSelId(issue.id);
    if (videoRef.current) {
      videoRef.current.currentTime = issue.t;
      videoRef.current.play().catch(() => {});
    }
  }

  // Nothing recorded yet.
  if (!videoUrl || !transcript) {
    return (
      <div className="wrap">
        <div className="player-empty replay-empty">
          <h1 className="display h2">Nothing to replay yet.</h1>
          <p>Record or upload something on Practice and your moments will show up here.</p>
          <button type="button" className="btn btn-lime" onClick={() => go("record")}>Go practice</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap stack-lg">
      <div className="replay-top">
        <div className="player">
          <video ref={videoRef} src={videoUrl} controls playsInline />
        </div>

        {sel ? (
          <aside className="moment" style={{ borderTopColor: GROUPS[sel.group].color }} aria-live="polite">
            <div className="mono small">AT {formatTime(sel.t)} · {RULE_LABELS[sel.rule].toUpperCase()}</div>
            <h2 className="display h3">{sel.label}</h2>
            <p>{sel.tip}</p>
            <div className="row">
              <button type="button" className="btn btn-outline" onClick={() => pick(shown[(idx - 1 + shown.length) % shown.length])}>Previous</button>
              <button type="button" className="btn btn-violet" onClick={() => pick(shown[(idx + 1) % shown.length])}>Next issue</button>
            </div>
          </aside>
        ) : (
          <aside className="moment" style={{ borderTopColor: "var(--lime)" }}>
            <div className="mono small">{issues.length ? `NOTHING IN ${GROUPS[filter].name.toUpperCase()}` : "CLEAN RUN"}</div>
            <h2 className="display h3">{issues.length ? "All clear here." : "Nothing caught. Respect."}</h2>
            <p>
              {issues.length
                ? `No ${filter === "voice" ? "filler, pause or pace" : filter === "body" ? "looking-away or leaning" : "repeated-word"} problems in this one. Switch to All to see the rest.`
                : "No fillers, long pauses, pace problems or repeated words in this one."}
            </p>
          </aside>
        )}
      </div>

      <section className="timeline" aria-label="Issue timeline">
        <div className="card-head wrap-row">
          <h2 className="display h3">{shown.length} {shown.length === 1 ? "moment" : "moments"}, caught</h2>
          <div className="row" role="group" aria-label="Filter">
            {FILTERS.map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} className={`filter ${filter === f ? "is-on" : ""}`} onClick={() => { setFilter(f); setSelId(null); }}>
                {f === "all" ? "All" : GROUPS[f].name}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 && (
          <div className="lanes-empty">
            <span className="display">✓</span>
            {issues.length ? `Nothing caught in ${GROUPS[filter].name}.` : "Nothing caught. Clean run."}
          </div>
        )}
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
                      style={{ left: `${duration ? (i.t / duration) * 100 : 0}%`, "--c": color }}
                      aria-label={`${RULE_LABELS[rule]} at ${formatTime(i.t)}: ${i.label}`}
                      onClick={() => pick(i)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {sel && duration > 0 && <div className="playhead" style={{ "--p": sel.t / duration }} aria-hidden="true" />}
        </div>
        <div className="ticks mono"><span>0:00</span><span>{formatTime(duration / 2)}</span><span>{formatTime(duration)}</span></div>
        {!transcript.visual?.summary && (
          <p className="small">Body language isn't on this timeline: {transcript.visual?.error || "the visual analyzer didn't run."}</p>
        )}
      </section>
    </div>
  );
}