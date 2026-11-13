// v6 lessons for the OTHER weekday types (T50-08 v6d 2026-11-13, owner D188/D199): indicator, whale_week, coin, replay,
// safety, recap. Same pattern as v6-candles.mjs: one sentence = one tagged code-drawn picture or our real chart; Short ~15,
// long ~23 sentences; mascot tags added by v6-make (tagMascot). Real numbers come from Hyperliquid candles + our /whale-feed.
// Topic ids (v6-pick.mjs): indicator key (rsi, moving_average, macd, bollinger, volume) | coin_<sym> | safety key | whale_week | replay | recap
import { readFileSync } from "node:fs";
import { getCandles, getFeed, getMids, SITE } from "./lib.mjs";
import { findEvent, IND_KEYS } from "./v6-ind.mjs";

const st = (chapter, say, kw, tags, type, draw, args = {}, sub) => ({ chapter, say, kw, tags, visual: { type, draw, args }, sub });
const end = (ch) => st(ch, "Watch live whale moves for free on MarketRadar Whale.", "MARKETRADARWHALE.COM", ["whale"], "end", "end");
const advice = (ch) => st(ch, "This is education, not financial advice.", "NOT FINANCIAL ADVICE", ["education", "advice"], "card", "check", { icon: "check" }, "learn first");
const whalesEnd = (ch) => st(ch, "Big players leave clues too. We track whale moves live.", "WE TRACK WHALE MOVES", ["whale", "clues"], "scene", "whales");
const obj = (a, b, mark, mood, extra = {}) => ({ a, ...(b ? { b } : {}), ...(mark ? { mark } : {}), ...(mood ? { mood } : {}), ...extra });
const NAMES = { BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", XRP: "XRP", DOGE: "Dogecoin", HYPE: "HYPE", BNB: "BNB", LINK: "Chainlink", AVAX: "Avalanche", TON: "Toncoin" };
export const p = (x) => { x = +x; return x >= 1000 ? Math.round(x).toLocaleString("en-US") : x >= 100 ? x.toFixed(1) : x >= 10 ? x.toFixed(2) : x >= 1 ? x.toFixed(3) : String(+x.toPrecision(3)); };
const big = (x) => (x >= 1e9 ? [(x / 1e9).toFixed(1), "billion", "B"] : x >= 1e8 ? [String(Math.round(x / 1e6)), "million", "M"] : x >= 1e6 ? [(x / 1e6).toFixed(1), "million", "M"] : [String(Math.round(x / 1e3)), "thousand", "K"]);
export const sayUsd = (x) => { const [a, w] = big(x); return `${a} ${w} dollars`; };
export const sayUsdAdj = (x) => { const [a, w] = big(x); return `${a} ${w} dollar`; };
export const kwUsd = (x) => { const [a, , u] = big(x); return `$${a}${u}`; };
const pct = (a, b) => +(((b - a) / a) * 100).toFixed(1);
const r1 = (x) => (Math.abs(x) >= 100 ? Math.round(x) : +x.toFixed(1));
const sg = (x) => (x >= 0 ? "+" : "-") + Math.abs(x);
const WK = () => Math.floor(Date.now() / 6048e5);
const V = (arr, k = WK()) => arr[((k % arr.length) + arr.length) % arr.length];
const dateOf = (t) => { const d = new Date(t); return { month: d.toLocaleString("en-US", { month: "long", timeZone: "UTC" }), day: d.getUTCDate() }; };
const today = () => new Date().toISOString().slice(0, 10);

// ---------------- INDICATOR ----------------
const IND = {
  rsi: { name: "RSI", title: "RSI Indicator Explained", hook: "This tool shows when a coin was pushed too far.",
    what: [["RSI measures how strong the last 14 candles were.", "RSI = LAST 14 CANDLES", ["rsi", "candles"]], ["It moves between 0 and 100.", "FROM 0 TO 100", ["moves"]]],
    rule: ["Above 70 is too hot. Below 30 is too cold.", "70 HOT · 30 COLD", ["hot", "cold"]],
    mean: { up: ["Too cold can mean sellers are getting tired.", "SELLERS GET TIRED", ["sellers", "tired"]], down: ["Too hot can mean buyers are getting tired.", "BUYERS GET TIRED", ["buyers", "tired"]] },
    event: (e) => (e.dir === "up" ? [`The RSI fell to ${e.value}, below 30.`, `RSI ${e.value} · BELOW 30`, ["rsi", "below"]] : [`The RSI rose to ${e.value}, above 70.`, `RSI ${e.value} · ABOVE 70`, ["rsi", "above"]]) },
  moving_average: { name: "moving average", title: "Moving Average Crossover Explained", hook: "Two simple lines can show you when a trend turns.",
    what: [["A moving average is the average close of recent candles.", "AVERAGE CLOSE", ["average", "close"]], ["The 20 average is fast. The 50 average is slow.", "20 FAST · 50 SLOW", ["fast", "slow"]]],
    rule: ["When the fast line crosses the slow line, the trend may turn.", "FAST CROSSES SLOW", ["crosses", "trend"]],
    mean: { up: ["Fast above slow means buyers are taking over.", "BUYERS TAKE OVER", ["buyers", "fast"]], down: ["Fast below slow means sellers are taking over.", "SELLERS TAKE OVER", ["sellers", "fast"]] },
    event: (e) => (e.dir === "up" ? ["The 20 average crossed above the 50 average.", "20 CROSSED ABOVE 50", ["crossed", "above"]] : ["The 20 average crossed below the 50 average.", "20 CROSSED BELOW 50", ["crossed", "below"]]) },
  macd: { name: "MACD", title: "MACD Indicator Explained", hook: "This tool shows when the push behind a move changes.",
    what: [["MACD compares a fast average with a slow average.", "FAST VS SLOW AVERAGE", ["fast", "slow"]], ["The blue line is MACD. The yellow line is its signal.", "BLUE MACD · YELLOW SIGNAL", ["blue", "yellow"]]],
    rule: ["When blue crosses yellow, the push behind the move changes.", "BLUE CROSSES YELLOW", ["blue", "crosses"]],
    mean: { up: ["Blue above yellow means the push is turning up.", "PUSH TURNS UP", ["push", "up"]], down: ["Blue below yellow means the push is turning down.", "PUSH TURNS DOWN", ["push", "down"]] },
    event: (e) => (e.dir === "up" ? ["The MACD line crossed above its signal line.", "MACD CROSSED UP", ["macd", "crossed"]] : ["The MACD line crossed below its signal line.", "MACD CROSSED DOWN", ["macd", "crossed"]]) },
  bollinger: { name: "Bollinger Bands", title: "Bollinger Bands Explained", hook: "Two bands can show you when price stretched too far.",
    what: [["Bollinger Bands put two lines around a 20 candle average.", "2 BANDS · 20 AVERAGE", ["bands", "average"]], ["The bands get wide when price moves fast.", "WIDE BANDS = FAST MOVES", ["bands", "wide"]]],
    rule: ["A close outside a band means price stretched too far.", "OUTSIDE = STRETCHED", ["outside", "stretched"]],
    mean: { up: ["A stretched fall often snaps back toward the middle.", "SNAPS BACK TO THE MIDDLE", ["snaps", "middle"]], down: ["A stretched rise often snaps back toward the middle.", "SNAPS BACK TO THE MIDDLE", ["snaps", "middle"]] },
    event: (e) => (e.dir === "up" ? ["The price closed below the lower band.", "CLOSE BELOW LOWER BAND", ["closed", "below"]] : ["The price closed above the upper band.", "CLOSE ABOVE UPPER BAND", ["closed", "above"]]) },
  volume: { name: "volume", title: "Trading Volume Explained", hook: "Price tells you what happened. Volume tells you how strong it was.",
    what: [["Volume shows how much was traded in each candle.", "VOLUME = AMOUNT TRADED", ["volume", "traded"]], ["Tall bars mean many traders took part.", "TALL BAR = MANY TRADERS", ["tall", "traders"]]],
    rule: ["A bar over 2.5 times the average is a spike.", "2.5× AVERAGE = SPIKE", ["spike", "average"]],
    mean: { up: ["A spike on a green candle means strong buying.", "STRONG BUYING", ["green", "buying"]], down: ["A spike on a red candle means strong selling.", "STRONG SELLING", ["red", "selling"]] },
    event: (e) => [`Volume jumped to ${e.value} times its average.`, `VOLUME ${e.value}× AVERAGE`, ["volume", "jumped"]] },
};
const planCoin = (type, key, field = "coin") => { try { const P = JSON.parse(readFileSync(new URL("./topic-plan.json", import.meta.url), "utf8")); const w = P.weeks.find((x) => x[type] && x[type].key === key); return (w && w[type][field]) || "BTC"; } catch { return "BTC"; } };
export async function indicatorData(key, after = 5) {
  const first = planCoin("indicator", key), coins = [first, ...["BTC", "ETH", "SOL"].filter((c) => c !== first)];
  for (const coin of coins) for (const [iv, bars] of [["1d", 300], ["4h", 500]]) {
    const full = await getCandles(coin, iv, bars), e = findEvent(key, full, after);
    if (!e) continue;
    const H = full[e.i], A = full[e.i + after], d = dateOf(H[0]), I = IND[key];
    return { key, type: "indicator", name: I.name.toUpperCase(), coin, coinName: NAMES[coin] || coin, iv, after, e, month: d.month, day: d.day, close: +H[4], pct: pct(H[4], A[4]),
      ind: { full, key, i: e.i, after, w0: Math.max(0, e.i - 34) }, thumb: [I.name.toUpperCase(), "EXPLAINED", "chart_up"],
      desc: `Data: real ${NAMES[coin] || coin} ${iv === "1d" ? "daily" : "4-hour"} candles from a public market data feed; the ${I.name} is computed by our own code from the same candles (signal on ${d.month} ${d.day}).` };
  }
  throw new Error("no " + key + " signal in BTC/ETH/SOL candles");
}
export function indicatorLesson(kind, D) {
  const I = IND[D.key], e = D.e, up = D.pct >= 0, worked = (e.dir === "up") === up, unit = D.iv === "1d" ? "days" : "candles", MON = D.month.slice(0, 3).toUpperCase(), CN = D.coinName.toUpperCase();
  const lbl = `${CN} · ${D.iv === "1d" ? "DAILY" : "4H"} CANDLES + ${I.name.toUpperCase()}`;
  const HK = { rsi: ["PUSHED TOO FAR?", ["tool", "pushed"]], moving_average: ["WHEN A TREND TURNS", ["lines", "trend"]], macd: ["THE PUSH CHANGES", ["tool", "push"]], bollinger: ["STRETCHED TOO FAR?", ["bands", "stretched"]], volume: ["HOW STRONG WAS IT?", ["volume", "strong"]] }[D.key];
  const hook = (ch) => [st(ch, I.hook, HK[0], HK[1], "scene", "obj", obj("magnifier", e.dir === "up" ? "chart_down" : "chart_up", null, "surprised")),
    st(ch, `Traders call it the ${I.name}.`, I.name.toUpperCase(), [I.name.split(" ")[0].toLowerCase()], "card", "chart_up", { icon: "chart_up" })];
  const shape = (c1, c2) => [
    st(c1, ...I.what[0], "diagram", "ind", { key: D.key, focus: "line" }),
    st(c1, ...I.what[1], "card", "calendar", { icon: "calendar" }),
    st(c1, ...I.rule, "diagram", "ind", { key: D.key, focus: "signal" }),
    st(c2, ...I.mean[e.dir], "scene", "battle", { winner: e.dir === "up" ? "buyers" : "sellers" }),
  ];
  const ex = (ch) => [
    st(ch, `Here is a real ${D.coinName} chart from ${D.month} ${D.day}.`, `${MON} ${D.day}: REAL ${CN}`, [D.coinName.toLowerCase(), "chart"], "chart", "ind", { mark: "none", label: lbl }),
    st(ch, ...I.event(e), "chart", "ind", { mark: "value", label: lbl }),
    st(ch, `That candle closed at ${p(D.close)} dollars.`, `CLOSE $${p(D.close)}`, ["closed"], "chart", "ind", { mark: "event", label: lbl, pill: `CLOSE $${p(D.close)}` }),
    st(ch, `${D.after} ${unit} later, ${D.coinName} was ${Math.abs(D.pct)} percent ${up ? "higher" : "lower"}.`, `${sg(D.pct)}% IN ${D.after} ${unit.toUpperCase()}`, [D.coinName.toLowerCase(), up ? "higher" : "lower"], "chart", "ind", { mark: "after", label: `${D.after} ${unit.toUpperCase()} LATER` }),
    worked ? st(ch, "This time the signal worked.", "THE SIGNAL WORKED", ["signal", "worked"], "card", "check", { icon: "check" }) : st(ch, "This time the signal failed. That happens a lot.", "THE SIGNAL FAILED", ["signal", "failed"], "card", "warn", { icon: "warn" }),
  ];
  const use = (ch) => [st(ch, "Wait for price to confirm before you act.", "WAIT FOR CONFIRMATION", ["price", "confirm"], "diagram", "ind", { key: D.key, focus: "next" }),
    st(ch, "Always set a stop loss before you enter.", "SET A STOP LOSS", ["stop", "loss"], "scene", "protect")];
  const clue = (ch) => st(ch, `The ${I.name} is a clue, never a promise.`, "A CLUE, NOT A PROMISE", ["clue"], "scene", "obj", obj("magnifier", "chart_up", null, null, { text: "CLUE" }));
  const steps = kind === "short" ? [...hook(""), ...shape("", ""), ...ex(""), ...use(""), clue(""), end("")] : [
    ...hook("Intro"),
    st("Intro", "Today: how to read it, with a real example.", "HOW TO READ IT · REAL EXAMPLE", ["real", "example"], "card", "question", { icon: "question" }),
    st("Basics", "An indicator is simple math done on past prices.", "MATH ON PAST PRICES", ["math", "prices"], "scene", "obj", obj("calendar", "chart_up")),
    st("Basics", "It does not see the future. It sums up the past.", "IT SUMS UP THE PAST", ["past", "future"], "scene", "obj", obj("clock", null, "cross", "worried")),
    st("Basics", "Each candle covers one time block, like 1 hour or 1 day.", "1 HOUR OR 1 DAY", ["hour", "day"], "scene", "timeframe"),
    ...shape("How it works", "What it means"), ...ex("Real example"),
    st("How to use it", `Never act on the ${I.name} alone.`, "NOT ALONE", ["alone"], "card", "whale", { icon: "whale" }, "indicator + price + plan"),
    ...use("How to use it"),
    st("How to use it", "Then the most you can lose is small and known.", "SMALL, KNOWN RISK", ["lose", "small"], "scene", "protect", { v: 2 }),
    clue("Recap"), advice("Recap"), whalesEnd("Recap"), end("Recap")];
  const tn = I.name.replace(/\b\w/g, (c) => c.toUpperCase());
  return { title: kind === "short" ? `${I.title}: A Real ${D.coinName} Example` : `The ${tn} for Beginners: How to Read It, With a Real ${D.coinName} Chart`, steps };
}

// ---------------- WHALE helpers (our /whale-feed + Hyperliquid prices) ----------------
async function whaleRows() {
  const [feed, mids] = await Promise.all([getFeed(), getMids()]);
  const rows = feed.map((r) => ({ ...r, szi: +r.szi, entryPx: +r.entryPx, leverage: +r.leverage || 1, liqPx: r.liqPx ? +r.liqPx : null, value: +r.value })).filter((r) => mids[r.coin] && r.value > 0).sort((a, b) => b.value - a.value);
  const top = rows.slice(0, 50), longs = top.filter((r) => r.szi > 0), shorts = top.filter((r) => r.szi < 0), sum = (a) => a.reduce((s, r) => s + r.value, 0);
  return { rows, mids, crowd: { n: top.length, nL: longs.length, nS: shorts.length, longV: sum(longs), shortV: sum(shorts) } };
}
const moneySide = (ch, c) => { const L = c.longV >= c.shortV, v = L ? c.longV : c.shortV; return st(ch, `${L ? "Longs" : "Shorts"} hold ${sayUsd(v)} of it.`, `${L ? "LONGS" : "SHORTS"}: ${kwUsd(v)}`, [L ? "longs" : "shorts"], "chart", "split", { by: "money", label: "MONEY ON EACH SIDE" }); };
const side = (r) => (r.szi < 0 ? "short" : "long");
const movePct = (r, now) => +((((now - r.entryPx) / r.entryPx) * (r.szi < 0 ? -1 : 1)) * 100).toFixed(1);
async function priceSet(r, now, iv = "4h", bars = 42) {
  const ks = await getCandles(r.coin, iv, bars), c = side(r) === "long" ? "#2fbf86" : "#ef5b5b";
  const lines = { entry: { p: r.entryPx, text: `ENTRY $${p(r.entryPx)}`, col: "#5aa9ff" }, now: { p: now, text: `NOW $${p(now)}`, col: c } };
  if (r.liqPx) lines.liq = { p: r.liqPx, text: `LIQUIDATION $${p(r.liqPx)}`, col: "#ef5b5b" };
  return { ks, lines };
}

// ---------------- WHALE OF THE WEEK ----------------
export async function whaleWeekData() {
  const W = await whaleRows(), top = W.rows.slice(0, 5), t = top[0], now = +W.mids[t.coin];
  return { type: "whale_week", name: "WHALE WEEK", coin: t.coin, coinName: NAMES[t.coin] || t.coin, top, crowd: W.crowd, now, move: movePct(t, now), price: await priceSet(t, now),
    whales: top.map((r) => ({ coin: r.coin, side: side(r), value: r.value, lev: r.leverage })), thumb: [kwUsd(t.value), t.coin + " " + side(t).toUpperCase(), "whale"],
    desc: `Data: the biggest open positions on the MarketRadar whale tracker (public on-chain wallets) and public market prices, ${today()}.` };
}
export function whaleWeekLesson(kind, D) {
  const t = D.top[0], c = D.crowd, roi = r1(D.move * t.leverage), lean = c.longV >= c.shortV ? "long" : "short", total = D.top.reduce((s, r) => s + r.value, 0), N = ["one", "two", "three", "four", "five"];
  const lbl = `${t.coin} · 4H CANDLES · LAST 7 DAYS`;
  const row = (ch, i) => st(ch, i === 0 ? `Number one: a ${sayUsdAdj(D.top[0].value)} ${D.top[0].coin} ${side(D.top[0])}.` : `Number ${N[i]}: a ${sayUsdAdj(D.top[i].value)} ${D.top[i].coin} ${side(D.top[i])}.`,
    `#${i + 1}: ${kwUsd(D.top[i].value)} ${D.top[i].coin} ${side(D.top[i]).toUpperCase()}`, [D.top[i].coin.toLowerCase(), side(D.top[i])], "chart", "whales", { i, label: "BIGGEST WHALE POSITIONS" });
  const hookV = V([["Who are the biggest whales this week?", "THIS WEEK'S BIGGEST WHALES", ["whales", "week"]], ["Where is the biggest money betting this week?", "BIG MONEY THIS WEEK", ["money", "week"]], ["Meet the biggest whale bets of this week.", "BIGGEST WHALE BETS THIS WEEK", ["whale", "week"]]]);
  const core = (chs) => [
    st(chs[0], ...hookV, "chart", "whales", { i: -1, label: "OUR WHALE TRACKER" }),
    st(chs[0], `Together, the top 5 hold ${sayUsd(total)}.`, `TOP 5: ${kwUsd(total)}`, ["top", "together"], "card", "coins", { icon: "coins" }),
    row(chs[1], 0),
    st(chs[1], `It entered near ${p(t.entryPx)} dollars.`, `ENTRY $${p(t.entryPx)}`, ["entered"], "chart", "price", { lines: ["entry"], label: lbl }),
    st(chs[1], `It uses ${t.leverage} times leverage.`, `${t.leverage}× LEVERAGE`, ["leverage"], "card", "seesaw", { icon: "seesaw" }),
    st(chs[1], `${t.coin} now: ${p(D.now)} dollars.`, `NOW $${p(D.now)}`, [t.coin.toLowerCase(), "now"], "chart", "price", { lines: ["entry", "now"], label: lbl }),
    st(chs[1], `This whale is ${roi >= 0 ? "up" : "down"} ${Math.abs(roi)} percent on its money.`, `${sg(roi)}% ON ITS MONEY`, ["whale", "money"], "card", roi >= 0 ? "up" : "down", { icon: roi >= 0 ? "up" : "down" }),
  ];
  const crowd = (ch) => [
    st(ch, `Top ${c.n} whales: ${c.nL} long, ${c.nS} short.`, `${c.nL} LONG · ${c.nS} SHORT (TOP ${c.n})`, ["long", "short"], "chart", "split", { by: "count", label: `TOP ${c.n} WHALE POSITIONS` }),
    moneySide(ch, c),
    st(ch, `So big money leans ${lean} right now.`, `MONEY LEANS ${lean.toUpperCase()}`, ["money", "leans"], "scene", "obj", obj("whale", lean === "long" ? "chart_up" : "chart_down")),
  ];
  const lessons = (ch) => [st(ch, "Whales lose too. Big size is not skill.", "WHALES LOSE TOO", ["whales", "lose"], "scene", "obj", obj("whale", null, "warn", "worried")),
    st(ch, "Use whale data as one clue, and keep your stop loss.", "ONE CLUE + STOP LOSS", ["clue", "stop"], "scene", "protect")];
  const n = D.top.length;
  const steps = kind === "short" ? [...core(["", ""]), ...(n > 1 ? [row("", 1)] : []), ...(n > 2 ? [row("", 2)] : []), ...crowd(""), ...lessons(""), end("")] : [
    ...core(["Intro", "Number one"]).slice(0, 2),
    st("Intro", "Every week we look at the biggest positions on our tracker.", "EVERY WEEK, REAL DATA", ["week", "positions"], "card", "calendar", { icon: "calendar" }),
    st("Intro", "The data is public. Every big wallet is visible on chain.", "PUBLIC WALLET DATA", ["public", "wallet"], "scene", "obj", obj("magnifier", "wallet")),
    st("Intro", "A whale is a wallet with a very big position.", "WHALE = BIG WALLET", ["whale", "wallet"], "scene", "obj", obj("whale", "coins")),
    ...core(["Intro", "Number one"]).slice(2),
    t.liqPx ? st("Number one", `It is liquidated at ${p(t.liqPx)}.`, `LIQUIDATION $${p(t.liqPx)}`, ["liquidated"], "chart", "price", { lines: ["entry", "now", "liq"], label: lbl })
      : st("Number one", "It has no close liquidation price.", "NO CLOSE LIQUIDATION", ["liquidation"], "card", "shield", { icon: "shield" }),
    ...[1, 2, 3, 4].filter((i) => i < n).map((i) => row("The rest of the top 5", i)),
    ...crowd("The whale crowd"),
    st("Lessons", "What can you learn from this?", "WHAT TO LEARN", ["learn"], "card", "question", { icon: "question" }),
    st("Lessons", "Many whales on one side can push the price that way.", "CROWD CAN PUSH PRICE", ["whales", "push"], "scene", "obj", obj("crowd", lean === "long" ? "chart_up" : "chart_down")),
    st("Lessons", "But crowded trades can also flip fast.", "CROWDED TRADES FLIP", ["crowded", "flip"], "scene", "obj", obj("crowd", null, "warn", "worried")),
    ...lessons("Lessons"), advice("Recap"), end("Recap")];
  return { title: kind === "short" ? `Biggest Crypto Whales This Week: ${kwUsd(t.value)} ${t.coin} ${side(t) === "long" ? "Long" : "Short"}` : `Whale of the Week: a ${kwUsd(t.value)} ${t.coin} ${side(t) === "long" ? "Long" : "Short"} and Where Big Money Leans`, steps };
}

// ---------------- REPLAY ----------------
export async function replayData() {
  const W = await whaleRows(), cand = W.rows.slice(0, 30), off = WK();
  for (let k = 0; k < cand.length; k++) {
    const r = cand[(k + off) % cand.length], now = +W.mids[r.coin];
    if (r.leverage < 2) continue;
    const ps = await priceSet(r, now, "1h", 72);
    const ei = ps.ks.findLastIndex((x) => x[3] <= r.entryPx && x[2] >= r.entryPx);
    if (ei < 0) continue;
    return { type: "replay", name: "WHALE TRADE REPLAY", coin: r.coin, coinName: NAMES[r.coin] || r.coin, t: r, now, move: movePct(r, now), hoursAgo: ps.ks.length - 1 - ei, price: ps,
      thumb: ["REPLAY", r.coin + " " + side(r).toUpperCase(), "whale"], desc: `Data: one real open position from the MarketRadar whale tracker (public on-chain wallet ${r.address.slice(0, 6)}…) replayed on real public 1-hour candles, ${today()}.` };
  }
  throw new Error("no whale position with an entry inside the last 72 hours");
}
export function replayLesson(kind, D) {
  const t = D.t, sd = side(t), roi = r1(D.move * t.leverage), a6 = t.address.slice(0, 6), lbl = `${t.coin} · 1H CANDLES · LAST 3 DAYS`;
  const core = (c) => [
    st(c[0], "Let us replay a real whale trade, step by step.", "REPLAY A REAL WHALE TRADE", ["replay", "whale"], "scene", "obj", obj("whale", "magnifier")),
    st(c[0], `The player: a wallet starting with ${a6}.`, `WALLET ${a6.toUpperCase()}`, ["wallet", "player"], "card", "wallet", { icon: "wallet" }),
    st(c[0], `The game: a ${sayUsdAdj(t.value)} ${sd} on ${t.coin}.`, `${kwUsd(t.value)} ${t.coin} ${sd.toUpperCase()}`, [sd, t.coin.toLowerCase()], "chart", "price", { lines: [], label: lbl }),
    st(c[1], `Step one: entry at ${p(t.entryPx)} dollars.`, `1. ENTRY $${p(t.entryPx)}`, ["entry"], "chart", "price", { lines: ["entry"], label: lbl }),
    st(c[1], `Step two: ${t.leverage} times leverage.`, `2. ${t.leverage}× LEVERAGE`, ["leverage"], "card", "seesaw", { icon: "seesaw" }),
    st(c[1], `So a 1 percent move becomes ${t.leverage} percent on its money.`, `1% MOVE = ${t.leverage}%`, ["move", "money"], "scene", "obj", obj("seesaw", null, "warn")),
    t.liqPx ? st(c[1], `Step three: danger line at ${p(t.liqPx)} dollars.`, `3. LIQUIDATION $${p(t.liqPx)}`, ["danger", "line"], "chart", "price", { lines: ["entry", "liq"], label: lbl })
      : st(c[1], "Step three: there is no close danger line yet.", "3. NO CLOSE DANGER LINE", ["danger", "line"], "card", "shield", { icon: "shield" }),
    st(c[1], `Step four: now ${p(D.now)} dollars.`, `4. NOW $${p(D.now)}`, ["now"], "chart", "price", { lines: ["entry", "now"], label: lbl }),
    st(c[1], `That is ${roi >= 0 ? "plus" : "minus"} ${Math.abs(roi)} percent on the whale's own money.`, `${sg(roi)}% ON ITS MONEY`, ["whale", "money"], "card", roi >= 0 ? "up" : "down", { icon: roi >= 0 ? "up" : "down" }),
    st(c[1], `Without leverage, it would be only ${Math.abs(D.move)} percent.`, `${Math.abs(D.move)}% WITHOUT LEVERAGE`, ["leverage"], "card", "coins", { icon: "coins" }),
  ];
  const lessons = (ch) => [
    st(ch, "Lesson one: big money can still be liquidated.", "BIG MONEY CAN BE LIQUIDATED", ["money", "lesson"], "scene", "obj", obj("whale", "warn", null, "worried")),
    st(ch, "Lesson two: the entry price decides everything.", "THE ENTRY DECIDES", ["entry", "price"], "scene", "obj", obj("chart_up", null, "check")),
    st(ch, "Lesson three: small leverage keeps you in the game.", "SMALL LEVERAGE", ["leverage", "small"], "scene", "protect"),
    st(ch, "Copying whales blindly is not a plan.", "DON'T COPY BLINDLY", ["copying", "whales"], "scene", "obj", obj("crowd", null, "cross", "worried")),
  ];
  const steps = kind === "short" ? [...core(["", ""]), ...lessons(""), end("")] : [
    ...core(["The trade", "Step by step"]).slice(0, 3),
    st("Basics", "First, what is a long and what is a short?", "LONG OR SHORT?", ["long", "short"], "card", "question", { icon: "question" }),
    st("Basics", "A long wins when the price goes up.", "LONG WINS ON UP", ["long", "up"], "scene", "obj", obj("chart_up", null, "check")),
    st("Basics", "A short wins when the price goes down.", "SHORT WINS ON DOWN", ["short", "down"], "scene", "obj", obj("chart_down", null, "check")),
    st("Basics", "Leverage means borrowed money on top of your own.", "LEVERAGE = BORROWED MONEY", ["leverage", "borrowed"], "scene", "obj", obj("seesaw", "coins")),
    ...core(["The trade", "Step by step"]).slice(3, 4),
    st("Step by step", `The whale entered about ${D.hoursAgo} hours ago.`, `${D.hoursAgo} HOURS AGO`, ["whale", "entered"], "scene", "obj", obj("clock", "whale")),
    ...core(["The trade", "Step by step"]).slice(4),
    ...lessons("Lessons"), advice("Recap"), whalesEnd("Recap"), end("Recap")];
  return { title: kind === "short" ? `Whale Trade Replay: ${kwUsd(t.value)} ${t.coin} ${sd === "long" ? "Long" : "Short"}, Step by Step` : `Real Whale Trade Replay: a ${kwUsd(t.value)} ${t.coin} ${sd === "long" ? "Long" : "Short"} With ${t.leverage}x Leverage`, steps };
}

// ---------------- COIN ----------------
// 3 facts [say, kw, tags, obj a, obj b] + risk; stable public facts only (launch year, founder, purpose) - no price claims
export const COINS = {
  BTC: { facts: [["Bitcoin launched in 2009.", "LAUNCHED 2009", ["bitcoin", "launched"], "calendar"], ["Only 21 million bitcoin will ever exist.", "21 MILLION MAX", ["million", "bitcoin"], "coins", "lock"], ["Many people hold it as digital gold.", "DIGITAL GOLD", ["digital", "gold"], "coin", "shield"]], risk: ["Its price can still drop by half in a bad year.", "CAN DROP BY HALF", ["price", "drop"]] },
  ETH: { facts: [["Ethereum launched in 2015.", "LAUNCHED 2015", ["ethereum", "launched"], "calendar"], ["It runs smart contracts: programs on the chain.", "SMART CONTRACTS", ["contracts", "programs"], "code", "lock"], ["Since 2022: staking, not mining.", "2022: STAKING, NOT MINING", ["staking", "mining"], "coins", "check"]], risk: ["Fees and competition from other chains are real risks.", "FEES + COMPETITION", ["fees", "competition"]] },
  SOL: { facts: [["Solana launched in 2020.", "LAUNCHED 2020", ["solana", "launched"], "calendar"], ["It is built for speed and tiny fees.", "FAST + TINY FEES", ["speed", "fees"], "rocket"], ["It is popular for memecoins and trading apps.", "MEMECOINS + TRADING APPS", ["memecoins", "apps"], "phone", "coins"]], risk: ["The network has had outages in the past.", "PAST OUTAGES", ["network", "outages"]] },
  HYPE: { facts: [["HYPE is the token of Hyperliquid, a big on-chain futures exchange.", "HYPERLIQUID TOKEN", ["hype", "hyperliquid"], "chart_up", "coin"], ["It launched in November 2024 with a large airdrop.", "NOV 2024 · AIRDROP", ["launched", "airdrop"], "gift"], ["Hyperliquid runs on its own blockchain.", "OWN BLOCKCHAIN", ["blockchain", "own"], "lock", "code"]], risk: ["It is young, and futures trading is very risky.", "YOUNG + RISKY", ["young", "risky"]] },
  XRP: { facts: [["XRP launched its ledger in 2012.", "XRP LEDGER · 2012", ["ledger", "launched"], "calendar"], ["The company Ripple uses it to move money across borders.", "RIPPLE · CROSS-BORDER", ["ripple", "money"], "bank", "coins"], ["Payments settle in a few seconds.", "SECONDS TO SETTLE", ["seconds", "payments"], "clock"]], risk: ["Court cases and rules can move its price a lot.", "LEGAL NEWS MOVES IT", ["court", "rules"]] },
  DOGE: { facts: [["Dogecoin started in 2013 as a joke coin.", "2013 · A JOKE COIN", ["dogecoin", "joke"], "calendar"], ["It was made by Billy Markus and Jackson Palmer.", "MARKUS + PALMER", ["made"], "crowd"], ["There is no limit on how many can exist.", "NO SUPPLY LIMIT", ["limit"], "coins", "warn"]], risk: ["Its price often moves on hype and social media.", "MOVES ON HYPE", ["hype", "price"]] },
  LINK: { facts: [["Chainlink launched in 2017.", "2017 · CHAINLINK", ["chainlink", "launched"], "calendar"], ["It brings outside data, like prices, onto blockchains.", "OUTSIDE DATA ON CHAIN", ["data", "prices"], "chart_up", "lock"], ["These data feeds are called oracles.", "ORACLES", ["oracles", "feeds"], "magnifier"]], risk: ["Its price depends on how many apps keep using it.", "NEEDS APPS USING IT", ["apps", "using"]] },
  AVAX: { facts: [["Avalanche launched in 2020.", "LAUNCHED 2020", ["avalanche", "launched"], "calendar"], ["It is a smart contract chain with very fast finality.", "FAST FINALITY", ["fast", "finality"], "rocket", "clock"], ["Projects can build their own custom chains on it.", "CUSTOM CHAINS", ["chains", "custom"], "code"]], risk: ["Many other chains compete for the same users.", "CHAINS COMPETE", ["compete", "chains"]] },
  BNB: { facts: [["BNB was created by the Binance exchange in 2017.", "BINANCE · 2017", ["binance", "created"], "bank", "calendar"], ["It pays fees on BNB Chain.", "FEES ON BNB CHAIN", ["fees", "chain"], "coins"], ["Binance burns some BNB every quarter, for good.", "QUARTERLY BURN", ["burns", "quarter"], "warn", "coin"]], risk: ["It is tied closely to one company, Binance.", "TIED TO ONE COMPANY", ["company", "binance"]] },
  TON: { facts: [["TON stands for The Open Network.", "THE OPEN NETWORK", ["ton", "network"], "crowd"], ["It was first designed by the Telegram team in 2018.", "TELEGRAM TEAM · 2018", ["telegram", "team"], "phone", "calendar"], ["Today it powers wallets and mini apps inside Telegram.", "WALLETS + MINI APPS", ["wallets", "apps"], "wallet", "phone"]], risk: ["Its fate is closely tied to Telegram.", "TIED TO TELEGRAM", ["telegram"]] },
};
// TON: Hyperliquid has no TON candles (2026-11-13 check) -> text kept, not READY until a data source exists
export const COIN_KEYS = Object.keys(COINS).filter((c) => !["TON", "HYPE", "BNB"].includes(c)).map((c) => "coin_" + c.toLowerCase());
export async function coinData(sym) {
  const [ks, W] = await Promise.all([getCandles(sym, "1d", 31), whaleRows()]), now = +W.mids[sym] || +ks[ks.length - 1][4], last = ks.slice(-30);
  const hi = Math.max(...last.map((k) => +k[2])), lo = Math.min(...last.map((k) => +k[3])), mine = W.rows.filter((r) => r.coin === sym);
  const nL = mine.filter((r) => r.szi > 0).length, nS = mine.length - nL, sum = (a) => a.reduce((s, r) => s + r.value, 0);
  return { type: "coin", name: (NAMES[sym] || sym).toUpperCase(), coin: sym, coinName: NAMES[sym] || sym, now, hi, lo, m30: pct(+last[0][1], now), gap: pct(lo, hi), mine: mine.length, mv: sum(mine),
    crowd: { n: mine.length, nL, nS, longV: sum(mine.filter((r) => r.szi > 0)), shortV: sum(mine.filter((r) => r.szi < 0)) },
    price: { ks: last, lines: { now: { p: now, text: `NOW $${p(now)}`, col: "#121826" }, hi: { p: hi, text: `30-DAY HIGH $${p(hi)}`, col: "#2fbf86" }, lo: { p: lo, text: `30-DAY LOW $${p(lo)}`, col: "#ef5b5b" } } },
    thumb: [`WHAT IS`, (NAMES[sym] || sym).toUpperCase() + "?", "coin"], desc: `Data: real ${NAMES[sym] || sym} daily candles and price from a public market data feed, whale positions from the MarketRadar tracker, ${today()}. Coin facts: public project history.` };
}
export function coinLesson(kind, D) {
  const F = COINS[D.coin], N = D.coinName, NU = N.toUpperCase(), up = D.m30 >= 0, lbl = `${D.coin} · DAILY CANDLES · LAST 30 DAYS`;
  const fact = (ch, f) => st(ch, f[0], f[1], f[2], "scene", "obj", obj(f[3], f[4]));
  const core = (c) => [
    st(c[0], `What is ${N}, and what are whales doing with it?`, `WHAT IS ${NU}?`, [N.toLowerCase(), "whales"], "scene", "obj", obj("coin", "magnifier", null, "surprised")),
    st(c[0], `${N} trades under the ticker ${D.coin}.`, `TICKER: ${D.coin}`, ["ticker"], "card", "coin", { icon: "coin" }),
    ...F.facts.map((f) => fact(c[1], f)),
    st(c[2], `Here is the real ${N} price for the last 30 days.`, `${NU} · LAST 30 DAYS`, ["price", N.toLowerCase()], "chart", "price", { lines: [], label: lbl }),
    st(c[2], `Today it trades at ${p(D.now)} dollars.`, `NOW $${p(D.now)}`, ["trades", "today"], "chart", "price", { lines: ["now"], label: lbl }),
    st(c[2], `The 30 day high was ${p(D.hi)} dollars.`, `30-DAY HIGH $${p(D.hi)}`, ["high"], "chart", "price", { lines: ["hi"], label: lbl }),
    st(c[2], `The low was ${p(D.lo)} dollars.`, `30-DAY LOW $${p(D.lo)}`, ["low"], "chart", "price", { lines: ["lo"], label: lbl }),
    st(c[2], `That is ${up ? "up" : "down"} ${Math.abs(D.m30)} percent in 30 days.`, `${sg(D.m30)}% IN 30 DAYS`, [up ? "up" : "down"], "card", up ? "up" : "down", { icon: up ? "up" : "down" }),
    D.mine ? st(c[3], `Our tracker sees ${D.mine} big whale positions on ${D.coin}.`, `${D.mine} WHALE POSITIONS`, ["whale", "positions"], "scene", "obj", obj("whale", "coins"))
      : st(c[3], `No big whale holds ${D.coin} on our tracker right now.`, "NO BIG WHALES NOW", ["whale", "tracker"], "scene", "obj", obj("whale", null, "cross")),
    ...(D.mine ? [st(c[3], `${D.crowd.nL} are long and ${D.crowd.nS} are short.`, `${D.crowd.nL} LONG · ${D.crowd.nS} SHORT`, ["long", "short"], "chart", "split", { by: "count", label: `${D.coin} WHALE POSITIONS` })] : []),
    st(c[4], ...F.risk, "scene", "obj", obj("warn", null, null, "worried")),
  ];
  const steps = kind === "short" ? [...core(["", "", "", "", ""]), advice(""), end("")] : [
    ...core(["Intro", "The facts", "Real price", "Whales", "Risks"]).slice(0, 2),
    st("Intro", "Today: what it is, its real price, and the whale view.", "FACTS · PRICE · WHALES", ["price", "whale"], "card", "question", { icon: "question" }),
    st("Basics", "A coin is a digital token that lives on a blockchain.", "TOKEN ON A BLOCKCHAIN", ["coin", "blockchain"], "scene", "obj", obj("coin", "lock")),
    st("Basics", "A blockchain is a shared record that nobody edits alone.", "A SHARED RECORD", ["blockchain", "shared"], "scene", "obj", obj("crowd", "lock")),
    ...core(["Intro", "The facts", "Real price", "Whales", "Risks"]).slice(2, D.mine ? 12 : 11),
    st("Real price", `From low to high, the gap was ${D.gap} percent.`, `${D.gap}% RANGE`, ["gap", "low"], "chart", "price", { lines: ["hi", "lo"], label: lbl }),
    ...(D.mine ? [st("Whales", `Together they are worth ${sayUsd(D.mv)}.`, `WORTH ${kwUsd(D.mv)} TOGETHER`, ["together", "worth"], "card", "coins", { icon: "coins" })] : []),
    st("Whales", "A whale is a wallet with a very big position.", "WHALE = BIG WALLET", ["whale", "wallet"], "scene", "obj", obj("whale", "wallet")),
    ...core(["Intro", "The facts", "Real price", "Whales", "Risks"]).slice(D.mine ? 12 : 11),
    st("Risks", "Never invest money you cannot afford to lose.", "ONLY WHAT YOU CAN LOSE", ["money", "lose"], "scene", "protect"),
    advice("Recap"), whalesEnd("Recap"), end("Recap")];
  return { title: kind === "short" ? `What Is ${N} (${D.coin})? Facts, Real Price and Whale Positions` : `${N} (${D.coin}) Explained for Beginners: What It Is, Its Real Price and What Whales Do`, steps };
}

// ---------------- RECAP ----------------
const RECAP_COINS = ["BTC", "ETH", "SOL", "XRP", "DOGE", "HYPE", "BNB", "LINK", "AVAX"];
export async function recapData() {
  const [W, btc4, ...d1] = await Promise.all([whaleRows(), getCandles("BTC", "4h", 42), ...RECAP_COINS.map((c) => getCandles(c, "1d", 9).catch(() => null))]);
  const movers = RECAP_COINS.map((c, j) => d1[j] && d1[j].length >= 8 ? { coin: c, pct: pct(+d1[j][d1[j].length - 8][4], +d1[j][d1[j].length - 1][4]) } : null).filter(Boolean);
  const wk = btc4.slice(-42), hi = Math.max(...wk.map((k) => +k[2])), lo = Math.min(...wk.map((k) => +k[3])), now = +W.mids.BTC;
  const sorted = [...movers].sort((a, b) => b.pct - a.pct);
  return { type: "recap", name: "WEEKLY RECAP", coin: "BTC", coinName: "Bitcoin", movers, best: sorted[0], worst: sorted[sorted.length - 1], btc: movers.find((m) => m.coin === "BTC"), hi, lo, now, crowd: W.crowd,
    price: { ks: wk, lines: { hi: { p: hi, text: `WEEK HIGH $${p(hi)}`, col: "#2fbf86" }, lo: { p: lo, text: `WEEK LOW $${p(lo)}`, col: "#ef5b5b" }, now: { p: now, text: `NOW $${p(now)}`, col: "#121826" } } },
    thumb: ["CRYPTO WEEK", "RECAP", "calendar"], desc: `Data: public market daily candles (7-day change of 10 big coins), Bitcoin 4-hour candles, and the MarketRadar whale tracker, week ending ${today()}.` };
}
export function recapLesson(kind, D) {
  const c = D.crowd, lean = c.longV >= c.shortV ? "long" : "short", b = D.btc || { pct: pct(+D.price.ks[0][1], D.now) }, lbl = "BITCOIN · 4H CANDLES · LAST 7 DAYS";
  const iOf = (coin) => D.movers.findIndex((m) => m.coin === coin), nm = (coin) => NAMES[coin] || coin, w = (x) => (x >= 0 ? "up" : "down");
  const mv = (ch, coin) => { const m = D.movers[iOf(coin)]; return m ? st(ch, `${nm(coin)}: ${w(m.pct)} ${Math.abs(m.pct)} percent.`, `${coin} ${sg(m.pct)}%`, [nm(coin).toLowerCase()], "chart", "movers", { i: iOf(coin), label: "7-DAY CHANGE" }) : null; };
  const hookV = V([["Here is the crypto week in one minute.", "THE CRYPTO WEEK", ["crypto", "week"]], ["What happened in crypto this week?", "THIS CRYPTO WEEK", ["crypto", "week"]], ["Your weekly crypto recap, with real data.", "WEEKLY CRYPTO RECAP", ["crypto", "recap"]]]);
  const core = (ch) => [
    st(ch[0], ...hookV, "scene", "obj", obj("calendar", "chart_up")),
    st(ch[1], `Bitcoin went ${w(b.pct)} ${Math.abs(b.pct)} percent in 7 days.`, `BITCOIN ${sg(b.pct)}% IN 7 DAYS`, ["bitcoin"], "chart", "price", { lines: [], label: lbl }),
    st(ch[1], `The week high was ${p(D.hi)} dollars.`, `WEEK HIGH $${p(D.hi)}`, ["high", "week"], "chart", "price", { lines: ["hi"], label: lbl }),
    st(ch[1], `Its low was ${p(D.lo)} dollars.`, `WEEK LOW $${p(D.lo)}`, ["low"], "chart", "price", { lines: ["lo"], label: lbl }),
    st(ch[1], `Now it trades at ${p(D.now)} dollars.`, `NOW $${p(D.now)}`, ["trades", "now"], "chart", "price", { lines: ["now", "hi", "lo"], label: lbl }),
    st(ch[2], `Here are ${D.movers.length} big coins over the same 7 days.`, `${D.movers.length} COINS · 7 DAYS`, ["coins"], "chart", "movers", { i: -1, label: "7-DAY CHANGE" }),
    mv(ch[2], "ETH"), mv(ch[2], "SOL"),
    st(ch[2], `The best was ${nm(D.best.coin)}, ${w(D.best.pct)} ${Math.abs(D.best.pct)} percent.`, `BEST: ${D.best.coin} ${sg(D.best.pct)}%`, ["best"], "chart", "movers", { i: iOf(D.best.coin), label: "BEST OF THE WEEK" }),
    st(ch[2], `The worst was ${nm(D.worst.coin)}, ${w(D.worst.pct)} ${Math.abs(D.worst.pct)} percent.`, `WORST: ${D.worst.coin} ${sg(D.worst.pct)}%`, ["worst"], "chart", "movers", { i: iOf(D.worst.coin), label: "WORST OF THE WEEK" }),
    st(ch[3], `Top whales: ${c.nL} long, ${c.nS} short.`, `${c.nL} LONG · ${c.nS} SHORT`, ["whales", "long"], "chart", "split", { by: "count", label: `TOP ${c.n} WHALE POSITIONS` }),
    st(ch[3], `So whales lean ${lean} going into next week.`, `WHALES LEAN ${lean.toUpperCase()}`, ["whales", "lean"], "scene", "obj", obj("whale", lean === "long" ? "chart_up" : "chart_down")),
    st(ch[4], "One week is noise. Trends need more time.", "ONE WEEK = NOISE", ["week", "noise"], "scene", "obj", obj("clock", null, "warn")),
  ].filter(Boolean);
  const steps = kind === "short" ? [...core(["", "", "", "", ""]), advice(""), end("")] : [
    core(["Intro"])[0] && st("Intro", ...hookV, "scene", "obj", obj("calendar", "chart_up")),
    st("Intro", "Every Friday we look back at the week with real numbers.", "EVERY FRIDAY · REAL NUMBERS", ["friday", "numbers"], "card", "calendar", { icon: "calendar" }),
    st("Intro", "Prices, the best and worst coins, and what whales did.", "PRICES · BEST · WORST · WHALES", ["prices", "whales"], "card", "question", { icon: "question" }),
    st("Bitcoin", "First, Bitcoin, the biggest coin.", "FIRST: BITCOIN", ["bitcoin"], "scene", "obj", obj("coin", null, null, "happy")),
    ...core(["Intro", "Bitcoin", "The market", "Whales", "Recap"]).slice(1, 5),
    st("Bitcoin", `From low to high, Bitcoin moved ${pct(D.lo, D.hi)} percent.`, `${pct(D.lo, D.hi)}% RANGE`, ["bitcoin", "high"], "chart", "price", { lines: ["hi", "lo"], label: lbl }),
    ...core(["Intro", "Bitcoin", "The market", "Whales", "Recap"]).slice(5, -3), mv("The market", "XRP"), mv("The market", "DOGE"),
    ...core(["Intro", "Bitcoin", "The market", "Whales", "Recap"]).slice(-3, -1),
    moneySide("Whales", c),
    st("Whales", "Whales are not always right.", "WHALES CAN BE WRONG", ["whales", "right"], "scene", "obj", obj("whale", null, "warn", "worried")),
    ...core(["Intro", "Bitcoin", "The market", "Whales", "Recap"]).slice(-1), advice("Recap"), whalesEnd("Recap"), end("Recap")].filter(Boolean);
  return { title: kind === "short" ? `Crypto Week Recap: Bitcoin ${sg(b.pct)}%, Best and Worst Coins, Whale Positions` : `Weekly Crypto Recap: Bitcoin ${sg(b.pct)}%, ${nm(D.best.coin)} ${sg(D.best.pct)}%, and Where Whales Lean`, steps };
}

// ---------------- SAFETY ----------------
// SAFETY_SOURCES (t50-08-v6e 2026-11-13, checked live, R10). Every number in a "facts" line comes from:
//  fake_support, social_engineering: FBI IC3 2024 Internet Crime Report, "Crime types with cryptocurrency nexus" (ic3.gov/AnnualReport/Reports/2024_IC3Report.pdf):
//    Tech Support 11,129 complaints / $961,998,313; Government Impersonation 3,585 / $146,057,054 [V official]
//  phishing_links, fake_airdrop: Scam Sniffer Crypto Phishing Report 2024 (drops.scamsniffer.io/?p=971): drainers $494M from ~332,000 addresses,
//    30 thefts over $1M, largest $55.4M [V vendor report, EVM chains]
//  seed_phrase, exchange_safety: Chainalysis 2025 theft report (Dec 2025, via theblock.co/post/382477): theft > $3.4B, Bybit ~$1.5B (Feb 2025),
//    personal wallet compromises ~158,000 incidents / >= 80,000 victims [V secondary of vendor report]
//  rug_pull: Chainalysis blog 2025-01-29 crypto-market-manipulation-wash-trading-pump-and-dump-2025: > 3 million tokens in 2024, ~4.5-5% pump-and-dump patterns [V]
//  leverage_danger, fomo_and_stop_loss: CoinGlass 24 h liquidation data 2025-10-10/11: $19.1B liquidated, longs $16.7B, ~1.6M traders (decrypt.co/343941) [V; liquidated != lost]
//  two_factor_auth: Microsoft Research 2023 "How effective is multifactor authentication at deterring cyberattacks?" (arxiv.org/abs/2305.00945): 99.22% / 98.56% leaked creds [V]
// line = [say, KW, "tags", objA, objB, mark, mood]; hook + 4 how + 4 protect + rule. Short uses 3 + 3, long uses 4 + 4.
export const SAFETY = {
  seed_phrase: { facts: [["In 2025, thieves hit people's own wallets.","2025: OWN WALLETS HIT","thieves wallets","wallet","hacker","warn","surprised"],["About 80,000 people were robbed.","80,000 PEOPLE ROBBED","people robbed","crowd","coins","cross","worried"],["That was 158,000 thefts in one year.","158,000 THEFTS","thefts year","calendar","hacker","cross","worried"]],
    name: "seed phrase", title: "Never Share Your Seed Phrase", hook: ["Twelve words can empty your whole wallet.", "12 WORDS = YOUR WALLET", "words wallet", "seed", "wallet", "warn", "surprised"],
    how: [["Your seed phrase is the master key to your wallet.", "THE MASTER KEY", "seed key", "seed", "key"], ["Anyone who has it can move all your coins.", "ANYONE CAN MOVE IT ALL", "coins move", "hacker", "coins", "warn", "worried"], ["Scammers ask for it as a fake support check.", "FAKE SUPPORT CHECK", "scammers support", "chat", null, "cross", "worried"], ["Some fake wallet apps steal it when you type it.", "FAKE APPS STEAL IT", "fake apps", "phone", "hacker", "cross"]],
    protect: [["Write it on paper and keep it offline.", "PAPER, OFFLINE", "paper offline", "seed", "lock", "check"], ["Never type it into a website or a chat.", "NEVER TYPE IT ONLINE", "website chat", "link", null, "cross"], ["No real company will ever ask for it.", "NO ONE REAL ASKS", "company ask", "bank", null, "check"], ["Keep two copies in two safe places.", "2 COPIES · 2 PLACES", "copies places", "seed", "shield", "check"]],
    rule: ["Your seed phrase is for your eyes only.", "YOUR EYES ONLY", "seed eyes"] },
  fake_support: { facts: [["Fake support took 962 million dollars.","$962 MILLION TAKEN","support took","chat","coins","warn","worried"],["The FBI counted 11,129 such reports.","11,129 FBI REPORTS","reports","mail","crowd","cross","worried"],["That is FBI data for 2024.","FBI DATA · 2024","data","calendar","magnifier"]],
    name: "fake support", title: "Fake Crypto Support Scam", hook: ["The helper in your messages may be a thief.", "THE HELPER IS A THIEF", "helper thief", "chat", "hacker", "warn", "surprised"],
    how: [["You ask for help in a public group.", "YOU ASK FOR HELP", "help group", "crowd"], ["Seconds later, an admin sends you a private message.", "A PRIVATE MESSAGE", "admin message", "chat"], ["They send a link to fix your wallet.", "A LINK TO FIX IT", "link wallet", "link", "wallet", "warn"], ["The link asks for your seed phrase, and your coins are gone.", "COINS GONE", "link coins", "seed", "hacker", "cross", "worried"]],
    protect: [["Real support never messages you first.", "SUPPORT NEVER DMS FIRST", "support messages", "chat", null, "cross"], ["Only use help pages on the official website.", "OFFICIAL SITE ONLY", "official website", "bank", null, "check"], ["Never share your screen or your seed phrase.", "NEVER SHARE", "share screen", "phone", "seed", "cross"], ["Block and report anyone who rushes you.", "BLOCK + REPORT", "block report", "shield", null, "check"]],
    rule: ["If they message you first, it is a scam.", "MESSAGED FIRST = SCAM", "message scam"] },
  phishing_links: { facts: [["Phishing drained 494 million dollars.","$494 MILLION DRAINED","phishing drained","hook","coins","warn","worried"],["About 332,000 wallets were hit.","332,000 WALLETS HIT","wallets hit","wallet","hacker","cross","worried"],["That was in 2024 alone.","2024 ALONE","alone","calendar","chart_down","warn"]],
    name: "phishing link", title: "Phishing Links in Crypto", hook: ["One wrong click can drain your wallet.", "ONE CLICK, WALLET DRAINED", "click wallet", "link", "hook", "warn", "surprised"],
    how: [["A phishing link looks like a real site.", "LOOKS LIKE THE REAL SITE", "phishing site", "link", "hook"], ["One letter in the address is different.", "ONE LETTER IS DIFFERENT", "letter address", "link", "magnifier", "warn"], ["It comes in emails, ads and chat messages.", "EMAILS · ADS · CHATS", "emails chat", "mail", "chat"], ["You log in, and they steal your password.", "THEY STEAL YOUR LOGIN", "password steal", "hacker", "lock", "cross", "worried"]],
    protect: [["Bookmark the real sites and only use those.", "BOOKMARK REAL SITES", "bookmark sites", "link", null, "check"], ["Check every letter of the address.", "CHECK EVERY LETTER", "letter address", "magnifier", "link", "check"], ["Never click links in surprise messages.", "NO SURPRISE LINKS", "links messages", "mail", null, "cross"], ["Turn on two factor login everywhere.", "2FA EVERYWHERE", "two login", "code", "lock", "check"]],
    rule: ["Type the address yourself. Do not click.", "TYPE IT YOURSELF", "address type"] },
  rug_pull: { facts: [["Over 3 million new tokens launched in 2024.","3 MILLION TOKENS · 2024","tokens launched","coin","calendar"],["Nearly 5 percent looked like pump and dump schemes.","~5% PUMP AND DUMP","pump dump","chart_up","rug","warn","worried"]],
    name: "rug pull", title: "What Is a Rug Pull in Crypto", hook: ["Some new coins are built to steal your money.", "BUILT TO STEAL", "coins money", "rug", "coins", "warn", "surprised"],
    how: [["A team launches a new coin with big promises.", "BIG PROMISES", "coin promises", "rocket", "coin"], ["The price pumps as people rush in.", "THE PRICE PUMPS", "price pumps", "chart_up", "crowd"], ["Then the team sells everything at once.", "THE TEAM SELLS ALL", "team sells", "hacker", "coins", "warn"], ["The price drops to almost zero in minutes.", "DOWN TO ZERO", "price drops", "chart_down", null, "cross", "worried"]],
    protect: [["Check who the team is, and if they are public.", "WHO IS THE TEAM?", "team public", "magnifier", "crowd", "check"], ["Check if the money pool is locked.", "IS THE POOL LOCKED?", "pool locked", "lock", "coins", "check"], ["Be careful when a coin is only days old.", "DAYS OLD = CAREFUL", "coin days", "calendar", null, "warn"], ["Never put in more than you can lose.", "ONLY WHAT YOU CAN LOSE", "lose", "shield", null, "check"]],
    rule: ["If it promises fast riches, walk away.", "FAST RICHES = WALK AWAY", "riches walk"] },
  leverage_danger: { facts: [["October 10, 2025: a fast crash.","OCT 10, 2025 CRASH","crash","calendar","chart_down","warn","surprised"],["19 billion dollars was liquidated in one day.","$19 BILLION IN 1 DAY","liquidated day","coins","seesaw","cross","worried"]],
    name: "leverage", title: "Why Leverage Wipes Out Beginners", hook: ["Leverage can wipe out your account in minutes.", "WIPED OUT IN MINUTES", "leverage account", "seesaw", null, "warn", "surprised"],
    how: [["Leverage means you trade with borrowed money.", "BORROWED MONEY", "leverage borrowed", "seesaw", "coins"], ["At 10 times leverage, a 10 percent drop wipes you out.", "10× · 10% DROP = WIPED OUT", "leverage drop", "seesaw", "chart_down", "warn"], ["The exchange closes you at the liquidation price.", "LIQUIDATION PRICE", "liquidation price", "bank", "chart_down", "cross", "worried"], ["Fast markets hit that price before you can react.", "FASTER THAN YOU", "markets react", "clock", "chart_down", "warn"]],
    protect: [["Start with low leverage, like 2 or 3 times.", "START AT 2× OR 3×", "leverage low", "seesaw", null, "check"], ["Risk only a small part of your account per trade.", "SMALL RISK PER TRADE", "risk small", "coins", "shield", "check"], ["Always set a stop loss before the liquidation price.", "STOP BEFORE LIQUIDATION", "stop loss", "shield", "chart_down", "check"], ["Never add more money to save a losing trade.", "DON'T ADD MORE MONEY", "money losing", "coins", null, "cross"]],
    rule: ["Lower leverage keeps you in the game.", "LOW LEVERAGE = STAY IN", "leverage game"] },
  fake_airdrop: { facts: [["30 drainer thefts topped 1 million dollars.","30 THEFTS OVER $1 MILLION","drainer thefts","gift","hacker","warn","worried"],["The biggest took 55.4 million dollars.","BIGGEST: $55.4 MILLION","biggest","coins","wallet","cross","worried"]],
    name: "fake airdrop", title: "Fake Crypto Airdrop Scam", hook: ["Free tokens in your wallet can be a trap.", "FREE TOKENS = TRAP?", "tokens trap", "gift", "wallet", "warn", "surprised"],
    how: [["Unknown tokens suddenly appear in your wallet.", "UNKNOWN TOKENS APPEAR", "tokens wallet", "gift", "wallet"], ["They point you to a site to claim them.", "A SITE TO CLAIM", "site claim", "link", "gift", "warn"], ["The site asks you to approve a contract.", "APPROVE A CONTRACT?", "approve contract", "code", null, "warn"], ["That approval lets them take your real coins.", "THEY TAKE YOUR COINS", "approval coins", "hacker", "coins", "cross", "worried"]],
    protect: [["Ignore tokens you did not ask for.", "IGNORE SURPRISE TOKENS", "tokens ignore", "gift", null, "cross"], ["Never sign a contract you do not understand.", "DON'T SIGN BLIND", "sign contract", "code", null, "cross"], ["Check airdrops only on the project's official site.", "OFFICIAL SITE ONLY", "airdrops official", "bank", null, "check"], ["Remove old approvals with a revoke tool.", "REVOKE OLD APPROVALS", "approvals revoke", "lock", "shield", "check"]],
    rule: ["If it is free and urgent, it is a trap.", "FREE + URGENT = TRAP", "free urgent"] },
  exchange_safety: { facts: [["In 2025, hackers hit one exchange.","2025: ONE EXCHANGE HIT","hackers exchange","bank","hacker","warn","surprised"],["They took 1.5 billion dollars.","$1.5 BILLION TAKEN","took","coins","chart_down","cross","worried"],["Theft that year passed 3.4 billion dollars.","THEFT: $3.4 BILLION","theft year","calendar","coins","warn","worried"]],
    name: "exchange safety", title: "How to Keep Your Exchange Account Safe", hook: ["Your exchange account is a target for hackers.", "HACKERS WANT IT", "exchange hackers", "bank", "hacker", "warn", "surprised"],
    how: [["Hackers try passwords leaked from other sites.", "LEAKED PASSWORDS", "hackers passwords", "hacker", "lock"], ["They swap your SIM to get your text codes.", "SIM SWAP", "codes swap", "phone", "hacker", "warn"], ["Fake login pages copy the real exchange.", "FAKE LOGIN PAGES", "login pages", "link", "bank", "cross"], ["Exchanges can also freeze or fail.", "EXCHANGES CAN FAIL", "exchanges fail", "bank", null, "warn", "worried"]],
    protect: [["Use a unique, long password for each exchange.", "UNIQUE LONG PASSWORD", "password unique", "key", "lock", "check"], ["Use an app for 2FA codes, not text messages.", "2FA APP, NOT SMS", "app codes", "code", "phone", "check"], ["Turn on a withdrawal address whitelist.", "WITHDRAWAL WHITELIST", "withdrawal whitelist", "wallet", "shield", "check"], ["Keep long-term coins in your own wallet.", "LONG-TERM = OWN WALLET", "coins wallet", "wallet", "lock", "check"]],
    rule: ["Not your keys, not your coins.", "NOT YOUR KEYS, NOT YOUR COINS", "keys coins"] },
  fomo_and_stop_loss: { facts: [["October 10, 2025: buyers got caught.","OCT 10, 2025","buyers caught","calendar","chart_down","warn","surprised"],["16.7 billion dollars of long bets were liquidated.","$16.7 BILLION OF LONGS","long liquidated","rocket","coins","cross","worried"]],
    name: "FOMO", title: "FOMO Trading and Why a Stop Loss Saves You", hook: ["Buying because everyone is buying is a classic trap.", "EVERYONE IS BUYING", "buying everyone", "crowd", "rocket", "warn", "surprised"],
    how: [["FOMO means fear of missing out.", "FEAR OF MISSING OUT", "fomo fear", "crowd", "clock"], ["You buy after a big pump, near the top.", "BUYING THE TOP", "pump top", "chart_up", "rocket", "warn"], ["Then the price falls, and you hope it comes back.", "HOPE IS NOT A PLAN", "price hope", "chart_down", null, "cross", "worried"], ["Small losses grow into big ones.", "SMALL LOSS GROWS BIG", "losses big", "chart_down", "coins", "warn", "worried"]],
    protect: [["Decide your exit before you buy.", "EXIT FIRST", "exit buy", "calendar", "shield", "check"], ["A stop loss sells for you at a set price.", "STOP LOSS = AUTO EXIT", "stop loss", "shield", "chart_down", "check"], ["Put it where your idea is proven wrong.", "WHERE YOU ARE WRONG", "idea wrong", "magnifier", "chart_down", "check"], ["Never move your stop loss further away.", "NEVER MOVE IT AWAY", "stop move", "shield", null, "cross"]],
    rule: ["Plan the trade, then trade the plan.", "PLAN THE TRADE", "plan trade"] },
  two_factor_auth: { facts: [["A big 2023 study measured two factor login.","2023 STUDY","study login","magnifier","lock"],["It blocked 99.22 percent of takeovers.","99.22% BLOCKED","blocked takeovers","shield","hacker","check"],["With a leaked password: 98.56 percent.","LEAKED: 98.56% BLOCKED","leaked password","key","shield","check"]],
    name: "two factor login", title: "Two Factor Authentication for Crypto", hook: ["A password alone is not enough anymore.", "A PASSWORD IS NOT ENOUGH", "password enough", "lock", null, "warn", "surprised"],
    how: [["Two factor login asks for a second code.", "A SECOND CODE", "code login", "code", "phone"], ["The code changes every 30 seconds.", "NEW CODE EVERY 30 S", "code seconds", "code", "clock"], ["A thief with your password still cannot log in.", "PASSWORD ALONE FAILS", "thief password", "hacker", "lock", "cross"], ["Text message codes can be stolen with a SIM swap.", "SMS CAN BE STOLEN", "codes stolen", "phone", "hacker", "warn", "worried"]],
    protect: [["Use an authenticator app instead of text messages.", "AUTHENTICATOR APP", "app authenticator", "code", "phone", "check"], ["Save the backup codes on paper.", "BACKUP CODES ON PAPER", "backup paper", "seed", "lock", "check"], ["Never tell anyone your code, even support.", "NEVER SHARE A CODE", "code support", "chat", null, "cross"], ["Turn it on for email too, not only the exchange.", "EMAIL TOO", "email exchange", "mail", "shield", "check"]],
    rule: ["A code you share is a door you open.", "SHARED CODE = OPEN DOOR", "code door"] },
  social_engineering: { facts: [["Fake officials took 146 million dollars.","$146 MILLION TAKEN","officials took","bank","hacker","warn","worried"],["The FBI counted 3,585 such reports.","3,585 FBI REPORTS","reports","mail","crowd","cross","worried"],["Both are FBI numbers for 2024.","FBI NUMBERS · 2024","numbers","calendar","magnifier"]],
    name: "social engineering", title: "Social Engineering Scams in Crypto", hook: ["The easiest thing to hack is a person.", "THEY HACK PEOPLE", "hack person", "hacker", "crowd", "warn", "surprised"],
    how: [["Scammers pretend to be someone you trust.", "THEY PRETEND", "scammers trust", "hacker", "chat"], ["They create panic, like a locked account.", "THEY CREATE PANIC", "panic account", "lock", null, "warn", "worried"], ["Or greed, like a double your money offer.", "OR GREED", "greed money", "coins", "gift", "warn"], ["Then they rush you to act right now.", "THEY RUSH YOU", "rush act", "clock", null, "cross"]],
    protect: [["Slow down. Real problems can wait one hour.", "SLOW DOWN", "slow wait", "clock", null, "check"], ["Call back on a number you find yourself.", "CALL BACK YOURSELF", "call number", "phone", null, "check"], ["Nobody doubles your crypto. Ever.", "NOBODY DOUBLES CRYPTO", "doubles crypto", "coins", null, "cross"], ["Ask a friend before you send anything.", "ASK A FRIEND", "friend send", "crowd", "shield", "check"]],
    rule: ["Panic plus a rush means a scam.", "PANIC + RUSH = SCAM", "panic scam"] },
};
export const SAFETY_KEYS = Object.keys(SAFETY);
const SAFETY_SRC = { fake_support: "FBI IC3 2024 Internet Crime Report", social_engineering: "FBI IC3 2024 Internet Crime Report", phishing_links: "Scam Sniffer Crypto Phishing Report 2024", fake_airdrop: "Scam Sniffer Crypto Phishing Report 2024",
  seed_phrase: "Chainalysis 2025 crypto theft report", exchange_safety: "Chainalysis 2025 crypto theft report", rug_pull: "Chainalysis, January 2025 market manipulation report", leverage_danger: "CoinGlass liquidation data, October 10, 2025", fomo_and_stop_loss: "CoinGlass liquidation data, October 10, 2025", two_factor_auth: "Microsoft Research 2023 multifactor authentication study" };
export async function safetyData(key) { const S = SAFETY[key]; return { type: "safety", key, name: S.name.toUpperCase(), coin: "", thumb: [S.name.toUpperCase(), "SAFETY", "shield"], desc: "A beginner safety lesson. Numbers: " + SAFETY_SRC[key] + ". Every picture is drawn by our own code." }; }
export function safetyLesson(kind, D) {
  const S = SAFETY[D.key], L = (ch, l) => st(ch, l[0], l[1], l[2].split(" "), "scene", "obj", obj(l[3], l[4], l[5], l[6])), nh = kind === "short" ? 3 : 4;
  const steps = [
    L("Intro", S.hook),
    st("Intro", `This is the ${S.name} trap.`, `THE ${S.name.toUpperCase()} TRAP`, ["trap"], "card", "warn", { icon: "warn" }),
    ...(kind === "long" ? [st("Intro", "Today: how the trick works, and how to stay safe.", "HOW IT WORKS · STAY SAFE", ["trick", "safe"], "card", "question", { icon: "question" })] : []),
    ...S.how.slice(0, nh).map((l) => L("How it works", l)),
    ...S.facts.map((l) => L("How it works", l)), // real sourced numbers (standards rule a), sources in SAFETY_SOURCES
    ...(kind === "long" ? [st("How it works", "Scammers change the story, but the trick stays the same.", "SAME TRICK, NEW STORY", ["scammers", "trick"], "scene", "obj", obj("hacker", "chat"))] : []),
    st("Stay safe", "Here is how to stay safe.", "HOW TO STAY SAFE", ["safe"], "card", "shield", { icon: "shield" }),
    ...S.protect.slice(0, nh).map((l) => L("Stay safe", l)),
    st("Recap", S.rule[0], S.rule[1], S.rule[2].split(" "), "card", "lock", { icon: "lock" }),
    st("Recap", "Share this with a friend who is new to crypto.", "SHARE WITH A FRIEND", ["share", "friend"], "scene", "obj", obj("crowd", "phone")),
    ...(kind === "long" ? [advice("Recap"), whalesEnd("Recap")] : []),
    end("Recap")];
  if (kind === "short") steps.forEach((s) => (s.chapter = ""));
  return { title: kind === "short" ? `${S.title}: Crypto Safety in 60 Seconds` : `${S.title}: How the Trick Works and How to Stay Safe`, steps };
}

// topic id -> { data, lesson, label } (v6-make.mjs TOPICS)
export const TYPE_TOPICS = {
  ...Object.fromEntries(IND_KEYS.map((k) => [k, { data: () => indicatorData(k), lesson: indicatorLesson, label: "INDICATOR SCHOOL", type: "indicator" }])),
  ...Object.fromEntries(Object.keys(COINS).map((c) => ["coin_" + c.toLowerCase(), { data: () => coinData(c), lesson: coinLesson, label: "COIN SCHOOL", type: "coin" }])),
  ...Object.fromEntries(SAFETY_KEYS.map((k) => [k, { data: () => safetyData(k), lesson: safetyLesson, label: "SAFETY SCHOOL", type: "safety" }])),
  whale_week: { data: whaleWeekData, lesson: whaleWeekLesson, label: "WHALE OF THE WEEK", type: "whale_week" },
  replay: { data: replayData, lesson: replayLesson, label: "WHALE REPLAY", type: "replay" },
  recap: { data: recapData, lesson: recapLesson, label: "WEEKLY RECAP", type: "recap" },
};
export const SITE_PAGE = SITE;
