// ONE SENTENCE = ONE VISUAL (T50-08, owner 2026-10-30 11:35Z + 14:35Z, long videos AND Shorts).
// For every narrated sentence this picks what the viewer must SEE at that moment:
//   kw    = big on-screen callout (the number / wallet / key words being spoken), always taken from the sentence itself
//   focus = which part of the chart gets the yellow ring: "entry" | "now" | "liq" | "roe" (null = no chart focus)
// A scene can override with an explicit act: { say, act: { kw, focus } } (lessons/shorts may hand-write pairs).
// standards-check.mjs fails a video when a step has no kw, when a spoken number is not on screen, or when two
// steps in a row look the same (YouTube "inauthentic content": no static, template-only pictures).

const NUMW = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, seventy: 70, eighty: 80, ninety: 90, hundred: 100 };
const STOP = new Set(("the a an and or but so that this these those with from what your you are for its was has have not into onto then than there here " +
  "will would can could should may might just also very much many more most some any all each every one two three about around over under " +
  "when where which while who whom whose why how it is be been being do does did of on in to at by as if we us our they them their he she his her " +
  "let look see now right today like says say said means mean called call get got goes going make makes made only even still well thing things way").split(" "));
const money = (n, u) => "$" + n + ({ million: "M", thousand: "K", billion: "B" }[u.toLowerCase()] || "");

// spoken -> on-screen candidates, in order of importance
export function keyFacts(say) {
  const s = String(say), out = [];
  const add = (t) => { if (t && !out.includes(t)) out.push(t); };
  let m;
  const re = [
    [/\b(plus|minus)?\s*([\d][\d.,]*)\s*percent\b/gi, (m) => (m[1] ? (/minus/i.test(m[1]) ? "−" : "+") : "") + m[2] + "%"],
    [/\b([\d][\d.,]*)\s*(million|thousand|billion)\s*dollars?\b/gi, (m) => money(m[1], m[2])],
    [/\b([\d][\d.,]*)\s*dollars?\b/gi, (m) => "$" + m[1]],
    [/\b([\d]+)\s*times\b/gi, (m) => m[1] + "x"],
    [/\b(0x[0-9a-f]{3,})/gi, (m) => "WALLET " + m[1] + "…"],
    [/\b(about\s+)?(\d+)\s*(hours?|days?|minutes?|weeks?|candles?)\s*(ago|later)?/gi, (m) => (m[2] + " " + m[3] + (m[4] ? " " + m[4] : "")).toUpperCase()],
    [/\bin\s+(19|20)(\d\d)\b/gi, (m) => m[1] + m[2]],
  ];
  for (const [r, f] of re) { r.lastIndex = 0; while ((m = r.exec(s))) add(f(m)); }
  return out;
}

// special lines (outro, disclaimer, CTA) get fixed, honest callouts
function special(s) {
  if (/not financial advice|education, not|education only/i.test(s)) return "EDUCATION ONLY · NOT FINANCIAL ADVICE";
  if (/market radar whale dot com|marketradarwhale/i.test(s)) return "marketradarwhale.com";
  if (/telegram/i.test(s)) return "TELEGRAM WHALE ALERTS";
  if (/description/i.test(s)) return "LINKS IN DESCRIPTION";
  if (/subscribe/i.test(s)) return "SUBSCRIBE · NEW LESSON DAILY";
  return null;
}

export function contentWords(say, n = 3) {
  const w = String(say).replace(/[^A-Za-z0-9' -]+/g, " ").split(/\s+/).map((x) => x.replace(/^'+|'+$/g, "")).filter(Boolean);
  const out = [];
  for (const x of w) { const l = x.toLowerCase(); if (l.length < 3 || STOP.has(l) || NUMW[l] != null) continue; if (!out.some((o) => o.toLowerCase() === l)) out.push(x.toUpperCase()); if (out.length >= n) break; }
  return out;
}

export function chartFocus(say, hasChart) {
  if (!hasChart) return null;
  if (/liquidat/i.test(say)) return "liq";
  if (/\bentry\b|got in|entered|came in|dashed line/i.test(say)) return "entry";
  if (/percent|profit|\bloss\b|result|winning|losing|\bup\b|\bdown\b/i.test(say) && /percent|result/i.test(say)) return "roe";
  if (/price (is|now)|right now|trades at|price was|now at/i.test(say)) return "now";
  return null;
}

// step label: "Step one, the entry." -> "STEP 1 · ENTRY"; "One: big money ..." -> "1 · BIG MONEY ..."
function ordinal(s) {
  const m = /^\s*(step|rule|tip|trick)?\s*(one|two|three|four|five|first|second|third)\b[,:]?\s*/i.exec(s);
  if (!m || (!m[1] && !/^[^,:]+[,:]/.test(s))) return null;
  const n = { one: 1, first: 1, two: 2, second: 2, three: 3, third: 3, four: 4, five: 5 }[m[2].toLowerCase()];
  const rest = contentWords(s.slice(m[0].length), 2);
  return ((m[1] ? m[1].toUpperCase() + " " : "") + n + (rest.length ? " · " + rest.join(" ") : "")).trim();
}

// one act per sentence; prevKw keeps two neighbouring steps from showing the same callout
export function visualAct(say, { hasChart = false, prevKw = null } = {}) {
  const sp = special(say), facts = keyFacts(say), ord = ordinal(say);
  const cands = [];
  if (sp) cands.push(sp);
  if (facts.length) cands.push(facts.slice(0, 2).join(" · "));
  if (ord) cands.push(ord);
  const cw = contentWords(say, 3);
  if (cw.length) cands.push(cw.join(" · "));
  if (cw.length > 1) cands.push(cw.slice(1).join(" · "));
  let kw = cands.find((c) => c !== prevKw) || (cands[0] ? cands[0] + " ·" : String(say).split(/\s+/).slice(0, 3).join(" ").toUpperCase());
  const nums = spokenNumbers(say);
  if (nums.length && !/\d/.test(kw)) kw = (facts[0] || nums[0]) + " · " + kw; // a spoken number is always on screen
  return { kw, focus: chartFocus(say, hasChart) };
}

// numbers spoken in a sentence (digits only; used by the standards check)
export const spokenNumbers = (say) => (String(say).match(/\d[\d.,]*/g) || []).map((x) => x.replace(/[.,]+$/, ""));
