// Turns Whisper's timestamped words into "moments" for the Replay timeline.
// Input: { words: [{ word, start, end }], duration }  (from POST /upload)
// Output: { duration, issues: [{ id, rule, group, t, label, tip }] }

const FILLER_WORDS = new Set(["um", "umm", "uh", "uhh", "erm", "hmm", "like", "basically", "literally", "actually", "kinda"]);
const FILLER_PHRASES = new Set(["you know", "i mean", "sort of", "kind of"]);
const STOPWORDS = new Set(
  "the a an and or but to of in on for is it that this he she they we you i was are be with at as so his her its have has not just can all there what about from then them when were been your really going gonna want like that's it's i'm".split(" "),
);

const PAUSE_SEC = 2; // gaps longer than this get flagged
const PACE_WINDOW_SEC = 10;
const FAST_WPM = 170;
const SLOW_WPM = 100;

const clean = (w) => w.toLowerCase().replace(/[^a-z']/g, "");

function fillerTip(phrase) {
  if (phrase === "um" || phrase === "umm" || phrase === "uh" || phrase === "uhh" || phrase === "erm" || phrase === "hmm") {
    return "Swap it for a silent beat. Silence sounds more confident than you think.";
  }
  if (phrase === "like") return "If it's not a comparison, cut it.";
  return "Crutch phrase. Try saying the sentence without it.";
}

export function buildIssues(transcript) {
  const words = (transcript?.words || []).filter((w) => clean(w.word));
  const lastEnd = words.length ? words[words.length - 1].end : 0;
  const duration = Math.max(transcript?.duration || 0, lastEnd);
  const issues = [];
  let n = 0;
  const add = (rule, group, t, label, tip) => issues.push({ id: `${rule}-${n++}`, rule, group, t, label, tip });

  // Fillers (two-word phrases first, so "you know" isn't missed).
  for (let i = 0; i < words.length; i++) {
    const one = clean(words[i].word);
    const two = i + 1 < words.length ? `${one} ${clean(words[i + 1].word)}` : "";
    if (FILLER_PHRASES.has(two)) {
      add("fillers", "voice", words[i].start, `“${two}”`, fillerTip(two));
      i++;
    } else if (FILLER_WORDS.has(one)) {
      add("fillers", "voice", words[i].start, `“${one}”`, fillerTip(one));
    }
  }

  // Long pauses between words.
  for (let i = 0; i + 1 < words.length; i++) {
    const gap = words[i + 1].start - words[i].end;
    if (gap > PAUSE_SEC) {
      add(
        "pauses",
        "voice",
        words[i].end,
        `${gap.toFixed(1)}s pause`,
        gap > 4 ? "Long stall. Keep a one-line outline in view so you don't lose your place." : "A beat is good, but this one ran long. Aim for under 2 seconds.",
      );
    }
  }

  // Pace in 10-second windows. Only flag where it changes, so a long fast stretch is one marker.
  let lastFlag = null;
  for (let t = 0; t + PACE_WINDOW_SEC <= duration; t += PACE_WINDOW_SEC) {
    const count = words.filter((w) => w.start >= t && w.start < t + PACE_WINDOW_SEC).length;
    const wpm = Math.round(count * (60 / PACE_WINDOW_SEC));
    const flag = count === 0 ? null : wpm > FAST_WPM ? "fast" : wpm < SLOW_WPM ? "slow" : null;
    if (flag && flag !== lastFlag) {
      add(
        "pace",
        "voice",
        t,
        flag === "fast" ? `Speeding up (${wpm} wpm)` : `Slowing down (${wpm} wpm)`,
        flag === "fast" ? "Above the 130–160 sweet spot. Breathe between sentences." : "Below the sweet spot. Keep the energy up.",
      );
    }
    lastFlag = flag;
  }

  // Words said 3+ times: one marker at the 3rd use.
  const seen = {};
  for (const w of words) {
    const word = clean(w.word);
    if (word.length <= 3 || STOPWORDS.has(word) || FILLER_WORDS.has(word)) continue;
    seen[word] = (seen[word] || 0) + 1;
    if (seen[word] === 3) {
      const total = words.filter((x) => clean(x.word) === word).length;
      add("repeats", "content", w.start, `“${word}” ×${total}`, `You said this ${total} times. Swap in a synonym or cut a few.`);
    }
  }

    // Body language moments from the visual analyzer (looked away, leaning).
  for (const m of transcript?.visual?.moments || []) {
    add(
      m.rule,
      "body",
      m.t,
      m.label,
      m.rule === "eye"
        ? "You looked away from the camera here. Glance at notes if you need to, then come right back to the lens."
        : "You leaned to one side here. Plant both feet and square your shoulders.",
    );
  }

  issues.sort((a, b) => a.t - b.t);
  return { duration: Math.max(duration, transcript?.visual?.duration || 0), issues };
}