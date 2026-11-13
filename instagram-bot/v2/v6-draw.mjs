// v6 picture library (T50-08, owner D178 2026-11-12): ONE fixed flat style for every educational video.
// Every picture is drawn by our own code as SVG (no AI images, no stock photos, no copied art; method from
// REFERENCE_STYLE_relic_explains.md): flat colours, thick dark outlines, no gradients, navy frame + cream panel,
// own recurring character "the trader" (round head, dot eyes) + own whale. Pictures live in a 1000x1000 box.
// Visual types (YOUTUBE_STANDARDS.md rule i): diagram | chart | card | scene. Each draw function = one exact subject.

export const C = { navy: "#1d2748", navy2: "#26335c", cream: "#f6efe2", ink: "#121826", green: "#2fbf86", red: "#ef5b5b", yellow: "#ffc845",
  blue: "#5aa9ff", skin: "#f2c8a0", shirt: "#3bb3a6", grey: "#9aa3b8", white: "#ffffff", whale: "#4f7fd9" };
import { closes as _cl, sma as _sma, rsi as _rsi, macd as _macd, bollinger as _bb, volAvg as _va, findEvent as _fe } from "./v6-ind.mjs";
const SW = 7; // outline width (fixed style)
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const T = (x, y, s, size = 44, fill = C.ink, anchor = "middle", extra = "") =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-family="V" font-weight="700" ${extra}>${esc(s)}</text>`;
const arrowHead = (id, col) => `<marker id="${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker>`;
export const arrow = (x1, y1, x2, y2, col = C.ink, w = 14) => {
  const id = "a" + Math.abs(Math.round(x1 * 7 + y1 * 13 + x2 * 17 + y2 * 19)) + col.slice(1);
  return `<defs>${arrowHead(id, col)}</defs><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" marker-end="url(#${id})"/>`;
};
const check = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><circle r="60" fill="${C.green}" stroke="${C.ink}" stroke-width="${SW}"/><path d="M-28 2L-8 24L30 -22" fill="none" stroke="${C.white}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></g>`;
const cross = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><circle r="60" fill="${C.red}" stroke="${C.ink}" stroke-width="${SW}"/><path d="M-24 -24L24 24M24 -24L-24 24" stroke="${C.white}" stroke-width="16" stroke-linecap="round"/></g>`;

// ---------- candles ----------
// one candle in price units; y(p) maps price -> pixel. hl = highlight ring colour
export function candle(x, o, h, l, c, y, w = 90, opt = {}) {
  const up = c >= o, col = opt.col || (up ? C.green : C.red), top = y(Math.max(o, c)), bot = y(Math.min(o, c));
  const bh = Math.max(8, bot - top);
  return `<g opacity="${opt.fade ? 0.35 : 1}"><line x1="${x}" y1="${y(h)}" x2="${x}" y2="${y(l)}" stroke="${C.ink}" stroke-width="${Math.max(5, w / 9)}" stroke-linecap="round"/>` +
    `<rect x="${x - w / 2}" y="${top}" width="${w}" height="${bh}" rx="${Math.min(10, w / 8)}" fill="${col}" stroke="${C.ink}" stroke-width="${Math.max(4, Math.min(SW, w / 10))}"/></g>`;
}
const lin = (lo, hi, y0 = 860, y1 = 140) => (p) => y0 - ((p - lo) / (hi - lo)) * (y0 - y1);
const HAM = { o: 76, h: 86, l: 22, c: 84 }; // textbook hammer: small body at the top, lower wick ~6x body, tiny upper wick

const DRAW = {
  // big single hammer, parts labelled; part = "body" | "wick" | "both" | null
  hammer({ part = "both", y: yy } = {}) {
    const y = lin(10, 100), { o, h, l, c } = HAM;
    let s = candle(300, o, h, l, c, y, 170);
    if (part === "body" || part === "both") s += `<rect x="190" y="${y(c) - 22}" width="220" height="${y(o) - y(c) + 44}" rx="18" fill="none" stroke="${C.yellow}" stroke-width="12" stroke-dasharray="26 14"/>` + arrow(600, y(80), 440, y(80), C.ink, 12) + T(620, y(80) + 16, "SMALL", 52, C.ink, "start") + T(620, y(80) + 76, "BODY", 52, C.ink, "start");
    if (part === "wick" || part === "both") s += arrow(600, y(45), 340, y(45), C.ink, 12) + T(620, y(48), "LONG", 52, C.ink, "start") + T(620, y(48) + 62, "LOWER", 52, C.ink, "start") + T(620, y(48) + 124, "WICK", 52, C.ink, "start");
    if (part === "wick") s += arrow(600, y(86) - 40, 330, y(86), C.ink, 12) + T(620, y(86) - 26, "HIGH", 52, C.ink, "start") + `<circle cx="300" cy="${y(l)}" r="30" fill="none" stroke="${C.red}" stroke-width="10"/>` + T(380, y(l) + 18, "LOW", 52, C.red, "start");
    if (part === "both") s += T(500, 960, "THE HAMMER", 64);
    return s;
  },
  // body vs wick measured: wick >= 2x body
  ratio() {
    const y = lin(10, 100), { o, h, l, c } = HAM;
    const b = (y(o) - y(c)), bx = 250;
    let s = candle(430, o, h, l, c, y, 170);
    s += `<g stroke="${C.ink}" stroke-width="8" fill="none"><path d="M${bx} ${y(c)}h-30v${b}h30"/></g>` + T(bx - 40, y(c) + b / 2 + 16, "1×", 50, C.ink, "end");
    for (let k = 0; k < 2; k++) s += `<rect x="${bx - 20}" y="${y(o) + k * b}" width="40" height="${b}" fill="${k ? C.yellow : "#ffe39a"}" stroke="${C.ink}" stroke-width="5"/>`;
    s += T(bx - 40, y(o) + b + 16, "2×", 50, C.ink, "end") + `<path d="M${bx} ${y(o) + 2 * b + 14}V${y(l)}" stroke="${C.ink}" stroke-width="6" stroke-dasharray="14 12"/>`;
    s += T(600, y(55), "WICK", 62, C.ink, "start") + T(600, y(55) + 70, "AT LEAST", 50, C.ink, "start") + T(600, y(55) + 150, "2× BODY", 80, C.red, "start");
    return s;
  },
  // force arrows on the hammer: dir "down" = sellers, "up" = buyers
  push({ dir = "down" } = {}) {
    const y = lin(10, 100), { o, h, l, c } = HAM;
    let s = candle(330, o, h, l, c, y, 150, { fade: false });
    if (dir === "down") s += arrow(560, y(84), 560, y(26), C.red, 26) + T(630, y(60), "SELLERS", 60, C.red, "start") + T(630, y(60) + 66, "PUSH", 50, C.ink, "start") + T(630, y(60) + 124, "DOWN", 50, C.ink, "start") + `<circle cx="330" cy="${y(l)}" r="34" fill="none" stroke="${C.red}" stroke-width="10"/>`;
    else s += arrow(560, y(24), 560, y(82), C.green, 26) + T(630, y(55), "BUYERS", 60, C.green, "start") + T(630, y(55) + 66, "PUSH", 50, C.ink, "start") + T(630, y(55) + 124, "BACK UP", 50, C.ink, "start") + `<circle cx="330" cy="${y(c)}" r="40" fill="none" stroke="${C.green}" stroke-width="10"/>` + T(330, y(c) - 60, "CLOSE", 40);
    return s;
  },
  // falling candles ending in a hammer
  downtrend() {
    const y = lin(0, 100), cs = [[92, 95, 80, 82], [82, 85, 70, 72], [72, 74, 58, 60], [60, 63, 46, 48], [48, 50, 36, 38]];
    let s = cs.map((k, i) => candle(110 + i * 130, k[0], k[1], k[2], k[3], y, 80)).join("");
    s += candle(110 + 5 * 130, 36, 40, 8, 39, y, 80) + `<circle cx="760" cy="${y(26)}" r="110" fill="none" stroke="${C.yellow}" stroke-width="12"/>`;
    s += arrow(100, 150, 640, 520, C.red, 16) + T(250, 140, "DOWNTREND", 52, C.red, "start") + T(860, y(26) + 10, "HAMMER", 44, C.ink, "middle", `transform="rotate(-90 860 ${y(26) + 10})"`);
    return s;
  },
  // hammer + next candle closing higher = confirmation
  confirm() {
    const y = lin(0, 100);
    let s = candle(330, 56, 62, 12, 60, y, 140) + candle(610, 60, 88, 58, 85, y, 140);
    s += `<line x1="230" y1="${y(62)}" x2="760" y2="${y(62)}" stroke="${C.ink}" stroke-width="6" stroke-dasharray="18 12"/>` + T(250, y(62) - 20, "HAMMER HIGH", 36, C.ink, "start");
    s += T(330, 930, "HAMMER", 44) + T(610, 930, "NEXT CANDLE", 44) + check(830, y(85));
    return s;
  },
  // stop loss line under the wick low
  stop() {
    const y = lin(0, 100);
    let s = candle(400, 56, 62, 18, 60, y, 150) + candle(640, 60, 80, 58, 77, y, 150, { fade: true });
    s += `<line x1="140" y1="${y(13)}" x2="900" y2="${y(13)}" stroke="${C.red}" stroke-width="10" stroke-dasharray="26 14"/>` + T(140, y(13) + 70, "STOP LOSS", 56, C.red, "start") + T(140, y(13) + 120, "just below the wick", 36, C.ink, "start");
    s += arrow(250, y(28), 250, y(15) - 8, C.red, 12) + T(400, y(18) - 30, "LOW", 36);
    return s;
  },
  // candle anatomy: open, close, high, low
  anatomy() {
    const y = lin(0, 100);
    let s = candle(330, 35, 88, 15, 70, y, 170);
    const lab = (p, t) => `<line x1="430" y1="${y(p)}" x2="600" y2="${y(p)}" stroke="${C.ink}" stroke-width="6"/>` + T(620, y(p) + 16, t, 46, C.ink, "start");
    return s + lab(88, "HIGH") + lab(70, "CLOSE") + lab(35, "OPEN") + lab(15, "LOW");
  },
  // two look-alike shapes for comparison: "hanging" = same shape after an UPtrend (warning) / "inverted" = long UPPER wick
  lookalike({ which = "inverted" } = {}) {
    const y = lin(0, 100);
    let s = candle(280, 76, 86, 22, 84, y, 130) + check(280, 120, 0.7) + T(280, 950, "HAMMER", 44);
    if (which === "inverted") s += candle(700, 24, 84, 18, 30, y, 130) + cross(700, 120, 0.7) + T(700, 950, "UPPER WICK", 44);
    else { const cs = [[30, 33, 22, 28], [28, 45, 26, 43], [43, 60, 41, 58]]; s += cs.map((k, i) => candle(560 + i * 70, k[0], k[1], k[2], k[3], y, 50, { fade: true })).join("") + candle(770, 76, 86, 22, 84, y, 90) + cross(770, 120, 0.7) + T(700, 950, "AFTER A RISE", 44); }
    return s;
  },
};

