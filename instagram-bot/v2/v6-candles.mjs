// v6 generic CANDLE-PATTERN lessons (T50-08 step 3, D186/D188/D195): every candle topic of topic-plan.json in v6 + mascot.
// The real example is picked by code from REAL candles (v6-patterns.mjs strict rule; the shot-list gate re-checks the proof).
import { getCandles } from "./lib.mjs";
import { PATTERNS, findPattern, patternProof } from "./v6-patterns.mjs";

// per pattern: name, bull (direction after it), look = 2 shape sentences [say, kw, tags], mean = what it means [say, kw, tags]
export const TEXT = {
  shooting_star: { name: "shooting star", bull: false, look: [["It has a small body near the bottom.", "SMALL BODY AT THE BOTTOM", ["body", "bottom"]], ["Its upper wick is long, at least 2 times the body.", "UPPER WICK ≥ 2× BODY", ["wick", "body"]]], mean: ["Buyers pushed up, but sellers pushed it back down.", "SELLERS PUSHED BACK", ["sellers", "buyers"]] },
  doji: { name: "doji", bull: true, look: [["The open and the close are almost the same.", "OPEN = CLOSE", ["open", "close"]], ["So the body is a thin line, with wicks on both sides.", "THIN BODY, TWO WICKS", ["body", "wicks"]]], mean: ["Buyers and sellers ended the fight in a draw.", "A DRAW", ["buyers", "sellers", "draw"]] },
  bull_engulfing: { name: "bullish engulfing", bull: true, look: [["First comes a small red candle.", "SMALL RED CANDLE", ["red", "candle"]], ["Then a big green body covers it completely.", "GREEN COVERS RED", ["green", "body"]]], mean: ["Buyers took control in one candle.", "BUYERS TOOK CONTROL", ["buyers", "control"]] },
  bear_engulfing: { name: "bearish engulfing", bull: false, look: [["First comes a small green candle.", "SMALL GREEN CANDLE", ["green", "candle"]], ["Then a big red body covers it completely.", "RED COVERS GREEN", ["red", "body"]]], mean: ["Sellers took control in one candle.", "SELLERS TOOK CONTROL", ["sellers", "control"]] },
  harami: { name: "harami", bull: true, look: [["First comes one big candle.", "ONE BIG CANDLE", ["big", "candle"]], ["Then a small body sits inside it.", "SMALL BODY INSIDE", ["small", "body", "inside"]]], mean: ["The big move is losing its power.", "THE MOVE IS TIRED", ["move", "power"]] },
  tweezer_bottom: { name: "tweezer bottom", bull: true, look: [["Two candles touch the same low.", "SAME LOW, TWICE", ["candles", "low"]], ["First red, then green.", "RED, THEN GREEN", ["red", "green"]]], mean: ["Sellers failed to break that floor twice.", "THE FLOOR HELD", ["sellers", "floor"]] },
  morning_star: { name: "morning star", bull: true, look: [["First a big red candle, then a small one.", "BIG RED, THEN SMALL", ["red", "small"]], ["Then a big green candle closes high.", "THEN BIG GREEN", ["green", "candle"]]], mean: ["The night of selling is ending.", "SELLING IS ENDING", ["selling", "ending"]] },
  evening_star: { name: "evening star", bull: false, look: [["First a big green candle, then a small one.", "BIG GREEN, THEN SMALL", ["green", "small"]], ["Then a big red candle closes low.", "THEN BIG RED", ["red", "candle"]]], mean: ["The day of buying is ending.", "BUYING IS ENDING", ["buying", "ending"]] },
  three_white_soldiers: { name: "three white soldiers", bull: true, look: [["Three green candles in a row.", "3 GREEN CANDLES", ["green", "candles"]], ["Each one closes higher than the last.", "EACH CLOSES HIGHER", ["closes", "higher"]]], mean: ["Buyers are marching in, step by step.", "BUYERS MARCH IN", ["buyers", "step"]] },
};
export const CANDLE_KEYS = Object.keys(TEXT);

