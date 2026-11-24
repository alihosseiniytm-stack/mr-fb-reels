// v6 one-off Short (T40-24 video, owner D330, worker t40-24-video 2026-11-24): "TradingView free plan 30-drawing cap".
// Same v6 METHOD as v6-types.mjs safety lessons: one sentence = one code-drawn picture (scene "obj" + own objects below), own
// trader + mascot, no screen recording of their site (brief: real TradingView UI is NOT filmed; these are our own simple drawings).
// FACTS (R10, checked live 2026-11-24 ~21:35Z, curl 200):
//  [official] tradingview.com/pricing/ table row "Drawings per chart | 30" (Basic); paid plans "Unlimited drawings".
//  [official] tradingview.com/support/solutions/43000473337 : Object tree -> "Manage layout drawings" -> 3 tabs Synced globally /
//             Synced in layout / Not synced; "Alerts set on the drawings will be removed too."; drawings on other symbols stay.
//  [user reports, dated] since ~2026-11-17 (Reddit r/TradingView 11-23, FinanceFeeds 11-2026); popup "33" on an empty chart counting
//             hidden objects + other symbols (Pineify 2026-11-23/24). No official TradingView announcement found.
//  [own file] free Pine script (whale-alert-worker/checkpoints/research_tv30_pine_sr_levels_v6.pine = article code block): 8 level
//             slots + 4 zone slots in ONE indicator (free plan = 2 indicators per chart [official pricing]).
// Article (lane 2, slug tradingview-drawing-limit): URL from env ARTICLE_URL (workflow input), default the EN article.
import { C, T, OBJ } from "./v6-draw.mjs";