// ---------- the trader (own recurring character) ----------
export function trader(x, y, s = 1, { mood = "happy", arm = "down", prop = null, shirt = C.shirt } = {}) {
  const eyeY = -168, mouth = mood === "happy" ? `<path d="M-26 -128Q0 -104 26 -128" fill="none" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/>`
    : mood === "worried" ? `<path d="M-24 -112Q0 -132 24 -112" fill="none" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/>` : `<ellipse cx="0" cy="-118" rx="14" ry="18" fill="${C.ink}"/>`;
  const armR = arm === "up" ? `<path d="M52 -40L120 -150" stroke="${C.ink}" stroke-width="30" stroke-linecap="round"/><path d="M52 -40L120 -150" stroke="${C.skin}" stroke-width="16" stroke-linecap="round"/>`
    : arm === "pull" ? `<path d="M52 -30L150 -40" stroke="${C.ink}" stroke-width="30" stroke-linecap="round"/><path d="M52 -30L150 -40" stroke="${C.skin}" stroke-width="16" stroke-linecap="round"/>`
    : `<path d="M56 -40L80 50" stroke="${C.ink}" stroke-width="30" stroke-linecap="round"/><path d="M56 -40L80 50" stroke="${C.skin}" stroke-width="16" stroke-linecap="round"/>`;
  const armL = arm === "pull" ? `<path d="M-52 -30L150 -20" stroke="${C.ink}" stroke-width="30" stroke-linecap="round"/><path d="M-52 -30L150 -20" stroke="${C.skin}" stroke-width="16" stroke-linecap="round"/>`
    : `<path d="M-56 -40L-80 50" stroke="${C.ink}" stroke-width="30" stroke-linecap="round"/><path d="M-56 -40L-80 50" stroke="${C.skin}" stroke-width="16" stroke-linecap="round"/>`;
  const props = {
    magnifier: `<g transform="translate(130 -170)"><circle r="46" fill="#dff1ff" stroke="${C.ink}" stroke-width="${SW}"/><path d="M-32 34L-70 80" stroke="${C.ink}" stroke-width="16" stroke-linecap="round"/></g>`,
    shield: `<path transform="translate(-140 -60)" d="M0 -70L60 -50V0Q60 50 0 80Q-60 50 -60 0V-50Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="${SW}"/>`,
    phone: `<rect x="96" y="-210" width="62" height="110" rx="12" fill="${C.ink}"/><rect x="104" y="-198" width="46" height="80" rx="6" fill="${C.blue}"/>`,
  };
  return `<g transform="translate(${x} ${y}) scale(${s})">` + `<path d="M-60 140V-20Q-60 -60 0 -60Q60 -60 60 -20V140Z" fill="${shirt}" stroke="${C.ink}" stroke-width="${SW}"/>` + armL + armR +
    `<circle cx="0" cy="-150" r="78" fill="${C.skin}" stroke="${C.ink}" stroke-width="${SW}"/><path d="M-74 -170Q-60 -236 0 -232Q64 -236 76 -168Q40 -200 -74 -170Z" fill="${C.ink}"/>` +
    `<circle cx="-26" cy="${eyeY}" r="9" fill="${C.ink}"/><circle cx="26" cy="${eyeY}" r="9" fill="${C.ink}"/>` + mouth + (prop ? props[prop] : "") + `</g>`;
}
export function whale(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-170 0Q-170 -110 -20 -110Q140 -110 170 -10L240 -70L230 40L170 20Q120 90 -20 90Q-170 90 -170 0Z" fill="${C.whale}" stroke="${C.ink}" stroke-width="${SW}"/>` +
    `<path d="M-150 30Q-20 80 140 30" fill="none" stroke="#9fc0ff" stroke-width="10"/><circle cx="-90" cy="-30" r="12" fill="${C.ink}"/><path d="M-70 20Q-50 34 -30 20" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M-40 -110Q-50 -170 -90 -190M-40 -110Q-20 -170 10 -195" fill="none" stroke="${C.blue}" stroke-width="10" stroke-linecap="round"/></g>`;
}
const screen = (x, y, w, h, inner) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="${C.navy2}" stroke="${C.ink}" stroke-width="${SW}"/><g>${inner}</g>`;

// the pattern's own candles, small (hook/clue scenes: the picture must show THIS lesson's pattern, not a hammer; v6c strip fix 2026-11-12)
function miniPattern(key, cx, y0, y1, w) {
  const ks = TEXTBOOK[key].ks, lo = Math.min(...ks.map((k) => k[3])), hi = Math.max(...ks.map((k) => k[2])), y = lin(lo, hi, y1, y0);
  const ww = ks.length > 1 ? Math.min(w, 260 / ks.length) : w, dx = ww * 1.5;
  return ks.map((k, i) => candle(cx + (i - (ks.length - 1) / 2) * dx, k[1], k[2], k[3], k[4], y, ww)).join("");
}
// textbook pattern picture (generic candle lessons, v6-candles.mjs): 4 trend candles + the pattern; focus = trend | shape | next
const TB = (o, h, l, c) => [0, o, h, l, c];
export const TEXTBOOK = {
  shooting_star: { up: true, ks: [TB(101, 105.6, 100.9, 101.6)], next: TB(101.4, 101.6, 98.5, 98.8) },
  doji: { up: false, ks: [TB(85, 87, 83, 85.1)], next: TB(85.1, 87.6, 84.9, 87.3) },
  bull_engulfing: { up: false, ks: [TB(86.5, 86.7, 85.4, 85.6), TB(85.4, 88.4, 85.2, 88.2)], next: TB(88.2, 90, 88, 89.7) },
  bear_engulfing: { up: true, ks: [TB(99.5, 100.7, 99.3, 100.5), TB(100.7, 100.8, 97.6, 97.8)], next: TB(97.8, 98, 96, 96.3) },
  harami: { up: false, ks: [TB(87, 87.2, 82.8, 83), TB(84, 85.3, 83.8, 85)], next: TB(85, 87.4, 84.8, 87.1) },
  tweezer_bottom: { up: false, ks: [TB(86.5, 86.7, 84, 84.6), TB(84.6, 86.8, 84.05, 86.5)], next: TB(86.5, 88.4, 86.3, 88.1) },
  morning_star: { up: false, ks: [TB(86.5, 86.8, 82.8, 83), TB(82.8, 83.2, 82.2, 82.6), TB(82.8, 86.2, 82.6, 86)], next: TB(86, 88, 85.8, 87.7) },
  evening_star: { up: true, ks: [TB(99.5, 103.2, 99.3, 103), TB(103.2, 103.8, 102.9, 103.4), TB(103.2, 103.4, 99.8, 100)], next: TB(100, 100.2, 97.9, 98.2) },
  three_white_soldiers: { up: false, ks: [TB(86, 88.2, 85.8, 88), TB(88, 90.3, 87.8, 90), TB(90, 92.2, 89.8, 92)], next: TB(92, 93.5, 91.7, 93.2) },
};
DRAW.pattern = ({ key, focus = "shape" }) => {
  const P = TEXTBOOK[key], tr = [...Array(4)].map((_, j) => { const c = P.up ? 92 + 2 * j : 94 - 2 * j, o = P.up ? c - 1.6 : c + 1.6; return TB(o, Math.max(o, c) + 0.4, Math.min(o, c) - 0.4, c); });
  const ks = [...tr, ...P.ks, ...(focus === "next" ? [P.next] : [])], lo = Math.min(...ks.map((k) => k[3])), hi = Math.max(...ks.map((k) => k[2]));
  const y = lin(lo - 1, hi + 1, 860, 180), dx = 820 / ks.length, w = Math.min(110, dx * 0.6);
  let s = ks.map((k, i) => candle(90 + dx * (i + 0.5), k[1], k[2], k[3], k[4], y, w, { fade: focus === "shape" && i < 4 })).join("");
  if (focus === "shape") { const a = 90 + dx * 4, b = 90 + dx * (4 + P.ks.length), gH = Math.max(...P.ks.map((k) => k[2])), gL = Math.min(...P.ks.map((k) => k[3])); s += `<rect x="${a}" y="${y(gH) - 30}" width="${b - a}" height="${y(gL) - y(gH) + 60}" rx="30" fill="none" stroke="${C.yellow}" stroke-width="12"/>`; }
  if (focus === "trend") s += arrow(90 + dx * 0.5, y(tr[0][4]) + (P.up ? 60 : -60), 90 + dx * 3.5, y(tr[3][4]) + (P.up ? 60 : -60), P.up ? C.green : C.red, 14);
  if (focus === "next") s += arrow(90 + dx * (ks.length - 1.5), 140, 90 + dx * (ks.length - 0.5), 200, C.ink, 10);
  return s;
};
const CHART = {}; // v6d chart pictures (filled at the end of the file)
const SCENE = {
  // trader surprised in front of a screen with one candle
  hook({ key } = {}) {
    const y = lin(0, 100, 620, 230);
    return screen(380, 140, 560, 560, (TEXTBOOK[key] ? miniPattern(key, 660, 230, 600, 110) : candle(660, 76, 86, 22, 84, y, 110)) + T(660, 670, "?", 70, C.yellow)) + trader(220, 760, 1.15, { mood: "surprised", arm: "up" });
  },
  // tug of war: sellers (red) vs buyers (green); winner = "buyers"
  battle({ winner = "buyers" } = {}) {
    let s = `<line x1="80" y1="560" x2="920" y2="560" stroke="#a0763f" stroke-width="18" stroke-linecap="round"/><line x1="${winner === "buyers" ? 560 : 440}" y1="470" x2="${winner === "buyers" ? 560 : 440}" y2="650" stroke="${C.ink}" stroke-width="8" stroke-dasharray="16 10"/>`;
    s += `<g transform="translate(1000 0) scale(-1 1)">${trader(750, 640, 0.95, { mood: "worried", arm: "pull", shirt: C.red })}</g>` + trader(740, 640, 0.95, { mood: "happy", arm: "pull", shirt: C.green });
    return s + T(250, 900, "SELLERS", 54, C.red) + T(740, 900, "BUYERS", 54, C.green) + arrow(640, 380, 860, 380, C.green, 16);
  },
  // trader with magnifier finds a clue (hammer)
  clue({ key } = {}) {
    const y = lin(0, 100, 640, 300);
    return `<rect x="560" y="230" width="340" height="480" rx="20" fill="${C.white}" stroke="${C.ink}" stroke-width="${SW}"/>` + (TEXTBOOK[key] ? miniPattern(key, 730, 300, 620, 90) : candle(730, 76, 86, 22, 84, y, 90)) + T(730, 680, "CLUE", 52, C.red) +
      trader(300, 780, 1.1, { mood: "happy", arm: "up", prop: "magnifier" });
  },
  // trader with a shield = protect money
  protect() { return trader(380, 780, 1.15, { mood: "happy", prop: "shield" }) + `<g transform="translate(720 520)"><rect x="-130" y="-80" width="260" height="160" rx="24" fill="${C.green}" stroke="${C.ink}" stroke-width="${SW}"/>${T(0, 22, "$", 110, C.white)}</g>`; },
  // trader + whale + phone = follow whales on MarketRadar
  whales() { return whale(640, 380, 1.1) + trader(250, 800, 1.05, { mood: "happy", prop: "phone" }) + T(640, 640, "WHALE MOVES", 54, C.ink); },
  // timeframe: small vs big clock
  timeframe() {
    const clock = (x, y, r, lab) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.white}" stroke="${C.ink}" stroke-width="${SW}"/><path d="M${x} ${y}V${y - r * 0.6}M${x} ${y}H${x + r * 0.45}" stroke="${C.ink}" stroke-width="10" stroke-linecap="round"/>` + T(x, y + r + 70, lab, 52);
    return clock(280, 420, 110, "1 HOUR") + clock(690, 400, 190, "1 DAY") + check(860, 210, 0.8);
  },
};

