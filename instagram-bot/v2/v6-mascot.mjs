// v6 MASCOT PUPPET (T50-08, owner D189 "the middle one" = option B analyst glasses + D190 face stays the same, clothes change,
// expressions follow the voice, female voice -> woman). Code-drawn layered SVG rig, own art (design file whale-alert-worker/design/mascot/
// mascot_options_v1.svg option B). Layers, back to front: ponytail, OUTFIT torso, neck, FIXED HEAD (face circle, hair, glasses - one
// definition, never redrawn per pose), FACE (brows, eyes/blink, mouth 0/1/2 = loudness), ARMS + PROP (per pose), extras (sparkles, tear...).
// Box = 360 x 440 (character centre x = 180). Mouth follows the TTS loudness per video frame (3-step, smoothed; plan B of the brief).
const INK = "#141a2e", SKIN = "#e8b98c", HAIR = "#5a3522", Y = "#f6c443", W = "#ffffff";
export const OUTFITS = {
  jacket: { body: "#1d2a52", extra: () => `<path d="M150 312 l30 40 l30 -40" fill="${Y}" stroke="${INK}" stroke-width="4"/><g transform="translate(196,390) scale(1.2)"><path d="M0 6 q8 -10 18 0 q-4 8 -18 0z" fill="#4c7be0" stroke="${INK}" stroke-width="2"/><path d="M18 3 l7 -5 l0 10z" fill="#4c7be0" stroke="${INK}" stroke-width="2"/></g>` },
  hoodie: { body: "#3bb3a6", extra: () => `<path d="M140 318 q40 34 80 0 q-4 22 -40 30 q-36 -8 -40 -30z" fill="#2c8f84" stroke="${INK}" stroke-width="4"/><line x1="168" y1="345" x2="166" y2="385" stroke="${W}" stroke-width="4"/><line x1="192" y1="345" x2="194" y2="385" stroke="${W}" stroke-width="4"/><rect x="146" y="400" width="68" height="30" rx="10" fill="#2c8f84" stroke="${INK}" stroke-width="4"/>` },
  suit: { body: "#2f3542", extra: () => `<path d="M154 312 l26 70 l26 -70z" fill="${W}" stroke="${INK}" stroke-width="4"/><path d="M175 322 l5 -6 l5 6 l-2 40 l-3 8 l-3 -8z" fill="#ef5b5b" stroke="${INK}" stroke-width="3"/><path d="M150 312 l30 70 l-22 -20 l8 -6z M210 312 l-30 70 l22 -20 l-8 -6z" fill="#252a35" stroke="${INK}" stroke-width="3"/>` },
  coat: { body: "#8a4b2a", extra: () => `<path d="M138 318 q42 26 84 0 l4 18 q-46 28 -92 0z" fill="#ef5b5b" stroke="${INK}" stroke-width="4"/><path d="M200 330 l12 50 l-18 4z" fill="#ef5b5b" stroke="${INK}" stroke-width="4"/>${[380, 410].map((y) => `<circle cx="180" cy="${y}" r="6" fill="${Y}" stroke="${INK}" stroke-width="3"/>`).join("")}` },
};
export const PROPS = {
  none: () => "",
  phone: (x, y) => `<g transform="translate(${x - 18} ${y - 52})"><rect width="36" height="64" rx="7" fill="${INK}"/><rect x="5" y="7" width="26" height="44" rx="3" fill="#5aa9ff"/><path d="M9 40 l7 -10 l6 5 l7 -14" fill="none" stroke="${W}" stroke-width="3"/></g>`,
  coffee: (x, y) => `<g transform="translate(${x - 20} ${y - 46})"><path d="M0 4 h36 l-5 44 h-26z" fill="${W}" stroke="${INK}" stroke-width="4"/><rect x="2" y="16" width="32" height="12" fill="#a0522d"/><path d="M36 14 q14 4 0 20" fill="none" stroke="${INK}" stroke-width="4"/><path d="M12 -6 q4 -8 0 -14 M22 -6 q4 -8 0 -14" stroke="#9aa3b8" stroke-width="3" fill="none"/></g>`,
  board: (x, y) => `<g transform="translate(${x - 104} ${y - 100})"><rect width="110" height="90" rx="8" fill="${W}" stroke="${INK}" stroke-width="5"/><rect x="18" y="40" width="12" height="30" fill="#ef5b5b" stroke="${INK}" stroke-width="2"/><rect x="42" y="30" width="12" height="28" fill="#2fbf86" stroke="${INK}" stroke-width="2"/><rect x="66" y="18" width="12" height="30" fill="#2fbf86" stroke="${INK}" stroke-width="2"/><line x1="10" y1="80" x2="100" y2="80" stroke="${INK}" stroke-width="3"/><line x1="60" y1="90" x2="60" y2="118" stroke="${INK}" stroke-width="6"/></g>`,
  moneybag: (x, y) => `<g transform="translate(${x - 30} ${y - 60})"><path d="M18 12 h24 l-6 10 q30 14 22 44 q-6 16 -30 16 q-24 0 -30 -16 q-8 -30 22 -44z" fill="${Y}" stroke="${INK}" stroke-width="4"/><text x="30" y="66" font-size="30" font-weight="700" text-anchor="middle" fill="${INK}" font-family="V">$</text></g>`,
};
// pose = arms (shoulder -> elbow -> hand, L and R), prop hand, head tilt, look direction, default emotion
const SH = { L: [128, 352], R: [232, 352] };
export const POSES = {
  talk: { L: [[104, 400], [138, 424]], R: [[256, 400], [222, 424]], tilt: 0, look: [0, 0], emo: "neutral" },
  point_up: { L: [[104, 400], [138, 424]], R: [[282, 316], [296, 246]], finger: "up", tilt: -4, look: [3, -3], emo: "happy" },
  point_down: { L: [[104, 400], [138, 424]], R: [[284, 372], [312, 430]], finger: "down", tilt: 4, look: [3, 3], emo: "worried" },
  think: { L: [[110, 404], [176, 400]], R: [[262, 388], [206, 290]], tilt: -6, look: [4, -5], emo: "curious" },
  explain_board: { L: [[90, 380], [92, 330]], R: [[262, 392], [228, 336]], prop: "board", propHand: "L", tilt: -3, look: [-4, 0], emo: "neutral" },
  happy: { L: [[94, 360], [112, 300]], R: [[266, 360], [248, 300]], tilt: 3, look: [0, 0], emo: "happy" },
  shocked: { L: [[100, 334], [128, 258]], R: [[260, 334], [232, 258]], tilt: 0, look: [0, 0], emo: "surprised" },
  warning: { L: [[104, 400], [138, 424]], R: [[284, 330], [304, 278]], palm: true, tilt: 0, look: [0, 0], emo: "serious" },
  celebrate: { L: [[92, 272], [96, 186]], R: [[268, 272], [264, 186]], tilt: 0, look: [0, -2], emo: "excited", fx: "sparkle" },
  sad: { L: [[112, 404], [140, 436]], R: [[248, 404], [220, 436]], tilt: 8, look: [0, 4], emo: "sad", fx: "tear" },
  phone: { L: [[104, 400], [138, 424]], R: [[264, 398], [222, 340]], prop: "phone", propHand: "R", tilt: 2, look: [3, 4], emo: "neutral" },
  wave_bye: { L: [[104, 400], [138, 424]], R: [[284, 318], [300, 236]], palm: true, tilt: -3, look: [0, 0], emo: "happy", fx: "wave" },
};
export const EMOTIONS = ["neutral", "happy", "surprised", "worried", "sad", "excited", "serious", "curious"];
const BROWS = { // [left brow path, right brow path]
  neutral: ["M146 199 q14 -5 28 0", "M188 199 q14 -5 28 0"], happy: ["M146 197 q14 -10 28 -2", "M188 195 q14 -8 28 2"],
  surprised: ["M146 189 q14 -10 28 -2", "M188 187 q14 -8 28 2"], worried: ["M146 199 q14 -4 26 -10", "M190 189 q12 6 26 10"],
  sad: ["M146 200 q14 -2 26 -9", "M190 191 q12 7 26 9"], excited: ["M146 192 q14 -12 28 -2", "M188 190 q14 -10 28 2"],
  serious: ["M146 193 q14 2 26 8", "M190 201 q12 -6 26 -8"], curious: ["M146 199 q14 -3 28 0", "M188 189 q14 -10 28 0"],
};
function mouth(emo, open) {
  const m = `fill="#7a2230" stroke="${INK}" stroke-width="4"`;
  if (open > 0) {
    if (emo === "happy" || emo === "excited") return `<path d="M163 249 q17 ${open === 2 ? 26 : 16} 34 0z" ${m}/>`;
    if (emo === "sad" || emo === "worried") return `<ellipse cx="180" cy="258" rx="${open === 2 ? 11 : 10}" ry="${open === 2 ? 9 : 5}" ${m}/>`;
    return `<ellipse cx="180" cy="256" rx="${open === 2 ? 13 : 12}" ry="${open === 2 ? 11 : 6}" ${m}/>` + (open === 2 ? `<ellipse cx="180" cy="262" rx="7" ry="3" fill="#e0707a"/>` : "");
  }
  const L = `fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"`;
  return { neutral: `<path d="M166 253 q14 9 28 0" ${L}/>`, happy: `<path d="M162 250 q18 18 36 0" ${L}/>`, excited: `<path d="M162 249 q18 22 36 0z" ${m}/>`,
    surprised: `<ellipse cx="180" cy="258" rx="8" ry="10" ${m}/>`, worried: `<path d="M166 259 q7 -6 14 0 q7 6 14 0" ${L}/>`, sad: `<path d="M166 262 q14 -11 28 0" ${L}/>`,
    serious: `<path d="M167 257 h26" ${L}/>`, curious: `<path d="M168 256 q12 4 24 -4" ${L}/>` }[emo];
}
// FIXED HEAD (D190: the face never changes; only brows/eyes/mouth move)
const HEAD_BACK = `<path d="M236 170 q60 10 50 90 q-20 -30 -40 -40z" fill="${HAIR}" stroke="${INK}" stroke-width="5"/>`;
const HEAD = `<circle cx="180" cy="215" r="62" fill="${SKIN}" stroke="${INK}" stroke-width="5"/><path d="M116 215 q0 -85 64 -85 q66 0 64 85 q-30 -55 -128 0z" fill="${HAIR}" stroke="${INK}" stroke-width="5"/>`;
const GLASSES = `<circle cx="160" cy="222" r="15" fill="${W}" fill-opacity="0.35" stroke="${INK}" stroke-width="4"/><circle cx="202" cy="222" r="15" fill="${W}" fill-opacity="0.35" stroke="${INK}" stroke-width="4"/><line x1="175" y1="222" x2="187" y2="222" stroke="${INK}" stroke-width="4"/>`;
function arm(side, [el, hd], col, p) {
  const [sx, sy] = SH[side], d = `M${sx} ${sy} Q${el[0]} ${el[1]} ${hd[0]} ${hd[1]}`;
  let s = `<path d="${d}" fill="none" stroke="${INK}" stroke-width="34" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="24" stroke-linecap="round"/>`;
  if (side === "R" && p.finger) s += `<line x1="${hd[0]}" y1="${hd[1]}" x2="${hd[0] + 2}" y2="${hd[1] + (p.finger === "up" ? -30 : 30)}" stroke="${INK}" stroke-width="16" stroke-linecap="round"/><line x1="${hd[0]}" y1="${hd[1]}" x2="${hd[0] + 2}" y2="${hd[1] + (p.finger === "up" ? -30 : 30)}" stroke="${SKIN}" stroke-width="8" stroke-linecap="round"/>`;
  if (side === "R" && p.palm) s += `<rect x="${hd[0] - 17}" y="${hd[1] - 30}" width="34" height="40" rx="14" fill="${SKIN}" stroke="${INK}" stroke-width="4"/>`;
  return s + `<circle cx="${hd[0]}" cy="${hd[1]}" r="15" fill="${SKIN}" stroke="${INK}" stroke-width="4"/>`;
}
const FX = {
  sparkle: () => [[40, 120], [320, 110], [60, 230], [306, 220]].map(([x, y]) => `<path d="M${x} ${y - 16} l5 11 l11 5 l-11 5 l-5 11 l-5 -11 l-11 -5 l11 -5z" fill="${Y}" stroke="${INK}" stroke-width="3"/>`).join(""),
  tear: () => `<path d="M206 240 q-6 12 0 18 q6 -6 0 -18z" fill="#5aa9ff" stroke="${INK}" stroke-width="2"/>`,
  wave: () => `<path d="M322 222 q10 14 0 28 M334 214 q14 22 0 44" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  shock: () => `<path d="M100 150 l-14 -16 M90 176 l-20 -4 M260 150 l14 -16 M270 176 l20 -4" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
};
// one picture of the puppet: m = {pose, emotion, outfit, prop?}, open = mouth 0|1|2, blink = eyes closed
export function mascotSvg(m, open = 0, blink = false) {
  const p = POSES[m.pose] || POSES.talk, o = OUTFITS[m.outfit] || OUTFITS.jacket, emo = EMOTIONS.includes(m.emotion) ? m.emotion : p.emo;
  const prop = m.prop && m.prop !== "none" ? m.prop : p.prop || "none", ph = p.propHand || "L", hand = p[ph][1];
  const [lx, ly] = p.look, eye = (cx) => blink ? `<path d="M${cx - 9} 223 q9 5 18 0" fill="none" stroke="${INK}" stroke-width="4"/>` : `<circle cx="${cx + lx}" cy="${222 + ly}" r="${emo === "surprised" ? 4 : 5.5}" fill="${INK}"/>`;
  const [bl, br] = BROWS[emo];
  const face = `<path d="${bl}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="${br}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` +
    eye(160) + eye(202) + GLASSES + (emo === "happy" || emo === "excited" ? `<circle cx="140" cy="246" r="8" fill="#f08a8a" opacity="0.6"/><circle cx="220" cy="246" r="8" fill="#f08a8a" opacity="0.6"/>` : "") + mouth(emo, open);
  const head = `<g transform="rotate(${p.tilt} 180 300)">${HEAD_BACK}<rect x="166" y="270" width="28" height="42" fill="${SKIN}" stroke="${INK}" stroke-width="5"/>${HEAD}${face}${p.fx === "tear" ? FX.tear() : ""}</g>`;
  const torso = `<path d="M110 440 q0 -120 70 -130 q70 10 70 130z" fill="${o.body}" stroke="${INK}" stroke-width="5"/>` + o.extra();
  const propSvg = PROPS[prop] ? PROPS[prop](hand[0], hand[1]) : "";
  const arms = arm("L", p.L, o.body, p) + arm("R", p.R, o.body, p);
  const fx = p.fx && p.fx !== "tear" ? FX[p.fx]() : emo === "surprised" ? FX.shock() : "";
  // props held in front of the hand are drawn after the arms; the board stands behind the hand
  return torso + head + (prop === "board" ? propSvg + arms : arms + propSvg) + fx;
}