const SW = 7;
const R = (x, y, w, h, f, rx = 18) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" stroke="${C.ink}" stroke-width="${SW}"/>`;
const L = (x1, y1, x2, y2, col, w = 8, dash = "") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
const grid = () => R(-200, -150, 400, 300, C.white, 16) + [-90, 0, 90].map((y) => L(-180, y, 180, y, "#e3e6ee", 3)).join("");
const cross = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${L(-40, -40, 40, 40, C.red, 18)}${L(40, -40, -40, 40, C.red, 18)}</g>`;

// own objects (added to the shared OBJ table at import time; v6-draw.mjs itself is not changed)
const TV = {
  // empty chart + popup with a big counter "33 / 30"
  tv_popup: () => grid() + R(-150, -80, 300, 170, C.cream, 20) + T(0, -30, "DRAWINGS", 34, C.ink) + T(0, 60, "33 / 30", 84, C.red),
  // calendar page "NOV 17" + a small 30 badge
  tv_since: () => R(-150, -130, 300, 260, C.white, 18) + R(-150, -130, 300, 70, C.red, 18) + T(0, -80, "NOV", 44, C.white) + T(0, 60, "17", 130, C.ink) +
    `<circle cx="150" cy="120" r="62" fill="${C.yellow}" stroke="${C.ink}" stroke-width="${SW}"/>` + T(150, 140, "30", 56, C.ink),
  // price table: FREE 30 vs PAID unlimited
  tv_table: () => R(-210, -150, 420, 300, C.white, 18) + L(0, -150, 0, 150, C.ink, SW) + L(-210, -70, 210, -70, C.ink, SW) +
    T(-105, -95, "FREE", 40, C.ink) + T(105, -95, "PAID", 40, C.ink) + T(-105, 60, "30", 110, C.red) + T(105, 60, "∞", 130, C.green),
  // eye with a slash = hidden drawing, dashed line behind
  tv_hidden: () => grid() + L(-170, 90, 170, -90, C.blue, 8, "16 12") +
    `<ellipse cx="0" cy="0" rx="130" ry="72" fill="${C.white}" stroke="${C.ink}" stroke-width="${SW}"/><circle r="40" fill="${C.ink}"/>` + L(-120, 90, 120, -90, C.red, 16),
  // three small charts (other symbols), each with lines on it
  tv_symbols: () => [[-150, "BTC"], [0, "ETH"], [150, "SOL"]].map(([x, s]) => R(x - 68, -110, 136, 200, C.white, 12) + L(x - 50, -30, x + 50, -70, C.blue, 6) + L(x - 50, 40, x + 50, 40, C.red, 6) + T(x, 140, s, 34, C.ink)).join(""),
  // tree panel: header + 4 rows
  tv_tree: () => R(-170, -170, 340, 340, C.white, 16) + R(-170, -170, 340, 70, C.yellow, 16) + T(0, -122, "OBJECT TREE", 34, C.ink) +
    [0, 1, 2, 3].map((j) => L(-120, -50 + j * 60, -120, -50 + j * 60, C.ink, 18) + L(-90, -50 + j * 60, 120, -50 + j * 60, C.grey, 10)).join(""),
  // dialog with a "manage" button highlighted
  tv_manage: () => R(-190, -150, 380, 300, C.white, 16) + T(0, -95, "MANAGE", 40, C.ink) + T(0, -50, "LAYOUT DRAWINGS", 30, C.ink) +
    R(-130, 10, 260, 90, C.green, 45) + T(0, 70, "OPEN", 44, C.white),
  // three tabs + a bin
  tv_tabs: () => [[-140, "GLOBAL"], [0, "LAYOUT"], [140, "NOT SYNCED"]].map(([x, s], j) => R(x - 66, -150, 132, 70, j ? C.white : C.yellow, 12) + T(x, -105, s, s.length > 6 ? 18 : 24, C.ink)).join("") +
    R(-210, -80, 420, 150, C.white, 12) + `<path d="M-50 100H50L40 210H-40Z" fill="${C.grey}" stroke="${C.ink}" stroke-width="${SW}"/>` + R(-62, 82, 124, 20, C.grey, 6) + T(0, -20, "3 TABS", 44, C.ink),
  // bell = alert, crossed out
  tv_alert: () => `<path d="M-90 60Q-90 -110 0 -110Q90 -110 90 60L120 100H-120Z" fill="${C.yellow}" stroke="${C.ink}" stroke-width="${SW}" stroke-linejoin="round"/><circle cy="120" r="24" fill="${C.ink}"/>` + cross(0, -10, 1.3),
  // paper list of alerts with a pen
  tv_note: () => R(-140, -170, 280, 340, C.white, 10) + T(0, -110, "MY ALERTS", 34, C.red) + [0, 1, 2].map((j) => L(-100, -40 + j * 70, 100, -40 + j * 70, C.ink, 6)).join("") +
    `<path d="M120 140L200 -20L230 -5L150 155Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="${SW}"/>`,
  // chart with 8 level lines + 4 zones, from one script
  tv_levels: () => grid() + [-120, -90, -60, -30, 30, 60, 90, 120].map((y, j) => L(-180, y, 180, y, j < 4 ? C.red : C.green, 5)).join("") +
    [[-180, -140], [20, -140], [-180, 100], [20, 100]].map(([x, y], j) => `<rect x="${x}" y="${y}" width="160" height="40" fill="${j < 2 ? C.red : C.green}" fill-opacity="0.35"/>`).join(""),
  // one indicator slot (filled) next to drawing slots (empty, untouched)
  tv_slot: () => R(-210, -60, 160, 120, C.green, 16) + T(-130, 18, "1", 70, C.white) + T(-130, 110, "SCRIPT", 30, C.ink) +
    [0, 1, 2].map((j) => R(-10 + j * 75, -40, 60, 80, C.white, 10)).join("") + T(95, 110, "DRAWINGS", 30, C.ink),
  // guide page + 7 language dots
  tv_guide: () => R(-150, -180, 300, 300, C.white, 14) + T(0, -120, "GUIDE", 44, C.ink) + [0, 1, 2].map((j) => L(-110, -60 + j * 55, 110, -60 + j * 55, C.grey, 8)).join("") +
    [...Array(7)].map((_, j) => `<circle cx="${-150 + j * 50}" cy="175" r="20" fill="${[C.red, C.green, C.blue, C.yellow, C.shirt, C.whale, C.grey][j]}" stroke="${C.ink}" stroke-width="5"/>`).join(""),
};
Object.assign(OBJ, TV);

