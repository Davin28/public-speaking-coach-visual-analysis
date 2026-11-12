import { GROUPS } from "../mockAnalysis.js";

const FIX_COLORS = ["fix-coral", "fix-violet", "fix-cream"];

export default function Results({ analysis, go }) {
  const { overall, topFixes, checks } = analysis;

  return (
    <div className="wrap stack-lg">
      <div className="results-top">
        <section className="score-card" aria-label="Overall score">
          <div className="mono small">NOV 5 · 4:12 · SAMPLE DATA</div>
          <div className="display score">{overall.score}</div>
          <div>
            <div className="display verdict">{overall.verdict}</div>
            <span className="chip chip-ink">+{overall.delta} since last time</span>
          </div>
          <span className="ghost-um" aria-hidden="true">um</span>
        </section>

        <section className="stack" aria-label="Top fixes">
          <h2 className="display h2">Fix these first</h2>
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
              <article key={c.rule} className="check" style={{ borderTopColor: g.color }}>
                <div className="card-head">
                  <h3>{c.title}</h3>
                  <span className={`chip ${c.ok ? "chip-lime" : "chip-coral"}`}>{c.ok ? "slaying" : "needs work"}</span>
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