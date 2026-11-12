// v6 lesson: the hammer candle (owner's own example, 2026-11-04T14:55Z). One step = one sentence = one tagged picture.
// The real example is found in REAL Bitcoin daily candles at render time (public candle feed, lib.getCandles), never invented.
import { getCandles } from "./lib.mjs";

// textbook rule used on screen: lower wick >= 2x body, tiny upper wick, after a fall; confirmation = next candle closes higher
export function isHammer(k) {
  const [, o, h, l, c] = k, body = Math.abs(c - o), range = h - l, lower = Math.min(o, c) - l, upper = h - Math.max(o, c);
  return range > 0 && body >= range * 0.04 && lower >= 2 * body && upper <= Math.max(body * 0.5, range * 0.08);
}
export function findHammer(ks, after = 5, big = 1.2) {
  for (let i = ks.length - 1 - after; i >= 8; i--) {
    if (!isHammer(ks[i])) continue;
    const fell = ks[i - 1][4] < ks[i - 6][4], confirmed = ks[i + 1][4] > ks[i][4];
    const avg = ks.slice(i - 8, i).reduce((x, k) => x + k[2] - k[3], 0) / 8; // a clear hammer: bigger than the recent candles
    if (fell && confirmed && ks[i][2] - ks[i][3] >= big * avg) return i;
  }
  return -1;
}
export async function hammerData(after = 5) {
  const cache = {};
  for (const [iv, bars, big] of [["1d", 400, 1.2], ["4h", 600, 1.2], ["1d", 400, 0], ["4h", 600, 0]]) { // clearest hammer first
    const all = cache[iv] || (cache[iv] = await getCandles("BTC", iv, bars)), i = findHammer(all, after, big);
    if (i < 0) continue;
    const a = Math.max(0, i - 10), candles = all.slice(a, i + after + 1), hi = i - a, H = all[i], A = all[i + after];
    const d = new Date(H[0]);
    return { iv, candles, hi, after, H, A, month: d.toLocaleString("en-US", { month: "long", timeZone: "UTC" }), day: d.getUTCDate(),
      low: Math.round(H[3]), close: Math.round(H[4]), pct: +((A[4] / H[4] - 1) * 100).toFixed(1) };
  }
  throw new Error("no confirmed hammer in the last 400 daily / 600 4h BTC candles");
}
const n = (x) => Math.round(x).toLocaleString("en-US");

