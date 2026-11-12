// Placeholder: the real Replay screen (video + issue timeline) is coming in a separate commit.
export default function Replay({ go }) {
  return (
    <div className="wrap stack">
      <h1 className="display hero">Replay <span className="marker">coming soon.</span></h1>
      <p>The video timeline is being built separately.</p>
      <div className="row">
        <button type="button" className="btn btn-lime" onClick={() => go("report")}>Back to the report</button>
      </div>
    </div>
  );
}