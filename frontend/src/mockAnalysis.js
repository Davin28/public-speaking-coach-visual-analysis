// Fake analysis results so the UI can be built before the backend is ready.
// This is also the proposed JSON shape for a future POST /analyze endpoint:
// when the backend returns this same shape, swap mockAnalysis for the real response.
//
// Where the real numbers will come from:
//   eyeContactPct      <- visual_analyzer.py  camera_facing_percent
//   levelShouldersPct  <- visual_analyzer.py  level_shoulders_percent
//   handMotion         <- visual_analyzer.py  average_hand_motion_per_sample
//   paceWpm, pauses    <- speech_app.py (Whisper segment timestamps)
//   fillers, repeats   <- transcript text (word_timestamps=True)
//   volume             <- not built yet
//
// Every item in `issues` needs a timestamp `t` (seconds) so the Replay timeline can jump to it.

export const mockAnalysis = {
  durationSec: 252,
  overall: { score: 72, grade: "B", verdict: "Lowkey solid. 3 habits to fix.", delta: 6 },
  categories: [
    { id: "voice", name: "Voice", grade: "B−" },
    { id: "body", name: "Body language", grade: "B" },
    { id: "content", name: "Content", grade: "A−" },
  ],
  topFixes: [
    { title: "You're speedrunning the intro", detail: "182 wpm in the first 40 seconds. Breathe between sentences." },
    { title: "The ums are um-ing", detail: "11 fillers, mostly right before new points. Pause instead." },
    { title: "Eyes on the lens, bestie", detail: "Eye contact fell to 48% in the second half." },
  ],
  paceSeries: [175, 182, 170, 152, 146, 149, 141, 144, 150, 139, 143, 146, 142],
  checks: [
    { rule: "pace", group: "voice", title: "Speaking pace", metric: "168 wpm", ok: false, tip: "Above the 130–160 sweet spot, mostly in the intro." },
    { rule: "fillers", group: "voice", title: "Filler words", metric: "11", ok: false, tip: "“um” ×6, “like” ×5. Clustered before transitions." },
    { rule: "volume", group: "voice", title: "Volume", metric: "±4 dB", ok: true, tip: "Consistent all the way through." },
    { rule: "pauses", group: "voice", title: "Pauses", metric: "0.9s avg", ok: true, tip: "Clean breaks between ideas. No stalls over 3s." },
    { rule: "eye", group: "body", title: "Eye contact", metric: "61%", ok: false, tip: "Dropped to 48% after 2:00. Stick a dot by the lens." },
    { rule: "posture", group: "body", title: "Posture", metric: "Upright", ok: true, tip: "Small lean at 3:10, otherwise steady." },
    { rule: "gestures", group: "body", title: "Hand gestures", metric: "9× chop", ok: true, tip: "Same chopping motion on repeat. Mix in open palms." },
    { rule: "repeats", group: "content", title: "Repeated phrases", metric: "“basically” ×5", ok: true, tip: "Swap in “in short”, or just cut it." },
    { rule: "transitions", group: "content", title: "Transitions", metric: "1 abrupt", ok: true, tip: "Jumped topics at 2:41. Bridge it." },
  ],
  issues: [
    { id: "p1", rule: "pace", group: "voice", t: 20, label: "Speedrunning the intro", tip: "182 wpm, about 20 over the sweet spot. Breathe after each sentence." },
    { id: "p2", rule: "pace", group: "voice", t: 175, label: "Rushing the key point", tip: "Slow down on your key numbers so they land." },
    { id: "f1", rule: "fillers", group: "voice", t: 3, label: "“um” right out the gate", tip: "Start with a silent beat instead." },
    { id: "f2", rule: "fillers", group: "voice", t: 72, label: "“um” before a new point", tip: "Fillers cluster before transitions. Plan your bridge." },
    { id: "f3", rule: "fillers", group: "voice", t: 161, label: "“like” ×2", tip: "Two in 5 seconds. Pause and restate." },
    { id: "v1", rule: "volume", group: "voice", t: 238, label: "Trailing off at the end", tip: "Volume drops on your closer. Finish strong." },
    { id: "pa1", rule: "pauses", group: "voice", t: 120, label: "Lost-place pause (3.4s)", tip: "Keep a one-line outline in view." },
    { id: "e1", rule: "eye", group: "body", t: 128, label: "Reading your notes", tip: "Off camera for 9 seconds. Glance down, then back to the lens." },
    { id: "e2", rule: "eye", group: "body", t: 200, label: "Looking off-screen", tip: "Eye contact drops to 40% here." },
    { id: "po1", rule: "posture", group: "body", t: 190, label: "Leaning to one side", tip: "Plant both feet and reset." },
    { id: "g1", rule: "gestures", group: "body", t: 95, label: "Chop, chop, chop", tip: "Same gesture 9 times. Save it for emphasis." },
    { id: "r1", rule: "repeats", group: "content", t: 12, label: "“basically” (1 of 5)", tip: "Your main crutch word. Try cutting it." },
    { id: "t1", rule: "transitions", group: "content", t: 161, label: "Abrupt topic change", tip: "No bridge between ideas. Try “So what does that mean for us?”" },
  ],
  goals: [
    "Open at 140 wpm. Breathe after every sentence for the first minute.",
    "Swap fillers for a one-beat silent pause.",
    "Eyes on the lens past the 2-minute mark.",
    "Add a bridge sentence between sections.",
  ],
};

export const RULE_LABELS = {
  pace: "Pace",
  fillers: "Fillers",
  volume: "Volume",
  pauses: "Pauses",
  eye: "Eye contact",
  posture: "Posture",
  gestures: "Gestures",
  repeats: "Repeats",
  transitions: "Transitions",
};

export const GROUPS = {
  voice: { name: "Voice", color: "var(--violet)" },
  body: { name: "Body language", color: "var(--coral-dark)" },
  content: { name: "Content", color: "var(--teal)" },
};

export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}