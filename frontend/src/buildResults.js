// Builds the Results page from a real recording.
// Inputs: transcript from POST /upload ({ text, words, duration }),
//         volume stats from the Practice screen ({ avg, spread } or null for uploads),
//         previous score (number or null) for the "+N since last time" chip.
import { buildIssues } from "./transcriptIssues.js";
import { formatTime } from "./mockAnalysis.js";

const PACE_MIN = 130;
const PACE_MAX = 160;

function gradeFor(score) {
  if (score >= 93) return "A";
  if (score >= 90) return "A−";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B−";
  if (score >= 77) return "C+";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function buildResults(transcript, volume, prevScore) {
  const { duration, issues } = buildIssues(transcript);
  const words = transcript?.words || [];
  const speakingSec = words.length > 1 ? words[words.length - 1].end - words[0].start : 0;
  const minutes = Math.max(speakingSec, 1) / 60;
  const tooShort = words.length < 20 || speakingSec < 10;

  const checks = [];
  const fixes = []; // { severity, title, detail }
  let score = 100;

  // 1. Pace
  const wpm = speakingSec > 0 ? Math.round(words.length / minutes) : 0;
  const paceOk = wpm >= PACE_MIN && wpm <= PACE_MAX;
  const paceOff = wpm > PACE_MAX ? wpm - PACE_MAX : wpm < PACE_MIN ? PACE_MIN - wpm : 0;
  score -= Math.min(20, paceOff / 2);
  checks.push({
    rule: "pace", group: "voice", title: "Speaking pace", metric: `${wpm} wpm`, ok: paceOk,
    tip: paceOk ? "Right in the 130–160 sweet spot." : wpm > PACE_MAX ? "Above the 130–160 sweet spot. Breathe between sentences." : "Below the 130–160 sweet spot. Keep the energy up.",
  });
  if (!paceOk) {
    fixes.push({
      severity: paceOff,
      title: wpm > PACE_MAX ? "You're speedrunning it" : "Pick up the pace",
      detail: `${wpm} wpm overall. The sweet spot is 130–160.`,
    });
  }

  // 2. Fillers
  const fillers = issues.filter((i) => i.rule === "fillers");
  const fillerCounts = {};
  for (const f of fillers) {
    const word = f.label.replace(/[“”]/g, "");
    fillerCounts[word] = (fillerCounts[word] || 0) + 1;
  }
  const fillerList = Object.entries(fillerCounts).sort((a, b) => b[1] - a[1]);
  const perMin = fillers.length / minutes;
  const fillersOk = perMin < 2;
  score -= Math.min(25, perMin * 5);
  checks.push({
    rule: "fillers", group: "voice", title: "Filler words", metric: String(fillers.length), ok: fillersOk,
    tip: fillers.length
      ? `${fillerList.slice(0, 3).map(([w, n]) => `“${w}” ×${n}`).join(", ")}. About ${perMin.toFixed(1)} a minute.`
      : "None caught. Clean.",
  });
  if (!fillersOk) {
    fixes.push({
      severity: perMin * 8,
      title: "The ums are um-ing",
      detail: `${fillers.length} fillers, about ${perMin.toFixed(1)} a minute. Pause instead.`,
    });
  }

  // 3. Volume (only measured on live recordings)
  if (volume && volume.samples > 10) {
    const quiet = volume.avg < 22;
    const uneven = volume.spread > 0.8;
    const volumeOk = !quiet && !uneven;
    if (!volumeOk) score -= 10;
    checks.push({
      rule: "volume", group: "voice", title: "Volume", metric: quiet ? "Too quiet" : uneven ? "Up and down" : "Steady", ok: volumeOk,
      tip: quiet ? "Speak up a little, or move closer to the mic." : uneven ? "Your volume swings a lot. Aim for a steady, even level." : "Consistent the whole way through.",
    });
    if (!volumeOk) {
      fixes.push({ severity: 12, title: quiet ? "Turn it up" : "Keep the volume steady", detail: quiet ? "You were hard to hear. Project like the back row is listening." : "Your volume jumped around. Pick one level and hold it." });
    }
  } else {
    checks.push({ rule: "volume", group: "voice", title: "Volume", metric: "—", pending: true, tip: "Measured on live recordings, not uploads." });
  }

  // 4. Pauses
  const pauses = issues.filter((i) => i.rule === "pauses");
  const longest = pauses.reduce((max, p) => Math.max(max, parseFloat(p.label)), 0);
  const pausesOk = pauses.length === 0 || (pauses.length === 1 && longest < 3);
  score -= Math.min(15, pauses.length * 5);
  checks.push({
    rule: "pauses", group: "voice", title: "Pauses", metric: pauses.length ? `${pauses.length} long` : "None long", ok: pausesOk,
    tip: pauses.length
      ? `Longest was ${longest.toFixed(1)}s at ${formatTime(pauses.find((p) => parseFloat(p.label) === longest).t)}.`
      : "No stalls over 2 seconds.",
  });
  if (!pausesOk) {
    fixes.push({ severity: longest * 4, title: "Don't lose the thread", detail: `${pauses.length} ${pauses.length === 1 ? "pause" : "pauses"} over 2s, the longest ${longest.toFixed(1)}s. Keep an outline in view.` });
  }

  // 5–7. Body language, from the visual analyzer (backend/visual_timeline.py).
  const visual = transcript?.visual;
  const vs = visual?.summary;
  if (!vs) {
    const why = visual?.error || "Waiting on the visual analyzer.";
    checks.push({ rule: "eye", group: "body", title: "Eye contact", metric: "—", pending: true, tip: why });
    checks.push({ rule: "posture", group: "body", title: "Posture", metric: "—", pending: true, tip: why });
    checks.push({ rule: "gestures", group: "body", title: "Hand gestures", metric: "—", pending: true, tip: why });
  } else {
    const moments = visual.moments || [];

    // Eye contact: % of the time your head faced the camera (not true eye tracking).
    const eye = vs.camera_facing_percent;
    if (eye == null || vs.face_detected_percent < 20) {
      checks.push({ rule: "eye", group: "body", title: "Eye contact", metric: "No face", ok: false, tip: "Couldn't find your face. Sit facing the camera with good light." });
      score -= 10;
      fixes.push({ severity: 15, title: "Get in frame", detail: "Your face wasn't visible most of the time. Face the camera with light in front of you." });
    } else {
      const eyeOk = eye >= 70;
      const awayCount = moments.filter((m) => m.rule === "eye").length;
      score -= eyeOk ? 0 : Math.min(15, (70 - eye) / 2);
      checks.push({
        rule: "eye", group: "body", title: "Eye contact", metric: `${Math.round(eye)}%`, ok: eyeOk,
        tip: eyeOk ? "You kept your head toward the camera." : `Facing the camera ${Math.round(eye)}% of the time${awayCount ? `, with ${awayCount} longer look-away${awayCount === 1 ? "" : "s"}` : ""}. Aim for 70%+.`,
      });
      if (!eyeOk) fixes.push({ severity: 70 - eye, title: "Eyes on the lens, bestie", detail: `You faced the camera ${Math.round(eye)}% of the time. Aim for 70%+.` });
    }

    // Posture: % of the time your shoulders were level.
    const level = vs.level_shoulders_percent;
    if (level == null) {
      checks.push({ rule: "posture", group: "body", title: "Posture", metric: "Not visible", pending: true, tip: "Your shoulders weren't in frame. Sit back a little next time." });
    } else {
      const postureOk = level >= 80;
      score -= postureOk ? 0 : Math.min(10, (80 - level) / 3);
      checks.push({
        rule: "posture", group: "body", title: "Posture", metric: `${Math.round(level)}% level`, ok: postureOk,
        tip: postureOk ? "Shoulders level and steady." : "You leaned to one side a lot. Plant both feet and square up.",
      });
      if (!postureOk) fixes.push({ severity: (80 - level) / 2, title: "Square up", detail: `Your shoulders were level only ${Math.round(level)}% of the time.` });
    }

    // Gestures: are your hands visible, and how much do they move? (Thresholds are first guesses, tune them.)
    const handsPct = vs.hands_visible_percent ?? 0;
    const motion = vs.average_hand_motion_per_sample;
    if (handsPct < 10) {
      checks.push({ rule: "gestures", group: "body", title: "Hand gestures", metric: "Hands hidden", ok: true, tip: "Your hands were mostly out of frame. Using them can add energy." });
    } else if (motion != null && motion > 0.06) {
      score -= 5;
      checks.push({ rule: "gestures", group: "body", title: "Hand gestures", metric: "Busy", ok: false, tip: "Lots of hand movement. Save big gestures for your key points." });
      fixes.push({ severity: 8, title: "Calm the hands", detail: "Your hands were moving a lot. Use gestures on purpose, for emphasis." });
    } else {
      checks.push({ rule: "gestures", group: "body", title: "Hand gestures", metric: "Natural", ok: true, tip: `Hands in frame ${Math.round(handsPct)}% of the time, moving at a natural pace.` });
    }
  }

  // 8. Repeated words
  const repeats = issues.filter((i) => i.rule === "repeats");
  const top = repeats
    .map((r) => ({ label: r.label, n: parseInt(r.label.split("×")[1], 10) }))
    .sort((a, b) => b.n - a.n)[0];
  const repeatsOk = !top || top.n < 5;
  if (!repeatsOk) score -= 5;
  checks.push({
    rule: "repeats", group: "content", title: "Repeated words", metric: top ? top.label : "None", ok: repeatsOk,
    tip: top ? (repeatsOk ? "A little repetition is fine." : "Swap in a synonym or cut a few.") : "Nice variety.",
  });
  if (!repeatsOk) fixes.push({ severity: top.n, title: "Switch up your words", detail: `You said ${top.label.replace(" ×", " ")} times.` });

  // 9. Transitions: not built yet
  checks.push({ rule: "transitions", group: "content", title: "Transitions", metric: "—", pending: true, tip: "Coming soon." });

  score = Math.max(0, Math.min(100, Math.round(score)));
  const habits = checks.filter((c) => !c.pending && !c.ok).length;
  const verdict = tooShort
    ? "Too short to judge. Go for 20+ seconds."
    : score >= 90 ? (habits === 0 ? "Clean. Say less, mean more." : `Almost clean. ${habits} ${habits === 1 ? "habit" : "habits"} to fix.`)
    : score >= 75 ? `Lowkey solid. ${habits} ${habits === 1 ? "habit" : "habits"} to fix.`
    : score >= 60 ? `Getting there. ${habits} ${habits === 1 ? "habit" : "habits"} to fix.`
    : `Rough one. Let's fix ${habits} ${habits === 1 ? "thing" : "things"}.`;

  const topFixes = fixes.sort((a, b) => b.severity - a.severity).slice(0, 3);

  // Category grades: A if every measured check passed, one letter lower per miss. "—" if nothing measured yet.
  const LETTERS = ["A", "B", "C", "D", "F"];
  const categories = [
    { id: "voice", name: "Voice" },
    { id: "body", name: "Body language" },
    { id: "content", name: "Content" },
  ].map((c) => {
    const measured = checks.filter((k) => k.group === c.id && !k.pending);
    const misses = measured.filter((k) => !k.ok).length;
    return { ...c, grade: measured.length ? LETTERS[Math.min(misses, 4)] : "—" };
  });

  // Words per minute in 10-second chunks, for the Report's pace chart.
  const paceSeries = [];
  for (let t = 0; t + 10 <= duration || (t === 0 && duration > 0); t += 10) {
    const span = Math.min(10, duration - t);
    const count = words.filter((w) => w.start >= t && w.start < t + 10).length;
    paceSeries.push(Math.round(count * (60 / span)));
  }

  // "Next time, try" goals, one per problem, most important first.
  const GOALS = {
    pace: wpm > PACE_MAX ? "Aim for 140 wpm. Breathe after every sentence." : "Aim for 140 wpm. Keep the energy up between points.",
    fillers: "Swap fillers for a one-beat silent pause.",
    volume: "Pick one volume and hold it, like the back row is listening.",
    pauses: "Keep a one-line outline in view so you don't lose your place.",
    eye: "Stick a dot next to your camera and talk to it.",
    posture: "Plant both feet and square your shoulders before you start.",
    gestures: "Save big hand movements for your key points.",
    repeats: "Find a synonym or two for your most repeated word.",
  };
  const goals = checks.filter((c) => !c.pending && !c.ok && GOALS[c.rule]).map((c) => GOALS[c.rule]);
  if (goals.length === 0) goals.push("Try a longer take (1–2 minutes) to really stress-test it.");

  return {
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase(),
    length: formatTime(duration),
    overall: { score, grade: gradeFor(score), verdict, delta: prevScore == null ? null : score - prevScore },
    topFixes,
    checks,
    categories,
    paceSeries,
    goals,
    wpm,
    tooShort,
  };
}