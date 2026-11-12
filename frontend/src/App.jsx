import { useEffect, useState } from "react";
import Logo from "./components/Logo.jsx";
import Record from "./pages/Record.jsx";
import Results from "./pages/Results.jsx";
import Report from "./pages/Report.jsx";
import Replay from "./pages/Replay.jsx";
import About from "./pages/About.jsx";
import { mockAnalysis } from "./mockAnalysis.js";

const PAGES = [
  { id: "record", label: "Practice", icon: "M9 2h6v12H9zM5 10a7 7 0 0 0 14 0M12 17v5" },
  { id: "results", label: "Results", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { id: "report", label: "Report", icon: "M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h6" },
  { id: "replay", label: "Replay", icon: "M5 4l14 8-14 8z" },
  { id: "about", label: "About", icon: "M16 21v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M2 21v-2a4 4 0 0 1 3-3.9" },
];

const LIGHT_PAGES = ["report", "replay"];

export default function App() {
  // The page lives in the URL hash (#record, #results, #report, #replay, #about) so links and refreshes work.
  const [page, setPage] = useState(() => {
    const id = window.location.hash.slice(1);
    return PAGES.some((p) => p.id === id) ? id : "record";
  });
  useEffect(() => {
    window.location.hash = page;
    window.scrollTo(0, 0);
  }, [page]);
  const [videoUrl, setVideoUrl] = useState(null);
  // Swap this for the real /analyze response once the backend has it.
  const analysis = mockAnalysis;

  const light = LIGHT_PAGES.includes(page);

  function handleRecordingDone(url) {
    setVideoUrl(url);
    setPage("results");
  }

  return (
    <div className={`app ${light ? "theme-light" : ""} ${page === "about" ? "theme-about" : ""}`}>
      <header className="topbar">
        <button type="button" className="logo-btn" onClick={() => setPage("record")} aria-label="say less home">
          <Logo light={light} />
        </button>
        <nav className="tabs" aria-label="Main">
          {PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`tab ${page === p.id ? "is-active" : ""}`}
              aria-current={page === p.id ? "page" : undefined}
              onClick={() => setPage(p.id)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={p.icon} />
              </svg>
              <span>{p.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="page">
        {page === "record" && <Record onDone={handleRecordingDone} />}
        {page === "results" && <Results analysis={analysis} go={setPage} />}
        {page === "report" && <Report analysis={analysis} go={setPage} />}
        {page === "replay" && <Replay analysis={analysis} videoUrl={videoUrl} go={setPage} />}
        {page === "about" && <About />}
      </main>
    </div>
  );
}