export function hammerLesson(kind, D) {
  const MON = D.month.slice(0, 3).toUpperCase(), unit = D.iv === "1d" ? "days" : "candles", up = D.pct >= 0;
  const step = (chapter, say, kw, tags, type, draw, args, sub) => ({ chapter, say, kw, tags, visual: { type, draw, args }, sub });
  const ex = [
    step("Real example", `Real example: on ${D.month} ${D.day}, Bitcoin fell to ${n(D.low)} dollars.`, `${MON} ${D.day}: LOW $${n(D.low)}`, ["bitcoin", "fell"], "chart", "real", { mark: "low", label: `BITCOIN · ${D.iv === "1d" ? "DAILY" : "4H"} CANDLES` }),
    step("Real example", `But it closed at ${n(D.close)} dollars. That is a hammer.`, `CLOSE $${n(D.close)}`, ["closed", "hammer"], "chart", "real", { mark: "close", label: "SAME CANDLE: THE CLOSE" }),
    step("Real example", `${D.after} ${unit} later, Bitcoin was ${Math.abs(D.pct)} percent ${up ? "higher" : "lower"}.`, `${up ? "+" : "-"}${Math.abs(D.pct)}% IN ${D.after} ${unit.toUpperCase()}`, ["bitcoin", up ? "higher" : "lower"], "chart", "real", { mark: "after", label: `${D.after} ${unit.toUpperCase()} LATER` }),
  ];
  if (kind === "short") return {
    title: "Hammer Candle Explained: A Real Bitcoin Example",
    steps: [
      step("", "This one candle can warn you that a fall may be ending.", "ONE CANDLE, BIG CLUE", ["candle", "fall"], "scene", "hook"),
      step("", "Traders call it the hammer.", "HAMMER", ["hammer"], "card", "hammer", { icon: "hammer" }),
      step("", "It has a small body near the top.", "SMALL BODY ON TOP", ["body", "top"], "diagram", "hammer", { part: "body" }),
      step("", "Its lower wick is long, at least 2 times the body.", "WICK ≥ 2× BODY", ["wick", "body"], "diagram", "ratio"),
      step("", "That wick means sellers pushed the price down hard.", "SELLERS PUSHED DOWN", ["sellers", "down"], "diagram", "push", { dir: "down" }),
      step("", "But buyers pushed it back up before the candle closed.", "BUYERS PUSHED BACK", ["buyers", "back"], "diagram", "push", { dir: "up" }),
      step("", "So the buyers won this battle.", "BUYERS WON", ["buyers", "battle"], "scene", "battle"),
      step("", "A hammer matters most at the end of a downtrend.", "AFTER A DOWNTREND", ["downtrend"], "diagram", "downtrend"),
      ...ex,
      step("", "Wait for the next candle to close higher. That is confirmation.", "WAIT FOR CONFIRMATION", ["confirmation", "next"], "diagram", "confirm"),
      step("", "Put your stop loss just below the wick.", "STOP LOSS UNDER THE WICK", ["stop", "wick"], "diagram", "stop"),
      step("", "A hammer is a clue, never a promise.", "A CLUE, NOT A PROMISE", ["clue"], "scene", "clue"),
      step("", "Watch live whale moves for free on MarketRadar Whale.", "MARKETRADARWHALE.COM", ["whale"], "end", "end"),
    ],
  };
  return {
    title: "The Hammer Candle for Beginners: Shape, Meaning and a Real Bitcoin Example",
    steps: [
      step("Intro", "This one candle can warn you that a fall may be ending.", "ONE CANDLE, BIG CLUE", ["candle", "fall"], "scene", "hook"),
      step("Intro", "Traders call it the hammer.", "HAMMER", ["hammer"], "card", "hammer", { icon: "hammer" }),
      step("Intro", "Today you learn its shape, its meaning, and how to use it.", "SHAPE · MEANING · USE", ["shape", "meaning"], "card", "question", { icon: "question" }),
      step("Candle basics", "First, every candle shows four prices.", "4 PRICES", ["four", "prices"], "card", "calendar", { icon: "calendar" }, "open · high · low · close"),
      step("Candle basics", "The body runs from the open to the close.", "BODY = OPEN TO CLOSE", ["body", "open", "close"], "diagram", "anatomy"),
      step("Candle basics", "The thin lines are wicks. They show the highest and lowest price.", "WICKS = HIGH AND LOW", ["wicks", "highest", "lowest"], "diagram", "hammer", { part: "wick" }),
      step("Candle basics", "Each candle covers one time block, like 1 hour or 1 day.", "1 HOUR OR 1 DAY", ["hour", "day"], "scene", "timeframe"),
      step("The shape", "A hammer has a small body near the top.", "SMALL BODY ON TOP", ["body", "top"], "diagram", "hammer", { part: "body" }),
      step("The shape", "Its lower wick is long, at least 2 times the body.", "WICK ≥ 2× BODY", ["wick", "body"], "diagram", "ratio"),
      step("The shape", "Here is the full shape: small body, long lower wick.", "THE FULL SHAPE", ["shape", "body", "wick"], "diagram", "hammer", { part: "both" }),
      step("The shape", "A long upper wick is a different candle, not a hammer.", "UPPER WICK ≠ HAMMER", ["upper", "wick"], "diagram", "lookalike", { which: "inverted" }),
      step("What it means", "The long wick means sellers pushed the price down hard.", "SELLERS PUSHED DOWN", ["sellers", "down"], "diagram", "push", { dir: "down" }),
      step("What it means", "But buyers pushed it back up before the candle closed.", "BUYERS PUSHED BACK", ["buyers", "back"], "diagram", "push", { dir: "up" }),
      step("What it means", "So the buyers won this battle.", "BUYERS WON", ["buyers", "battle"], "scene", "battle"),
      step("Where it counts", "A hammer matters most at the end of a downtrend.", "AFTER A DOWNTREND", ["downtrend"], "diagram", "downtrend"),
      step("Where it counts", "The same shape after a rise is a warning, not a hammer.", "AFTER A RISE = WARNING", ["rise", "warning"], "diagram", "lookalike", { which: "hanging" }),
      ...ex,
      step("How to use it", "Never act on the hammer alone.", "NOT ALONE", ["alone"], "card", "hammer", { icon: "hammer" }, "hammer + confirmation"),
      step("How to use it", "Wait for the next candle to close higher. That is confirmation.", "WAIT FOR CONFIRMATION", ["confirmation", "next"], "diagram", "confirm"),
      step("How to use it", "Put your stop loss just below the wick.", "STOP LOSS UNDER THE WICK", ["stop", "wick"], "diagram", "stop"),
      step("How to use it", "Then the most you can lose is small and known.", "SMALL, KNOWN RISK", ["lose", "small"], "scene", "protect"),
      step("Recap", "A hammer is a clue, never a promise.", "A CLUE, NOT A PROMISE", ["clue"], "scene", "clue"),
      step("Recap", "This is education, not financial advice.", "NOT FINANCIAL ADVICE", ["education", "advice"], "card", "check", { icon: "check" }),
      step("Recap", "Big players leave clues too. We track whale moves live.", "WE TRACK WHALE MOVES", ["whale", "clues"], "scene", "whales"),
      step("Recap", "Watch live whale moves for free on MarketRadar Whale.", "MARKETRADARWHALE.COM", ["whale"], "end", "end"),
    ],
  };
}