// ---------- real chart (our own data, v6 style) ----------
// candles [[t,o,h,l,c,v]], hi = index of the candle to circle, mark = "low" | "close" | "after"
export function realChart({ candles, hi, mark = "low", label = "", after = 0, name = "HAMMER", n: pn = 1 }) {
  const ks = candles, lo = Math.min(...ks.map((k) => k[3])), hiP = Math.max(...ks.map((k) => k[2])), pad = (hiP - lo) * 0.08;
  const y = lin(lo - pad, hiP + pad, 880, 200), n = ks.length, dx = 760 / n, w = Math.max(10, dx * 0.62);
  let s = `<rect x="40" y="110" width="920" height="850" rx="18" fill="${C.white}" stroke="${C.ink}" stroke-width="5"/>`;
  s += ks.map((k, i) => candle(70 + dx * (i + 0.5), k[1], k[2], k[3], k[4], y, w, { fade: mark === "after" && i < hi })).join("");
  const hx = 70 + dx * (hi + 0.5), pill = (yy, t, col, px = 60) => `<rect x="${px}" y="${yy - 44}" width="${t.length * 28 + 34}" height="58" rx="12" fill="${C.white}" stroke="${col}" stroke-width="5"/>` + T(px + 17, yy, t, 40, col, "start"), H = ks[hi];
  const G = ks.slice(hi - pn + 1, hi + 1), gH = Math.max(...G.map((k) => k[2])), gL = Math.min(...G.map((k) => k[3]));
  s += `<ellipse cx="${hx - (dx * (pn - 1)) / 2}" cy="${(y(gH) + y(gL)) / 2}" rx="${Math.max(44, dx * (0.9 + 0.5 * pn))}" ry="${(y(gL) - y(gH)) / 2 + 40}" fill="none" stroke="${C.yellow}" stroke-width="12"/>`;
  const fmt = (p) => "$" + Math.round(p).toLocaleString("en-US");
  if (mark === "low") s += `<line x1="70" y1="${y(H[3])}" x2="930" y2="${y(H[3])}" stroke="${C.red}" stroke-width="6" stroke-dasharray="18 12"/>` + pill(y(H[3]) + 70, "LOW " + fmt(H[3]), C.red);
  if (mark === "high") s += `<line x1="70" y1="${y(H[2])}" x2="930" y2="${y(H[2])}" stroke="${C.green}" stroke-width="6" stroke-dasharray="18 12"/>` + pill(y(H[2]) - 30, "HIGH " + fmt(H[2]), C.green);
  if (mark === "close") s += `<line x1="70" y1="${y(H[4])}" x2="930" y2="${y(H[4])}" stroke="${C.green}" stroke-width="6" stroke-dasharray="18 12"/>` + pill(y(H[4]) - 30, "CLOSE " + fmt(H[4]), C.green);
  if (mark === "shape") s += pill(Math.max(180, y(gH) - 70), name, C.ink, Math.max(50, Math.min(hx - 100, 950 - name.length * 28 - 34))) + arrow(Math.min(hx, 820), Math.max(196, y(H[2]) - 56), hx, y(H[2]) - 10, C.ink, 8);
  if (mark === "after") { const j = Math.min(n - 1, hi + after), J = ks[j]; s += arrow(hx + 30, y(H[4]), 70 + dx * (j + 0.5), y(J[4]), J[4] >= H[4] ? C.green : C.red, 12); }
  return s + T(60, 80, label, 40, C.ink, "start");
}

