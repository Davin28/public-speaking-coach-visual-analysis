import { GROUPS } from "../mockAnalysis.js";

const FIX_COLORS = ["fix-coral", "fix-violet", "fix-cream"];

// Results: score, top fixes and every check, built from your real recording (see buildResults.js).
export default function Results({ results, go }) {
  if (!results) {
    return (
      <div className="wrap">
        <div className="player-empty replay-empty">
          <h1 className="display h2">No results yet.</h1>
          <p>Record or upload something on Practice and your score shows up here.</p>
          <button type="button" className="btn btn-lime" onClick={() => go("record")}>Go practice</button>
        </div>
      </div>
    );
  }

  const { overall, topFixes, checks, date, length } = results;
  const delta = overall.delta;

  return (
    <div className="wrap stack-lg">
      <div className="results-top">
        <section className="score-card" aria-label="Overall score">
          <div className="mono small">{date} · {length}</div>
          <div className="display score">{overall.score}</div>
          <div>
            <div className="display verdict">{overall.verdict}</div>
            {delta != null && (
              <span className="chip chip-ink">
                {delta > 0 ? `+${delta} since last time` : delta < 0 ? `${delta} since last time` : "Same as last time"}
              </span>
            )}
          </div>
          <span className="ghost-um" aria-hidden="true">um</span>
        </section>

        <section className="stack" aria-label="Top fixes">
          <h2 className="display h2">{topFixes.length ? "Fix these first" : "Nothing major to fix"}</h2>
          {topFixes.length === 0 && (
            <div className="fix fix-cream">
              <span className="display fix-num">✓</span>
              <div>
                <div className="fix-title">Clean run</div>
                <div className="fix-detail">Try a longer take to really stress-test it.</div>
              </div>
            </div>
          )}
          {topFixes.map((f, i) => (
            <div key={f.title} className={`fix ${FIX_COLORS[i]}`}>
              <span className="display fix-num">{i + 1}</span>
              <div>
                <div className="fix-title">{f.title}</div>
                <div className="fix-detail">{f.detail}</div>
              </div>
            </div>
          ))}
          <div className="row">
            <button type="button" className="btn btn-lime" onClick={() => go("report")}>See the receipts</button>
            <button type="button" className="btn btn-outline" onClick={() => go("replay")}>Watch replay</button>
          </div>
        </section>
      </div>

      {Object.entries(GROUPS).map(([id, g]) => (
        <section key={id} className="stack">
          <h2 className="display h3"><span className="swatch" style={{ background: g.color }} />{g.name}</h2>
          <div className="check-grid">
            {checks.filter((c) => c.group === id).map((c) => (
              <article key={c.rule} className={`check ${c.pending ? "is-pending" : ""}`} style={{ borderTopColor: g.color }}>
                <div className="card-head">
                  <h3>{c.title}</h3>
                  <span className={`chip ${c.pending ? "chip-muted" : c.ok ? "chip-lime" : "chip-coral"}`}>
                    {c.pending ? "coming soon" : c.ok ? "slaying" : "needs work"}
                  </span>
                </div>
                <div className="display check-metric">{c.metric}</div>
                <p>{c.tip}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}