"""Runs Davin's VisualAnalyzer on a recording and adds timestamps, so the app can show
*when* you looked away or leaned, not just overall percentages.

Returns:
{
  "summary": { ...VisualAnalyzer.get_results()... },
  "moments": [ {"rule": "eye" | "posture", "t": start_sec, "end": end_sec, "label": "..."} ],
  "duration": seconds
}
"""
import os
import sys

# visual_analyzer.py lives one folder up (repo root), next to backend/.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import cv2  # noqa: E402
from visual_analyzer import VisualAnalyzer  # noqa: E402

LOOK_AWAY_MIN_SEC = 2.0  # flag looking away/out of frame if it lasts this long
LEAN_MIN_SEC = 3.0       # flag uneven shoulders if it lasts this long


def find_stretches(samples, is_bad, min_sec):
    """samples: list of (t, indicators). Returns [(start, end)] where is_bad(indicators)
    stayed True for at least min_sec. Samples where is_bad returns None are skipped."""
    stretches = []
    start = None
    last_t = None
    for t, ind in samples:
        bad = is_bad(ind)
        if bad is None:
            continue
        if bad and start is None:
            start = t
        elif not bad and start is not None:
            if t - start >= min_sec:
                stretches.append((start, t))
            start = None
        last_t = t
    if start is not None and last_t is not None and last_t - start >= min_sec:
        stretches.append((start, last_t))
    return stretches


def analyze_recording(file_path, sample_every=6):
    capture = cv2.VideoCapture(file_path)
    if not capture.isOpened():
        raise RuntimeError(f"OpenCV could not open {file_path}")

    samples = []
    frame_number = 0
    with VisualAnalyzer(sample_every=sample_every) as analyzer:
        try:
            while True:
                ok, frame = capture.read()
                if not ok:
                    break
                frame_number += 1
                if frame_number % sample_every:
                    continue
                # Browser .webm files often report a bogus frame rate, so use the
                # frame's own timestamp instead of frame_number / fps.
                t = capture.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
                samples.append((t, analyzer.analyze_frame(frame)))
        finally:
            capture.release()
        summary = analyzer.get_results()

    if not samples:
        raise RuntimeError("No video frames could be read (audio-only file?)")

    # Looking away = face found but turned, or no face at all (out of frame / looking down).
    def looking_away(ind):
        if not ind["face_detected"]:
            return True
        facing = ind["camera_facing_estimate"]
        return None if facing is None else not facing

    def leaning(ind):
        level = ind["shoulders_level_estimate"]
        return None if level is None else not level

    moments = []
    for start, end in find_stretches(samples, looking_away, LOOK_AWAY_MIN_SEC):
        moments.append({"rule": "eye", "t": round(start, 2), "end": round(end, 2),
                        "label": f"Looked away for {end - start:.0f}s"})
    for start, end in find_stretches(samples, leaning, LEAN_MIN_SEC):
        moments.append({"rule": "posture", "t": round(start, 2), "end": round(end, 2),
                        "label": f"Leaning for {end - start:.0f}s"})

    return {
        "summary": summary,
        "moments": sorted(moments, key=lambda m: m["t"]),
        "duration": round(samples[-1][0], 2),
    }


if __name__ == "__main__":
    import json
    print(json.dumps(analyze_recording(sys.argv[1]), indent=2))