// ---------- keyword / number card icons ----------
const ICON = {
  hammer: () => candle(0, 76, 86, 22, 84, lin(10, 100, 90, -90), 60),
  question: () => `<circle r="80" fill="${C.yellow}" stroke="${C.ink}" stroke-width="${SW}"/>${T(0, 36, "?", 110)}`,
  check: () => check(0, 0, 1.2),
  calendar: () => `<rect x="-80" y="-70" width="160" height="150" rx="16" fill="${C.white}" stroke="${C.ink}" stroke-width="${SW}"/><rect x="-80" y="-70" width="160" height="44" rx="16" fill="${C.red}" stroke="${C.ink}" stroke-width="${SW}"/>`,
  up: () => arrow(-60, 60, 60, -60, C.green, 22),
  down: () => arrow(-60, -60, 60, 60, C.red, 22),
  whale: () => whale(0, 10, 0.42),
};
export function cardSvg(W, H, { big, small = "", icon = "question", cx, cy }) {
  const len = String(big).length, size = Math.min(W > H ? 170 : 150, Math.floor((W > H ? 1500 : 820) / Math.max(4, len * 0.62)));
  return `<g transform="translate(${cx} ${cy - 300}) scale(2)">${(ICON[icon] || ICON.question)()}</g>` + T(cx, cy + size * 0.35, big, size, C.white, "middle") + (small ? T(cx, cy + size * 0.35 + 90, small, 50, C.yellow) : "");
}