const st = (say, kw, tags, a, b, mark, mood) => ({ chapter: "", say, kw, tags: tags.split(" "), visual: { type: "scene", draw: "obj", args: { a, ...(b ? { b } : {}), ...(mark ? { mark } : {}), ...(mood ? { mood } : {}) } } });
export const ARTICLE_DEFAULT = "https://marketradarwhale.com/en/tradingview-drawing-limit/";

export async function tv30Data() {
  const url = process.env.ARTICLE_URL || ARTICLE_DEFAULT;
  return { type: "tv30", key: "tv30", name: "30 DRAWINGS", coin: "", url,
    descTop: url === ARTICLE_DEFAULT || /tradingview-drawing-limit/.test(url) ? `Full guide in 7 languages + the free Pine script (8 levels + 4 zones in one indicator): ${url}`
      : `The full guide (7 languages) + the free Pine script (8 levels + 4 zones in one indicator) are being published on MarketRadar Whale: ${url}`,
    desc: "Facts: TradingView pricing page (Basic: 30 drawings per chart) and TradingView help article on removing drawings, both checked 24 Nov 2026; user reports since 17 Nov 2026. TradingView has not published an announcement. Not affiliated with TradingView." };
}

export function tv30Lesson(kind) {
  const steps = [
    st("Your chart is empty, but it says 33 drawings.", "EMPTY CHART · 33 DRAWINGS", "chart drawings", "tv_popup", null, "warn", "surprised"),
    st("Since November 17, free users report a 30 cap.", "30 CAP SINCE NOV 17", "users cap", "tv_since", null, null, "worried"),
    st("The free plan lists 30 drawings per chart.", "30 PER CHART", "plan chart", "tv_table"),
    st("But hidden drawings still count.", "HIDDEN ONES COUNT", "hidden count", "tv_hidden", null, "warn"),
    st("So do drawings on other symbols.", "OTHER SYMBOLS COUNT", "symbols drawings", "tv_symbols", null, "warn", "surprised"),
    st("The fix, step 1: open the Object tree.", "FIX 1 · OBJECT TREE", "fix tree", "tv_tree"),
    st("Step 2: click Manage layout drawings.", "2 · MANAGE LAYOUT DRAWINGS", "manage layout", "tv_manage"),
    st("Step 3: clear old lines in all 3 tabs.", "3 · CLEAR ALL 3 TABS", "clear tabs", "tv_tabs", null, "check"),
    st("Careful: their alerts get deleted too.", "ALERTS GET DELETED", "alerts careful", "tv_alert", null, "warn", "worried"),
    st("Write your alerts down first.", "WRITE ALERTS DOWN", "alerts write", "tv_note", null, "check"),
    st("Bonus: our free script draws 8 levels and 4 zones.", "8 LEVELS + 4 ZONES", "script levels", "tv_levels", null, null, "happy"),
    st("It uses one indicator slot, not drawings.", "ONE INDICATOR SLOT", "indicator slot", "tv_slot", null, "check"),
    st("Full guide in 7 languages, link below.", "FULL GUIDE · 7 LANGUAGES", "guide languages", "tv_guide"),
    { chapter: "", say: "Free guides and whale moves on MarketRadar Whale.", kw: "MARKETRADARWHALE.COM", tags: ["whale"], visual: { type: "end", draw: "end", args: {} } },
  ];
  return { title: "TradingView Free Plan: Why an Empty Chart Says 33 Drawings (Fix)", steps };
}

export const TV30_TOPIC = { tv30: { data: tv30Data, lesson: tv30Lesson, label: "CHART TIPS", type: "tv30" } };
