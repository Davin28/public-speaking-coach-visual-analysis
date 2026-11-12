// About page: the team and the class. Has its own violet theme (see .theme-about in index.css).
const TEAM = [
  { name: "Jesse Bloom", roles: ["Project manager", "Full stack"], color: "lime" },
  { name: "David Landivar", roles: ["Backend"], color: "ink" },
  { name: "Meaghan Knowles", roles: ["Frontend"], color: "coral" },
  { name: "NJ Lacambra", roles: ["Frontend"], color: "cream" },
  { name: "Justin Ming", roles: ["Backend"], color: "ink" },
];

const ANALYZERS = [
  { title: "Voice", detail: "Pace, filler words, volume and pauses", color: "var(--lime)" },
  { title: "Body language", detail: "Eye contact, posture and hand gestures", color: "var(--coral)" },
  { title: "Content", detail: "Repeated phrases and topic transitions", color: "var(--cream)" },
];

const STACK = ["React", "Vite", "Flask", "faster-whisper", "MediaPipe", "OpenCV"];
const TICKER = ["um", "uh", "like,", "basically", "you know?", "so yeah", "kinda", "literally"];

function initials(name) {
  return name.split(" ").map((p) => p[0]).join("");
}

export default function About() {
  // The ticker list is doubled so the scroll loops seamlessly.
  const tickerWords = [...TICKER, ...TICKER];

  return (
    <div className="about">
      <div className="wrap stack-lg">
        <section className="about-hero">
          <span className="float-sticker fs-1" aria-hidden="true">like,</span>
          <span className="float-sticker fs-2" aria-hidden="true">uhh</span>
          <span className="float-sticker fs-3" aria-hidden="true">basically</span>

          <div className="stack about-intro">
            <span className="mono tag-lime">ABOUT THE PROJECT</span>
            <h1 className="display about-title">
              Five seniors.<br /><span className="marker">Zero ums.</span>
            </h1>
            <p className="about-lede">
              You're not as good at public speaking as you think. Say Less records you, checks your voice,
              body language and speech against 10 rules, and tells you exactly what to fix.
            </p>
          </div>

          <aside className="ticket" aria-label="Class details">
            <div className="ticket-top">
              <div className="mono small">ADMIT FIVE · BUILT FOR</div>
              <div className="display ticket-code">CIS4930</div>
              <div className="ticket-name">Multimedia Expert Systems</div>
            </div>
            <dl className="ticket-stub">
              <div><dt>School</dt><dd>University of Florida</dd></div>
              <div><dt>Term</dt><dd>Fall 2026</dd></div>
            </dl>
          </aside>
        </section>
      </div>

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track display">
          {tickerWords.map((w, i) => (
            <span key={i}>{w}<b>✕</b></span>
          ))}
        </div>
      </div>

      <div className="wrap stack-lg">
        <section className="stack" aria-label="Team">
          <h2 className="display about-h2">The team</h2>
          <div className="team-grid">
            {TEAM.map((m, i) => (
              <article key={m.name} className={`bubble bubble-${m.color}`} style={{ "--tilt": `${i % 2 ? 2 : -2}deg` }}>
                <div className="avatar display" aria-hidden="true">{initials(m.name)}</div>
                <h3 className="display member-name">{m.name}</h3>
                <div className="row">
                  {m.roles.map((r) => <span key={r} className="role-chip">{r}</span>)}
                </div>
                <div className="member-year">Senior</div>
              </article>
            ))}
          </div>
        </section>

        <section className="stack" aria-label="How it works">
          <h2 className="display about-h2">What it checks</h2>
          <div className="analyzer-grid">
            {ANALYZERS.map((a, i) => (
              <div key={a.title} className="analyzer" style={{ "--accent": a.color }}>
                <span className="display analyzer-num">0{i + 1}</span>
                <h3 className="display h3">{a.title}</h3>
                <p>{a.detail}</p>
              </div>
            ))}
          </div>
          <p className="about-note">Everything rolls up into one overall score with your top 3 fixes.</p>
        </section>

        <section className="stack" aria-label="Built with">
          <h2 className="display h3">Built with</h2>
          <div className="row">
            {STACK.map((s) => <span key={s} className="stack-chip mono">{s}</span>)}
          </div>
        </section>
      </div>
    </div>
  );
}