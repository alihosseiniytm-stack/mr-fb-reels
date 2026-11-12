// v6 picture library (T50-08, owner D178 2026-11-12): ONE fixed flat style for every educational video.
// Every picture is drawn by our own code as SVG (no AI images, no stock photos, no copied art; method from
// REFERENCE_STYLE_relic_explains.md): flat colours, thick dark outlines, no gradients, navy frame + cream panel,
// own recurring character "the trader" (round head, dot eyes) + own whale. Pictures live in a 1000x1000 box.
// Visual types (YOUTUBE_STANDARDS.md rule i): diagram | chart | card | scene. Each draw function = one exact subject.

export const C = { navy: "#1d2748", navy2: "#26335c", cream: "#f6efe2", ink: "#121826", green: "#2fbf86", red: "#ef5b5b", yellow: "#ffc845",
  blue: "#5aa9ff", skin: "#f2c8a0", shirt: "#3bb3a6", grey: "#9aa3b8", white: "#ffffff", whale: "#4f7fd9" };
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
const SCENE = {
  // trader surprised in front of a screen with one candle
  hook() {
    const y = lin(0, 100, 620, 230);
    return screen(380, 140, 560, 560, candle(660, 76, 86, 22, 84, y, 110) + T(660, 670, "?", 70, C.yellow)) + trader(220, 760, 1.15, { mood: "surprised", arm: "up" });
  },
  // tug of war: sellers (red) vs buyers (green); winner = "buyers"
  battle({ winner = "buyers" } = {}) {
    let s = `<line x1="80" y1="560" x2="920" y2="560" stroke="#a0763f" stroke-width="18" stroke-linecap="round"/><line x1="${winner === "buyers" ? 560 : 440}" y1="470" x2="${winner === "buyers" ? 560 : 440}" y2="650" stroke="${C.ink}" stroke-width="8" stroke-dasharray="16 10"/>`;
    s += `<g transform="translate(1000 0) scale(-1 1)">${trader(750, 640, 0.95, { mood: "worried", arm: "pull", shirt: C.red })}</g>` + trader(740, 640, 0.95, { mood: "happy", arm: "pull", shirt: C.green });
    return s + T(250, 900, "SELLERS", 54, C.red) + T(740, 900, "BUYERS", 54, C.green) + arrow(640, 380, 860, 380, C.green, 16);
  },
  // trader with magnifier finds a clue (hammer)
  clue() {
    const y = lin(0, 100, 640, 300);
    return `<rect x="560" y="230" width="340" height="480" rx="20" fill="${C.white}" stroke="${C.ink}" stroke-width="${SW}"/>` + candle(730, 76, 86, 22, 84, y, 90) + T(730, 680, "CLUE", 52, C.red) +
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
  if (v.type === "chart") { const a = v.args || {}, end = data.hi + (a.mark === "after" ? data.after : 0) + 1; return realChart({ ...a, candles: data.candles.slice(0, end), hi: data.hi, after: data.after, n: data.n || 1, name: a.name || data.name || "HAMMER" }); }
  throw new Error("v6: unknown picture " + JSON.stringify(v));
}
export const KNOWN = { diagram: Object.keys(DRAW), scene: Object.keys(SCENE), chart: ["real"], card: Object.keys(ICON), end: ["end"] };