// PICK BY MEANING (D189: poses follow the video): first matching rule wins; lessons may set step.mascot themselves
const RULES = [
  [/\b(bye|subscribe|watch live|marketradar)\b/i, "wave_bye", "happy"],
  [/\b(never|scam|danger|careful|warning|not financial|do not|don't|stop loss|protect)\b/i, "warning", "serious"],
  [/\b(lost|loss|losing|liquidat|crash|lose)\b/i, "sad", "sad"],
  [/\b(won|win|percent higher|profit|gain|jumped|soared)\b/i, "celebrate", "excited"],
  [/\b(why|how|what|wonder|clue|question|think)\b|\?/i, "think", "curious"],
  [/\b(fell|fall|falls|down|drop|lower|sellers|dump|bottom|below)\b/i, "point_down", "worried"],
  [/\b(rose|rise|rises|up|higher|buyers|pump|top|above)\b/i, "point_up", "happy"],
  [/\b(phone|app|telegram|alert|alerts|bot|wallet)\b/i, "phone", "neutral"],
  [/\b(surprise|warn you|big|huge|shock|whoa)\b/i, "shocked", "surprised"],
  [/\b(dollars|money|million|billion|\$)\b/i, "talk", "happy", "moneybag"],
  [/\b(good|great|easy|simple|yes|right)\b/i, "happy", "happy"],
];
export function pickMascot(step, i, outfit = "jacket") {
  const say = String(step.say || "");
  let pose = "talk", emotion = "neutral", prop;
  const r = step.visual && step.visual.type === "end" ? RULES[0] : RULES.find(([re]) => re.test(say));
  if (r) [, pose, emotion, prop] = r;
  else if (step.visual && /^(diagram|chart)$/.test(step.visual.type)) { pose = "explain_board"; emotion = "neutral"; }
  else if (i % 3 === 2) prop = "coffee";
  return { pose, emotion, outfit, ...(prop ? { prop } : {}) };
}
// tag every step (keeps hand-written tags); outfit fixed per video, rotates by topic so videos differ
export function tagMascot(steps, topicKey = "") {
  const outs = Object.keys(OUTFITS), outfit = outs[[...String(topicKey)].reduce((a, c) => a + c.charCodeAt(0), 0) % outs.length];
  let prev = "";
  steps.forEach((s, i) => {
    if (!s.mascot) s.mascot = pickMascot(s, i, outfit);
    if (!s.mascot.outfit) s.mascot.outfit = outfit;
    if (s.mascot.pose === prev && prev === "explain_board" && i % 2) s.mascot = { ...s.mascot, pose: "talk" }; // no long runs of one pose
    prev = s.mascot.pose;
  });
  return steps;
}
export function checkMascot(m) {
  if (!m) return "no mascot tags";
  if (!POSES[m.pose]) return `mascot pose "${m.pose}" unknown`;
  if (!EMOTIONS.includes(m.emotion)) return `mascot emotion "${m.emotion}" unknown`;
  if (!OUTFITS[m.outfit]) return `mascot outfit "${m.outfit}" unknown`;
  if (m.prop && !PROPS[m.prop]) return `mascot prop "${m.prop}" unknown`;
  return "";
}
// mouth level per video frame (30 fps) from the 20 ms loudness envelope: 3 steps, smoothed, min hold 2 frames (plan B: no jerky flap)
export function mouthFrames(values, frames, stepMs = 20, fps = 30) {
  const mx = Math.max(0.0001, ...values), out = [];
  let cur = 0, hold = 0, sm = 0;
  for (let f = 0; f < frames; f++) {
    const j = Math.floor((f * 1000) / fps / stepMs), v = (values[j] || 0) / mx;
    sm = 0.55 * sm + 0.45 * v;
    const want = sm > 0.5 ? 2 : sm > 0.18 ? 1 : 0;
    if (want !== cur && hold <= 0) { cur = want; hold = 2; } else hold--;
    out.push(cur);
  }
  return out;
}
// blink: closed for 4 frames every 3-6 s (deterministic per video)
export function blinkFrames(frames, seed = 7, fps = 30) {
  const out = Array(frames).fill(false);
  let r = seed, f = fps * 2;
  while (f < frames) { for (let k = 0; k < 4 && f + k < frames; k++) out[f + k] = true; r = (r * 9301 + 49297) % 233280; f += Math.round(fps * (3 + (3 * r) / 233280)); }
  return out;
}
// where the puppet stands in each frame size (outside the picture panel, inside the Shorts safe zone)
export const MASCOT_BOX = { short: { x: 40, y: 1100, scale: 0.7 }, long: { x: 1590, y: 700, scale: 0.8 } };