export async function patternData(key, after = 5) {
  const T = TEXT[key], R = PATTERNS[key], cache = {};
  for (const coin of ["BTC", "ETH"]) for (const [iv, bars] of [["1d", 400], ["4h", 600], ["1h", 1000]]) {
    const all = cache[coin + iv] || (cache[coin + iv] = await getCandles(coin, iv, bars));
    for (let i = findPattern(key, all, after); i >= 0; i = findPattern(key, all.slice(0, i + after), after)) {
      if ((all[i + 1][4] > all[i][4]) !== T.bull) continue; // next candle confirms the direction
      const a = Math.max(0, i - 10), H = all[i], A = all[i + after], d = new Date(H[0]);
      return { key, name: T.name.toUpperCase(), n: R.n, coin, coinName: coin === "BTC" ? "Bitcoin" : "Ethereum", iv, candles: all.slice(a, i + after + 1), hi: i - a, after, H, A,
        proof: patternProof(key, all, i), month: d.toLocaleString("en-US", { month: "long", timeZone: "UTC" }), day: d.getUTCDate(),
        low: Math.round(H[3]), high: Math.round(H[2]), close: Math.round(H[4]), pct: +((A[4] / H[4] - 1) * 100).toFixed(1) };
    }
  }
  throw new Error("no strict confirmed " + key + " in BTC/ETH 1d/4h/1h candles");
}
const n = (x) => Math.round(x).toLocaleString("en-US");
export function patternLesson(kind, D) {
  const T = TEXT[D.key], up = D.pct >= 0, unit = D.iv === "1d" ? "days" : "candles", MON = D.month.slice(0, 3).toUpperCase(), NAME = T.name.toUpperCase(), first = T.name.split(" ")[0];
  const step = (chapter, say, kw, tags, type, draw, args, sub) => ({ chapter, say, kw, tags, visual: { type, draw, args }, sub });
  const lbl = `${D.coinName.toUpperCase()} · ${({ "1d": "DAILY", "4h": "4H", "1h": "1H" })[D.iv]} CANDLES`;
  const ex = (ch) => [
    step(ch, `Here is a real ${D.coinName} chart from ${D.month} ${D.day}.`, `${MON} ${D.day}: REAL ${D.coinName.toUpperCase()}`, [D.coinName.toLowerCase(), "chart"], "chart", "real", { mark: "none", label: lbl }),
    T.bull ? step(ch, `It dipped to ${n(D.low)} dollars.`, `LOW $${n(D.low)}`, ["dipped"], "chart", "real", { mark: "low", label: "THE LOW" })
      : step(ch, `It reached ${n(D.high)} dollars.`, `HIGH $${n(D.high)}`, ["reached"], "chart", "real", { mark: "high", label: "THE HIGH" }),
    step(ch, `Then it closed at ${n(D.close)} dollars.`, `CLOSE $${n(D.close)}`, ["closed"], "chart", "real", { mark: "close", label: "THE CLOSE" }),
    step(ch, `This is a real ${T.name}.`, `A REAL ${NAME}`, [first], "chart", "real", { mark: "shape", label: "THE SHAPE", name: NAME }),
    step(ch, `${D.after} ${unit} later, ${D.coinName} was ${Math.abs(D.pct)} percent ${up ? "higher" : "lower"}.`, `${up ? "+" : "-"}${Math.abs(D.pct)}% IN ${D.after} ${unit.toUpperCase()}`, [D.coinName.toLowerCase(), up ? "higher" : "lower"], "chart", "real", { mark: "after", label: `${D.after} ${unit.toUpperCase()} LATER` }),
  ];
  const hook = (ch) => [
    step(ch, T.bull ? "This pattern can warn you that a fall may be ending." : "This pattern can warn you that a rise may be ending.", T.bull ? "A FALL MAY END" : "A RISE MAY END", ["pattern", T.bull ? "fall" : "rise"], "scene", "hook"),
    step(ch, `Traders call it the ${T.name}.`, NAME, [first], "card", T.bull ? "up" : "down", { icon: T.bull ? "up" : "down" }),
  ];
  const shape = (c1, c2) => [
    step(c1, T.bull ? "It shows up after prices fell for a while." : "It shows up after prices rose for a while.", T.bull ? "AFTER A FALL" : "AFTER A RISE", ["prices", T.bull ? "fell" : "rose"], "diagram", "pattern", { key: D.key, focus: "trend" }),
    step(c1, ...T.look[0], "diagram", "pattern", { key: D.key, focus: "shape" }),
    step(c1, ...T.look[1], "card", "check", { icon: "check" }),
    step(c2, ...T.mean, "scene", "battle"),
  ];
  const use = (ch) => [
    step(ch, "Wait for the next candle to confirm it.", "WAIT FOR CONFIRMATION", ["next", "confirm"], "diagram", "pattern", { key: D.key, focus: "next" }),
    step(ch, T.bull ? "Put your stop loss just below the low." : "Put your stop loss just above the high.", T.bull ? "STOP LOSS UNDER THE LOW" : "STOP LOSS ABOVE THE HIGH", ["stop", "loss"], "scene", "protect"),
  ];
  const clue = (ch) => step(ch, `A ${T.name} is a clue, never a promise.`, "A CLUE, NOT A PROMISE", ["clue"], "scene", "clue");
  const end = (ch) => step(ch, "Watch live whale moves for free on MarketRadar Whale.", "MARKETRADARWHALE.COM", ["whale"], "end", "end");
  const titleName = T.name.replace(/\b\w/g, (c) => c.toUpperCase());
  if (kind === "short") return { title: `${titleName} Candle Pattern Explained: A Real ${D.coinName} Example`, steps: [...hook(""), ...shape("", ""), ...ex(""), ...use(""), clue(""), end("")] };
  return { title: `The ${titleName} Pattern for Beginners: Shape, Meaning and a Real ${D.coinName} Example`,
    steps: [
      ...hook("Intro"),
      step("Intro", "Today you learn its shape, its meaning, and how to use it.", "SHAPE · MEANING · USE", ["shape", "meaning"], "card", "question", { icon: "question" }),
      step("Candle basics", "First, every candle shows four prices.", "4 PRICES", ["four", "prices"], "card", "calendar", { icon: "calendar" }, "open · high · low · close"),
      step("Candle basics", "The body runs from the open to the close.", "BODY = OPEN TO CLOSE", ["body", "open", "close"], "diagram", "anatomy"),
      step("Candle basics", "Each candle covers one time block, like 1 hour or 1 day.", "1 HOUR OR 1 DAY", ["hour", "day"], "scene", "timeframe"),
      ...shape("The shape", "What it means"),
      ...ex("Real example"),
      step("How to use it", `Never act on the ${T.name} alone.`, "NOT ALONE", ["alone"], "card", "whale", { icon: "whale" }, "pattern + confirmation"),
      ...use("How to use it"),
      step("How to use it", "Then the most you can lose is small and known.", "SMALL, KNOWN RISK", ["lose", "small"], "scene", "protect", { v: 2 }),
      clue("Recap"),
      step("Recap", "This is education, not financial advice.", "NOT FINANCIAL ADVICE", ["education", "advice"], "card", "check", { icon: "check" }, "learn first"),
      step("Recap", "Big players leave clues too. We track whale moves live.", "WE TRACK WHALE MOVES", ["whale", "clues"], "scene", "whales"),
      end("Recap"),
    ] };
}