export function drawPicture(v, data) {
  if (v.type === "diagram") return DRAW[v.draw](v.args || {});
  if (v.type === "scene") return SCENE[v.draw](v.args || {});
  // real chart: before the reveal only candles up to the hammer are shown; "after" adds the next data.after candles
  if (v.type === "chart" && v.draw !== "real") return CHART[v.draw](v.args || {}, data);
  if (v.type === "chart") { const a = v.args || {}, end = data.hi + (a.mark === "after" ? data.after : 0) + 1; return realChart({ ...a, candles: data.candles.slice(0, end), hi: data.hi, after: data.after, n: data.n || 1, name: a.name || data.name || "HAMMER" }); }
  throw new Error("v6: unknown picture " + JSON.stringify(v));
}
// getters: the v6d pictures below are added after this line (v6d 2026-11-13)
export const KNOWN = { get diagram() { return Object.keys(DRAW); }, get scene() { return Object.keys(SCENE); }, get chart() { return ["real", ...Object.keys(CHART)]; }, get card() { return Object.keys(ICON); }, end: ["end"] };

// ======================= v6d (T50-08 2026-11-13): pictures for the other weekday lesson types =======================
// indicator (diagram/chart "ind"), whale_week + replay + coin + recap (chart whales/split/price/movers), safety (scene "obj").
// Same fixed flat style: thick ink outlines, flat colours, no gradients, own trader + whale; every picture = the sentence's noun.
const usd = (p) => { p = +p; const a = Math.abs(p); return a >= 1e9 ? "$" + (a / 1e9).toFixed(1) + "B" : a >= 1e6 ? "$" + (a / 1e6).toFixed(1) + "M" : a >= 1e4 ? "$" + Math.round(a).toLocaleString("en-US") : a >= 10 ? "$" + a.toFixed(2) : "$" + a.toPrecision(3); };
const pillAt = (x, y, t, col, size = 38) => `<rect x="${x}" y="${y - size - 6}" width="${String(t).length * size * 0.62 + 34}" height="${size + 22}" rx="12" fill="${C.white}" stroke="${col}" stroke-width="5"/>` + T(x + 17, y, t, size, col, "start");
const path = (pts, col, w = 7, dash = "") => { const d = pts.filter((p) => p[1] !== null && !isNaN(p[1])).map((p, j) => (j ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(""); return d ? `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>` : ""; };
const hline = (x1, x2, yy, col, w = 6) => `<line x1="${x1}" y1="${yy}" x2="${x2}" y2="${yy}" stroke="${col}" stroke-width="${w}" stroke-dasharray="18 12"/>`;
// one candle chart with the lesson's indicator. full = all candles (warm-up incl.), w0 = first shown index, w1 = last shown index
export function indChart(full, key, { w0, w1, ring = -1, pills = [], after = -1, labels = false } = {}) {
  const v = _cl(full), panel = ["rsi", "macd", "volume"].includes(key), ks = full.slice(w0, w1 + 1), n = w1 - w0 + 1;
  const ov = key === "moving_average" ? [[_sma(v, 20), C.yellow, "20 AVG"], [_sma(v, 50), C.blue, "50 AVG"]] : key === "bollinger" ? (() => { const b = _bb(v); return [[b.up, C.blue, "UPPER"], [b.mid, C.grey, "MIDDLE"], [b.lo, C.blue, "LOWER"]]; })() : [];
  const seen = [...ks.flatMap((k) => [k[2], k[3]]), ...ov.flatMap(([a]) => a.slice(w0, w1 + 1).filter((x) => x !== null))], lo = Math.min(...seen), hi = Math.max(...seen), pad = (hi - lo) * 0.08;
  const y = lin(lo - pad, hi + pad, panel ? 600 : 880, 200), dx = 840 / n, x = (i) => 80 + dx * (i - w0 + 0.5), w = Math.max(8, dx * 0.62);
  let s = `<rect x="40" y="110" width="920" height="850" rx="18" fill="${C.white}" stroke="${C.ink}" stroke-width="5"/>`;
  s += ks.map((k, j) => candle(x(w0 + j), k[1], k[2], k[3], k[4], y, w, { fade: after >= 0 && w0 + j < ring })).join("");
  ov.forEach(([a, col, lab]) => { s += path(a.slice(w0, w1 + 1).map((p, j) => [x(w0 + j), p === null ? null : y(p)]), col, 8, lab === "MIDDLE" ? "14 10" : ""); if (labels) { const last = a[w1]; if (last !== null) s += pillAt(Math.min(760, x(w1) - 200), y(last) + (lab === "LOWER" || lab === "50 AVG" ? 64 : -18), lab, col === C.yellow ? C.ink : col, 32); } });
  if (panel) {
    s += `<line x1="60" y1="640" x2="940" y2="640" stroke="${C.ink}" stroke-width="4"/>`;
    if (key === "rsi") { const r = _rsi(v), py = lin(0, 100, 920, 660); s += hline(70, 930, py(70), C.red, 5) + hline(70, 930, py(30), C.green, 5) + path(r.slice(w0, w1 + 1).map((p, j) => [x(w0 + j), p === null ? null : py(p)]), C.blue, 7) + T(930, py(70) - 10, "70", 32, C.red, "end") + T(930, py(30) + 36, "30", 32, C.green, "end"); if (labels) s += T(80, py(70) - 10, "TOO HOT", 30, C.red, "start") + T(80, py(30) + 36, "TOO COLD", 30, C.green, "start"); }
    if (key === "macd") { const m = _macd(v), seg = (a) => a.slice(w0, w1 + 1), all = [...seg(m.macd), ...seg(m.signal), ...seg(m.hist)].filter((q) => q !== null), mx = Math.max(1e-9, ...all.map(Math.abs)), py = lin(-mx, mx, 920, 660);
      s += seg(m.hist).map((h, j) => (h === null ? "" : `<rect x="${x(w0 + j) - w / 2}" y="${Math.min(py(0), py(h))}" width="${w}" height="${Math.max(2, Math.abs(py(h) - py(0)))}" fill="${h >= 0 ? C.green : C.red}" opacity="0.6"/>`)).join("") + path(seg(m.macd).map((p, j) => [x(w0 + j), p === null ? null : py(p)]), C.blue, 7) + path(seg(m.signal).map((p, j) => [x(w0 + j), p === null ? null : py(p)]), C.yellow, 7);
      if (labels) s += T(80, 690, "MACD", 32, C.blue, "start") + T(220, 690, "SIGNAL", 32, "#b8860b", "start"); }
    if (key === "volume") { const a = _va(full), vs = ks.map((k) => +k[5] || 0), mx = Math.max(...vs, 1), py = lin(0, mx, 920, 670);
      s += vs.map((q, j) => `<rect x="${x(w0 + j) - w / 2}" y="${py(q)}" width="${w}" height="${920 - py(q)}" fill="${w0 + j === ring ? C.yellow : C.grey}" stroke="${C.ink}" stroke-width="2"/>`).join("") + path(a.slice(w0, w1 + 1).map((p, j) => [x(w0 + j), p === null ? null : py(p)]), C.ink, 5, "12 8");
      if (labels) s += T(80, 700, "VOLUME", 32, C.ink, "start") + T(260, 700, "- - AVERAGE", 30, C.ink, "start"); }
  }
  if (ring >= w0 && ring <= w1) { const K = full[ring]; s += `<ellipse cx="${x(ring)}" cy="${(y(K[2]) + y(K[3])) / 2}" rx="${Math.max(40, dx * 1.2)}" ry="${(y(K[3]) - y(K[2])) / 2 + 40}" fill="none" stroke="${C.yellow}" stroke-width="12"/>`; if (panel) s += `<line x1="${x(ring)}" y1="620" x2="${x(ring)}" y2="930" stroke="${C.yellow}" stroke-width="8" stroke-dasharray="14 10"/>`; }
  if (after >= 0 && ring >= 0) { const A = full[Math.min(w1, ring + after)], H = full[ring]; s += arrow(x(ring) + 30, y(H[4]), x(Math.min(w1, ring + after)), y(A[4]), A[4] >= H[4] ? C.green : C.red, 12); }
  pills.forEach((p, k) => (s += pillAt(p.x ?? 70, p.y ?? 180 + k * 70, p.t, p.col || C.ink)));
  return s;
}
// textbook series per indicator (synthetic, drawn with the real formulas): a slow wave, a sharp fall, then a rebound
function bookSeries(key) {
  const ks = []; let p = 100;
  for (let i = 0; i < 110; i++) {
    const d = key === "moving_average" ? (i < 70 ? -0.55 + 0.9 * Math.sin(i / 4) : 0.9 + 0.7 * Math.sin(i / 3)) : (i < 84 ? 0.25 * Math.sin(i / 5) + 0.05 : i < 93 ? -2.1 : 1.3 + 0.4 * Math.sin(i));
    const o = p; p = Math.max(20, p + d); const vol = key === "volume" && i === 92 ? 900 : 200 + 60 * Math.sin(i * 1.7) + (i > 84 && i < 93 ? 120 : 0);
    ks.push([i, o, Math.max(o, p) + 0.6, Math.min(o, p) - 0.6, p, vol]);
  }
  return ks;
}
DRAW.ind = ({ key, focus = "line" }) => {
  const ks = bookSeries(key), e = _fe(key, ks, 3), sig = focus === "signal" || focus === "next", w1 = sig ? ks.length - 1 : (e ? Math.min(ks.length - 1, e.i + 1) : ks.length - 1), w0 = Math.max(0, w1 - 44);
  return indChart(ks, key, { w0, w1, ring: sig && e ? e.i : -1, labels: focus !== "line", after: focus === "next" && e ? 3 : -1 });
};
// real chart with the lesson's indicator (data.ind = { full, key, i, after, w0 }); mark none | event | value | after
CHART.ind = ({ mark = "none", label = "", pill = "" }, data) => {
  const D = data.ind, w1 = mark === "after" ? Math.min(D.full.length - 1, D.i + D.after) : D.i;
  return indChart(D.full, D.key, { w0: D.w0, w1, ring: mark === "none" ? -1 : D.i, after: mark === "after" ? D.after : -1, labels: mark === "value", pills: pill ? [{ t: pill, col: C.ink, y: 190 }] : [] }) + T(60, 80, label, 40, C.ink, "start");
};
// plain real candles + named price lines (data.price = { ks, lines: { name: { p, text, col } } }); args.lines = names to show
CHART.price = ({ lines = [], label = "", upto = 1 }, data) => {
  const D = data.price, ks = D.ks.slice(0, Math.max(2, Math.round(D.ks.length * upto))), L = lines.map((k) => D.lines[k]).filter(Boolean);
  const all = [...ks.flatMap((k) => [k[2], k[3]]), ...L.map((l) => l.p)], lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.1, y = lin(lo - pad, hi + pad, 880, 220), dx = 840 / ks.length, w = Math.max(8, dx * 0.62);
  let s = `<rect x="40" y="110" width="920" height="850" rx="18" fill="${C.white}" stroke="${C.ink}" stroke-width="5"/>` + ks.map((k, j) => candle(80 + dx * (j + 0.5), k[1], k[2], k[3], k[4], y, w)).join("");
  L.forEach((l, j) => { s += hline(70, 930, y(l.p), l.col, 7) + pillAt(j % 2 ? 520 : 70, y(l.p) + (y(l.p) > 800 ? -24 : 60), l.text, l.col, 36); });
  return s + T(60, 80, label, 40, C.ink, "start");
};
// top whale positions as bars (data.whales = [{ coin, side, value, lev }]); args.i = highlighted row (-1 none)
CHART.whales = ({ i = -1, label = "" }, data) => {
  const W = data.whales.slice(0, 5), mx = Math.max(...W.map((w) => w.value));
  let s = `<rect x="40" y="110" width="920" height="850" rx="18" fill="${C.white}" stroke="${C.ink}" stroke-width="5"/>`;
  W.forEach((w, j) => { const yy = 200 + j * 150, bw = 120 + 480 * (w.value / mx), col = w.side === "long" ? C.green : C.red;
    s += T(80, yy + 70, "#" + (j + 1), 44, C.grey, "start") + `<rect x="170" y="${yy}" width="${bw}" height="100" rx="16" fill="${col}" stroke="${j === i ? C.yellow : C.ink}" stroke-width="${j === i ? 14 : 6}"/>` + T(190, yy + 66, w.coin + " " + w.side.toUpperCase(), 40, C.white, "start") + T(Math.min(780, 190 + bw), yy + 66, usd(w.value), 40, C.ink, "start"); });
  return s + T(60, 80, label, 40, C.ink, "start");
};
// long vs short crowd (data.crowd = { nL, nS, longV, shortV }); args.by = "count" | "money"
CHART.split = ({ by = "count", label = "" }, data) => {
  const c = data.crowd, a = by === "count" ? c.nL : c.longV, b = by === "count" ? c.nS : c.shortV, f = a / Math.max(1e-9, a + b), xm = 80 + 840 * f;
  const fa = by === "count" ? c.nL + " LONG" : usd(c.longV), fb = by === "count" ? c.nS + " SHORT" : usd(c.shortV);
  return `<rect x="40" y="110" width="920" height="850" rx="18" fill="${C.white}" stroke="${C.ink}" stroke-width="5"/><rect x="80" y="420" width="${xm - 80}" height="200" fill="${C.green}" stroke="${C.ink}" stroke-width="6"/><rect x="${xm}" y="420" width="${920 - xm}" height="200" fill="${C.red}" stroke="${C.ink}" stroke-width="6"/>` +
    T(80, 380, "LONGS", 52, C.green, "start") + T(920, 380, "SHORTS", 52, C.red, "end") + T(80, 720, fa, 56, C.ink, "start") + T(920, 720, fb, 56, C.ink, "end") + T(500, 850, Math.round(f * 100) + "% LONG", 64, f >= 0.5 ? C.green : C.red) + T(60, 80, label, 40, C.ink, "start");
};
// weekly % change bars (data.movers = [{ coin, pct }]); args.i = highlighted bar
CHART.movers = ({ i = -1, label = "" }, data) => {
  const M = data.movers, mx = Math.max(1, ...M.map((m) => Math.abs(m.pct))), y = lin(-mx, mx, 860, 240), dx = 840 / M.length;
  let s = `<rect x="40" y="110" width="920" height="850" rx="18" fill="${C.white}" stroke="${C.ink}" stroke-width="5"/><line x1="70" y1="${y(0)}" x2="930" y2="${y(0)}" stroke="${C.ink}" stroke-width="5"/>`;
  M.forEach((m, j) => { const x0 = 80 + dx * j + dx * 0.15, bw = dx * 0.7; s += `<rect x="${x0}" y="${Math.min(y(0), y(m.pct))}" width="${bw}" height="${Math.max(4, Math.abs(y(m.pct) - y(0)))}" fill="${m.pct >= 0 ? C.green : C.red}" stroke="${j === i ? C.yellow : C.ink}" stroke-width="${j === i ? 12 : 5}"/>` +
    T(x0 + bw / 2, m.pct >= 0 ? y(0) + 50 : y(0) - 20, m.coin, Math.min(36, dx * 0.4), C.ink) + T(x0 + bw / 2, m.pct >= 0 ? y(m.pct) - 16 : y(m.pct) + 44, (m.pct >= 0 ? "+" : "") + m.pct.toFixed(1) + "%", Math.min(32, dx * 0.36), C.ink); });
  return s + T(60, 80, label, 40, C.ink, "start");
};

// object library for safety / whale / coin scenes (own flat drawings, centred at 0,0, ~300 px)
const R = (x, y, w, h, f, rx = 18) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" stroke="${C.ink}" stroke-width="${SW}"/>`;
export const OBJ = {
  phone: () => R(-90, -160, 180, 320, C.ink, 26) + R(-72, -130, 144, 240, C.blue, 10) + `<circle cy="135" r="10" fill="${C.grey}"/>`,
  seed: () => R(-130, -160, 260, 320, C.white, 10) + [...Array(6)].map((_, j) => T(-100, -110 + j * 50, (j + 1) + ". ●●●●", 30, C.ink, "start")).join("") + T(0, 150, "12 WORDS", 30, C.red),
  lock: () => `<path d="M-60 -20V-70Q-60 -130 0 -130Q60 -130 60 -70V-20" fill="none" stroke="${C.ink}" stroke-width="26"/>` + R(-100, -30, 200, 170, C.yellow, 20) + `<circle cy="40" r="20" fill="${C.ink}"/><rect x="-7" y="40" width="14" height="50" fill="${C.ink}"/>`,
  link: () => R(-170, -50, 340, 100, C.white, 50) + T(-140, 14, "https://binnance-…", 34, C.red, "start"),
  hook: () => `<path d="M0 -150V60Q0 120 -60 120Q-110 120 -110 60" fill="none" stroke="${C.grey}" stroke-width="22" stroke-linecap="round"/><path d="M-110 60l-26 -40" stroke="${C.grey}" stroke-width="22" stroke-linecap="round"/><line x1="0" y1="-150" x2="0" y2="-260" stroke="${C.ink}" stroke-width="6"/>`,
  mail: () => R(-160, -100, 320, 210, C.white, 12) + `<path d="M-160 -96L0 30L160 -96" fill="none" stroke="${C.ink}" stroke-width="${SW}"/>`,
  chat: () => `<path d="M-160 -110H160Q180 -110 180 -90V50Q180 70 160 70H-40L-110 130V70H-160Q-180 70 -180 50V-90Q-180 -110 -160 -110Z" fill="${C.white}" stroke="${C.ink}" stroke-width="${SW}"/>` + T(0, -30, "\"ADMIN\"", 44, C.red) + T(0, 30, "send me your key", 30, C.ink),
  gift: () => R(-120, -40, 240, 170, C.red, 10) + R(-140, -90, 280, 60, C.red, 10) + `<rect x="-18" y="-90" width="36" height="220" fill="${C.yellow}" stroke="${C.ink}" stroke-width="5"/>` + `<path d="M0 -90Q-70 -170 -80 -110Q-80 -90 0 -90Q80 -90 80 -110Q70 -170 0 -90" fill="${C.yellow}" stroke="${C.ink}" stroke-width="5"/>`,
  rug: () => `<path d="M-200 60Q-60 20 80 60Q160 80 200 20L210 110L-200 120Z" fill="${C.red}" stroke="${C.ink}" stroke-width="${SW}"/>` + arrow(140, 40, 260, -10, C.ink, 12) + T(-40, 100, "RUG", 44, C.white),
  rocket: () => `<path d="M0 -170Q70 -90 60 60H-60Q-70 -90 0 -170Z" fill="${C.white}" stroke="${C.ink}" stroke-width="${SW}"/><circle cy="-60" r="28" fill="${C.blue}" stroke="${C.ink}" stroke-width="5"/><path d="M-60 20L-110 90L-55 70M60 20L110 90L55 70" fill="${C.red}" stroke="${C.ink}" stroke-width="5"/><path d="M-30 64Q0 160 30 64" fill="${C.yellow}" stroke="${C.ink}" stroke-width="5"/>`,
  bank: () => `<path d="M-180 -60L0 -160L180 -60Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="${SW}"/>` + [-130, -45, 45, 130].map((x) => R(x - 22, -50, 44, 160, C.white, 4)).join("") + R(-190, 110, 380, 40, C.cream, 4),
  key: () => `<circle cx="-90" cy="0" r="60" fill="${C.yellow}" stroke="${C.ink}" stroke-width="${SW}"/><circle cx="-90" cy="0" r="20" fill="${C.cream}" stroke="${C.ink}" stroke-width="5"/>` + R(-34, -18, 230, 36, C.yellow, 8) + R(140, 10, 22, 50, C.yellow, 4) + R(100, 10, 22, 40, C.yellow, 4),
  shield: () => `<path d="M0 -150L120 -110V0Q120 100 0 160Q-120 100 -120 0V-110Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="${SW}"/>` + check(0, 0, 0.9),
  coins: () => [[-70, 60], [0, 30], [70, 0], [0, -30]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="80" ry="34" fill="${C.yellow}" stroke="${C.ink}" stroke-width="${SW}"/>`).join("") + T(0, -20, "$", 44, C.ink),
  hacker: () => `<path d="M-120 160V40Q-120 -150 0 -150Q120 -150 120 40V160Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="${SW}"/><ellipse cy="-30" rx="70" ry="80" fill="#2a2f3d"/><circle cx="-26" cy="-40" r="10" fill="${C.red}"/><circle cx="26" cy="-40" r="10" fill="${C.red}"/>`,
  clock: () => `<circle r="140" fill="${C.white}" stroke="${C.ink}" stroke-width="${SW}"/><path d="M0 0V-90M0 0H70" stroke="${C.ink}" stroke-width="14" stroke-linecap="round"/>`,
  code: () => R(-170, -70, 340, 140, C.white, 20) + T(0, 26, "482 913", 76, C.ink) + T(0, -88, "2FA CODE", 34, C.green),
  chart_up: () => R(-170, -140, 340, 280, C.white, 16) + path([[-140, 100], [-70, 40], [0, 70], [70, -20], [140, -100]], C.green, 14),
  chart_down: () => R(-170, -140, 340, 280, C.white, 16) + path([[-140, -100], [-70, -30], [0, -60], [70, 40], [140, 110]], C.red, 14),
  warn: () => `<path d="M0 -150L160 130H-160Z" fill="${C.yellow}" stroke="${C.ink}" stroke-width="${SW}" stroke-linejoin="round"/>` + T(0, 90, "!", 170, C.ink),
  seesaw: () => `<path d="M-40 120L0 40L40 120Z" fill="${C.grey}" stroke="${C.ink}" stroke-width="${SW}"/><line x1="-200" y1="80" x2="200" y2="0" stroke="${C.ink}" stroke-width="20" stroke-linecap="round"/>` + R(-190, 0, 70, 60, C.green, 8) + R(120, -120, 90, 110, C.red, 8) + T(165, -50, "×10", 34, C.white),
  wallet: () => R(-170, -100, 340, 210, "#8a5a2b", 24) + R(60, -30, 130, 70, "#a8743d", 16) + `<circle cx="100" cy="5" r="12" fill="${C.yellow}"/>`,
  whale: () => whale(0, 0, 0.8),
  crowd: () => [-120, 0, 120].map((x) => `<circle cx="${x}" cy="-60" r="44" fill="${C.skin}" stroke="${C.ink}" stroke-width="${SW}"/><path d="M${x - 60} 120V20Q${x - 60} -10 ${x} -10Q${x + 60} -10 ${x + 60} 20V120Z" fill="${C.shirt}" stroke="${C.ink}" stroke-width="${SW}"/>`).join(""),
  calendar: () => R(-150, -130, 300, 260, C.white, 18) + R(-150, -130, 300, 70, C.red, 18) + [...Array(6)].map((_, j) => `<rect x="${-120 + (j % 3) * 85}" y="${-30 + Math.floor(j / 3) * 70}" width="60" height="44" rx="6" fill="${j === 4 ? C.yellow : C.cream}" stroke="${C.ink}" stroke-width="4"/>`).join(""),
  coin: () => `<circle r="140" fill="${C.yellow}" stroke="${C.ink}" stroke-width="${SW}"/><circle r="100" fill="none" stroke="${C.ink}" stroke-width="5"/>`,
  magnifier: () => `<circle cx="-30" cy="-30" r="110" fill="#dff1ff" stroke="${C.ink}" stroke-width="${SW * 1.5}"/><path d="M50 50L150 150" stroke="${C.ink}" stroke-width="34" stroke-linecap="round"/>`,
};
const MARK = { cross: (x, y) => cross(x, y, 1.1), check: (x, y) => check(x, y, 1.1), warn: (x, y) => `<g transform="translate(${x} ${y}) scale(0.5)">${OBJ.warn()}</g>` };
// trader + one or two objects (+ a red cross / green check / warning), args: { a, b, mark, mood, label, text }
SCENE.obj = ({ a, b, mark, mood = "happy", label = "", text = "" } = {}) => {
  let s = trader(220, 800, 1.0, { mood, arm: mood === "worried" ? "down" : "up" });
  const put = (k, x, y, sc) => `<g transform="translate(${x} ${y}) scale(${sc})">${(OBJ[k] || OBJ.warn)()}</g>`;
  s += b ? put(a, 600, 330, 0.95) + put(b, 720, 650, 0.95) : put(a, 650, 440, 1.35);
  if (text) s += T(650, b ? 870 : 760, text, 40, C.ink);
  if (mark) s += MARK[mark](880, 170);
  return s + (label ? T(640, 950, label, 52, C.ink) : "");
};
for (const k of Object.keys(OBJ)) if (!ICON[k]) ICON[k] = () => `<g transform="scale(0.5)">${OBJ[k]()}</g>`;
