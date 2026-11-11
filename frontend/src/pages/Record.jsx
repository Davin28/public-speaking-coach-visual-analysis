// Placeholder: the real Practice screen (webcam + recording) is coming in a separate commit.
export default function Record({ onDone }) {
  return (
    <div className="wrap stack">
      <h1 className="display hero">Practice screen <span className="marker">coming soon.</span></h1>
      <p className="muted">Recording is being built separately. Skip ahead to see the other pages.</p>
      <div className="row">
        <button type="button" className="btn btn-lime" onClick={() => onDone(null)}>Skip to results</button>
      </div>
    </div>
  );
}