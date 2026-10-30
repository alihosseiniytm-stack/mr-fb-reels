// Seven weekday long videos (English first). One lesson TYPE per weekday so nothing mixes:
//   sat candle pattern | sun indicator | mon whale of the week | tue coin intro | wed whale trade replay | thu beginner safety | fri weekly recap
// Topic of the week comes from topic-plan.json. Every chart is built from live data, never a stock picture.
import { getFeed, getWhaleOfDay, getMids, getCandles, rsi, sma, money, moneySay, px, dateLabel, SITE, BOT } from "./lib.mjs";

const OUTRO = (page) => ({ layout: "outro", kicker: "KEEP LEARNING", headline: "Free whale tracking", bullets: [{ t: "Live whales: marketradarwhale.com" }, { t: "More on this topic: " + page.replace("https://", "") }, { t: "Free Telegram alerts: t.me/MarketRadarWhaleBot" }], mood: "wow", date: dateLabel() });
const OUTRO_SAY = "That is it for today. Everything you saw is free on market radar whale dot com, and our Telegram bot sends you whale alerts. Links are in the description. This is education, not financial advice. See you in the next lesson!";
const base = (o) => ({ date: dateLabel(), ...o });

// ---------- Saturday: candle patterns, found in REAL candles ----------
const body = (c) => Math.abs(c[4] - c[1]), rng = (c) => c[2] - c[3] || 1e-9, up = (c) => c[4] >= c[1];
const lowW = (c) => Math.min(c[1], c[4]) - c[3], upW = (c) => c[2] - Math.max(c[1], c[4]);
export const PATTERNS = {
  hammer: { name: "Hammer", sub: "bullish reversal", find: (k, i) => i > 6 && lowW(k[i]) >= 2 * body(k[i]) && upW(k[i]) <= 0.25 * rng(k[i]) && body(k[i]) > 0.05 * rng(k[i]) && k[i][4] < k[i - 5][4] * 0.985 && 1, dir: 1,
    shape: ["A small body near the TOP of the candle", "A long lower wick, at least twice the body", "Almost no upper wick"], meaning: "Sellers pushed the price far down, but buyers pulled it back up before the candle closed. It can warn that selling pressure is running out." },
  shooting_star: { name: "Shooting star", sub: "bearish reversal", find: (k, i) => i > 6 && upW(k[i]) >= 2 * body(k[i]) && lowW(k[i]) <= 0.25 * rng(k[i]) && body(k[i]) > 0.05 * rng(k[i]) && k[i][4] > k[i - 5][4] * 1.015, dir: -1,
    shape: ["A small body near the BOTTOM of the candle", "A long upper wick, at least twice the body", "Almost no lower wick"], meaning: "Buyers pushed the price up, but sellers slammed it back down. After a rise, it can warn that buying power is fading." },
  doji: { name: "Doji", sub: "indecision", find: (k, i) => i > 6 && body(k[i]) <= 0.08 * rng(k[i]) && rng(k[i]) > (k[i][4] * 0.006) && 1, dir: 0,
    shape: ["Open and close almost the same price", "Wicks on both sides", "Looks like a cross or a plus sign"], meaning: "Buyers and sellers fought to a draw. A doji alone says nothing; it says the old trend is hesitating." },
  bull_engulfing: { name: "Bullish engulfing", sub: "bullish reversal", find: (k, i) => i > 6 && !up(k[i - 1]) && up(k[i]) && k[i][4] > k[i - 1][1] && k[i][1] < k[i - 1][4] && body(k[i]) > 1.5 * body(k[i - 1]) && k[i - 1][4] < k[i - 6][4], dir: 1,
    shape: ["A red candle first", "Then a bigger green candle", "The green body swallows the red body completely"], meaning: "Buyers took over so strongly that one candle erased the last candle of selling." },
  bear_engulfing: { name: "Bearish engulfing", sub: "bearish reversal", find: (k, i) => i > 6 && up(k[i - 1]) && !up(k[i]) && k[i][4] < k[i - 1][1] && k[i][1] > k[i - 1][4] && body(k[i]) > 1.5 * body(k[i - 1]) && k[i - 1][4] > k[i - 6][4], dir: -1,
    shape: ["A green candle first", "Then a bigger red candle", "The red body swallows the green body completely"], meaning: "Sellers took over so strongly that one candle erased the last candle of buying." },
};

async function findPattern(key) {
  const P = PATTERNS[key];
  for (const coin of ["BTC", "ETH", "SOL", "HYPE", "XRP", "DOGE"]) {
    const k = await getCandles(coin, "4h", 400);
    for (let i = k.length - 8; i > 8; i--) if (P.find(k, i)) return { coin, k, i };
  }
  return null;
}

export async function saturday(topic) {
  const key = topic.key || "hammer", P = PATTERNS[key], page = SITE + "/en/candlestick-basics/";
  const f = await findPattern(key);
  if (!f) throw new Error("no real " + key + " found in recent candles");
  const lo = Math.max(0, f.i - 18), win = f.k.slice(lo, f.i + 9), at = f.i - lo;
  const when = new Date(f.k[f.i][0]).toISOString().slice(0, 16).replace("T", " ") + " UTC";
  const after = f.k[Math.min(f.k.length - 1, f.i + 6)][4], move = ((after - f.k[f.i][4]) / f.k[f.i][4]) * 100;
  const good = P.dir === 0 ? null : P.dir > 0 ? move > 0 : move < 0;
  const scenes = [
    { say: `Do you know the ${P.name} candle? Traders call it a ${P.sub} signal. In the next few minutes you will learn how to spot it, with a real example from the ${f.coin} chart, and, honestly, when it fails.`, beats: 1,
      scene: base({ layout: "title", kicker: "CANDLESTICK LESSON · " + P.sub.toUpperCase(), headline: "The " + P.name + " candle", sub: "Learn it on a real " + f.coin + " chart", mood: "wow" }) },
    { say: `First, how to read any candle. The thick part is the body: it shows where the price opened and where it closed. The thin lines are wicks, also called shadows: they show how far the price went up and down in between. Green means the price closed higher, red means it closed lower.`, beats: 3,
      scene: base({ layout: "steps", kicker: "STEP 1 · READ A CANDLE", headline: "Body and wicks", bullets: [{ t: "Body = open to close", beat: 1 }, { t: "Wicks = the highest and lowest price", beat: 2 }, { t: "Green = closed higher, red = closed lower", beat: 3 }], chart: { candles: win, title: f.coin + " · 4 hour candles · live data" } }) },
    { say: `Now the ${P.name}. Look for three things. ${P.shape[0]}. ${P.shape[1]}. ${P.shape[2]}. ${P.meaning}`, beats: 3,
      scene: base({ layout: "steps", kicker: "STEP 2 · SPOT THE " + P.name.toUpperCase(), headline: "Three things to check", bullets: P.shape.map((t, j) => ({ t, beat: j + 1 })), chart: { candles: win, hi: [at], title: f.coin + " · the " + P.name + " is highlighted" } }) },
    { say: `Here is a real one. On ${when}, the ${f.coin} chart printed a ${P.name} at ${px(f.k[f.i][4])} dollars. Six candles later, about a day later, the price was ${px(after)} dollars, a move of ${move >= 0 ? "plus" : "minus"} ${Math.abs(move).toFixed(1)} percent. ${good === null ? "A doji only shows hesitation, so we wait for the next candle." : good ? "This time the signal worked." : "This time the signal failed, and that is normal."}`, beats: 2,
      scene: base({ layout: "chart", kicker: "REAL EXAMPLE · " + f.coin, headline: when, big: { value: (move >= 0 ? "+" : "") + move.toFixed(1) + "%", label: "price change 6 candles later", tone: move >= 0 ? "up" : "dn" }, bullets: [{ t: P.name + " at $" + px(f.k[f.i][4]), beat: 1 }, { t: "Six candles later $" + px(after), beat: 2 }], chart: { candles: win, hi: [at], marks: [{ i: at, price: f.k[f.i][4], label: P.name }, { i: Math.min(win.length - 1, at + 6), price: after, label: "6 candles later", color: move >= 0 ? "#22c55e" : "#ef4444" }], title: f.coin + " · 4 hour · real data" } }) },
    { say: `Remember three rules. One: a single candle is never a promise, it is a clue. Two: wait for the next candle to confirm. Three: always decide where you are wrong first, with a stop loss, before you ever click buy.`, beats: 3,
      scene: base({ layout: "cards", kicker: "STEP 3 · USE IT SAFELY", headline: "Three rules", cards: [{ k: "Rule 1", v: "A clue, not a promise", beat: 1 }, { k: "Rule 2", v: "Wait for confirmation", beat: 2 }, { k: "Rule 3", v: "Set the stop loss first", beat: 3 }], bullets: [], mood: "wow" }) },
    { say: OUTRO_SAY, beats: 1, scene: OUTRO(page) },
  ];
  return pack("long", `${P.name} candle explained on a real ${f.coin} chart`, page, scenes, { topic: key, thumb: { headline: "The " + P.name + " candle", sub: "real " + f.coin + " chart", big: move >= 0 ? "+" + move.toFixed(1) + "%" : move.toFixed(1) + "%" } });
}

// ---------- Sunday: indicator ----------
export async function sunday(topic) {
  const page = SITE + "/en/technical-analysis-basics/", coin = topic.coin || "BTC";
  const k = await getCandles(coin, "1h", 96), cl = k.map((x) => x[4]), r = rsi(cl), ma = sma(cl, 20);
  const last = r[r.length - 1];
  let ev = -1; for (let i = r.length - 20; i > 14; i--) if (r[i] >= 70 || r[i] <= 30) { ev = i; break; }
  const hasEv = ev > 0, evHigh = hasEv && r[ev] >= 70, after = hasEv ? cl[Math.min(cl.length - 1, ev + 6)] : null, mv = hasEv ? ((after - cl[ev]) / cl[ev]) * 100 : 0;
  const scenes = [
    { say: `Is the price too high or too low? There is a famous tool that tries to answer exactly that. It is called the R S I, the Relative Strength Index, and today you will read it on a live ${coin} chart.`, beats: 1,
      scene: base({ layout: "title", kicker: "INDICATOR LESSON", headline: "RSI in 5 minutes", sub: "Live " + coin + " chart · RSI is " + last.toFixed(0) + " right now", mood: "wow" }) },
    { say: `The R S I is a single line that moves between zero and one hundred. It compares how strong the recent up moves were with the recent down moves. Most charts use the last fourteen candles. High number means buyers have been very strong lately. Low number means sellers have been.`, beats: 3,
      scene: base({ layout: "steps", kicker: "STEP 1 · WHAT IT IS", headline: "A line from 0 to 100", bullets: [{ t: "Compares recent ups with recent downs", beat: 1 }, { t: "Standard setting: 14 candles", beat: 2 }, { t: "High = strong buying, low = strong selling", beat: 3 }], chart: { candles: k.slice(-60), rsi: r.slice(-60), title: coin + " · 1 hour · RSI 14 · live" } }) },
    { say: `The two famous lines are seventy and thirty. Above seventy, traders call the market overbought, meaning it rose fast and may be stretched. Below thirty, oversold, meaning it fell fast and may bounce. The key word is may. It is a warning light, not a command.`, beats: 3,
      scene: base({ layout: "cards", kicker: "STEP 2 · THE TWO LINES", headline: "70 and 30", cards: [{ k: "Above 70", v: "Overbought", tone: "dn", beat: 1 }, { k: "Between", v: "Neutral", beat: 2 }, { k: "Below 30", v: "Oversold", tone: "up", beat: 3 }], bullets: [], mood: "wow" }) },
    { say: hasEv ? `Here is a real moment. On the ${coin} chart, the R S I touched ${r[ev].toFixed(0)}, which is ${evHigh ? "overbought" : "oversold"}. Six hours later the price had moved ${mv >= 0 ? "plus" : "minus"} ${Math.abs(mv).toFixed(1)} percent. ${evHigh === (mv < 0) ? "The warning light was right this time." : "This time the warning light was wrong, the trend simply kept going."} Right now the R S I is ${last.toFixed(0)}.` : `Right now the R S I on ${coin} is ${last.toFixed(0)}, inside the normal zone, so the indicator is not warning about anything. That is the most common state, and it teaches an important lesson: most of the time, there is no signal.`, beats: 2,
      scene: base({ layout: "chart", kicker: "REAL EXAMPLE · " + coin, headline: hasEv ? "RSI " + r[ev].toFixed(0) : "RSI now " + last.toFixed(0), big: { value: hasEv ? (mv >= 0 ? "+" : "") + mv.toFixed(1) + "%" : last.toFixed(0), label: hasEv ? "6 hours after the signal" : "RSI right now", tone: hasEv ? (mv >= 0 ? "up" : "dn") : "" }, bullets: [{ t: hasEv ? (evHigh ? "Overbought reading" : "Oversold reading") : "Neutral zone", beat: 1 }, { t: "Live value now: " + last.toFixed(0), beat: 2 }], chart: { candles: k.slice(-60), rsi: r.slice(-60), hi: hasEv ? [ev - (k.length - 60)] : [], title: coin + " · 1 hour · real data" } }) },
    { say: `The big mistake is selling just because the R S I passed seventy. In a strong trend, the R S I can stay above seventy for days while the price keeps climbing. So use it together with the trend, with support and resistance, and with what the whales are doing. And never risk money you cannot afford to lose.`, beats: 3,
      scene: base({ layout: "cards", kicker: "STEP 3 · THE TRAP", headline: "RSI is not a command", cards: [{ k: "Strong trend", v: "Stays overbought", beat: 1 }, { k: "Use together with", v: "Trend + levels", beat: 2 }, { k: "Always", v: "Use a stop loss", beat: 3 }], bullets: [], mood: "sad" }) },
    { say: OUTRO_SAY, beats: 1, scene: OUTRO(page) },
  ];
  return pack("long", `RSI explained on a live ${coin} chart: overbought and oversold`, page, scenes, { topic: "rsi", thumb: { headline: "RSI explained", sub: "live " + coin + " chart", big: "RSI " + last.toFixed(0) } });
}

// ---------- shared whale helpers ----------
async function whalePack() {
  const [feed, mids, wod] = await Promise.all([getFeed(), getMids(), getWhaleOfDay().catch(() => null)]);
  const rows = [...feed].sort((a, b) => b.value - a.value).filter((r) => mids[r.coin]);
  const longs = rows.filter((r) => r.szi > 0), shorts = rows.filter((r) => r.szi < 0);
  const sum = (a) => a.reduce((s, r) => s + r.value, 0);
  const pnl = (r) => (((+mids[r.coin] - r.entryPx) / r.entryPx) * (r.szi < 0 ? -1 : 1)) * r.leverage * 100;
  return { rows, mids, wod, longs, shorts, sum, pnl, longV: sum(longs), shortV: sum(shorts) };
}

// ---------- Monday: whale of the week = biggest whale + how the whole whale crowd leans ----------
export async function monday() {
  const page = SITE + "/en/how-to-read-whale-activity/", w = await whalePack();
  const t = w.rows[0], tp = w.pnl(t), side = t.szi < 0 ? "short" : "long";
  const lean = w.longV >= w.shortV ? "long" : "short", pct = Math.round((Math.max(w.longV, w.shortV) / (w.longV + w.shortV)) * 100);
  const liqDist = t.liqPx ? Math.abs(t.liqPx - +w.mids[t.coin]) / +w.mids[t.coin] * 100 : null;
  const k = await getCandles(t.coin, "4h", 60);
  const scenes = [
    { say: `Welcome to whale of the week. This week the biggest position on our tracker is a ${moneySay(t.value)} ${side} on ${t.coin}. Who is behind it, and what does it tell us? Let us look.`, beats: 1,
      scene: base({ layout: "title", kicker: "WHALE OF THE WEEK", headline: money(t.value) + " " + t.coin + " " + side.toUpperCase(), sub: "The biggest bet on the tracker today", mood: "wow" }) },
    { say: `Here are the facts. The wallet starts with ${t.address.slice(0, 6)}. The size is ${moneySay(t.value)}. It entered at ${px(t.entryPx)} dollars with leverage ${t.leverage} times. The price now is ${px(+w.mids[t.coin])}, so right now this whale is ${tp >= 0 ? "up" : "down"} ${Math.abs(tp).toFixed(1)} percent on the money it put in.`, beats: 3,
      scene: base({ layout: "cards", kicker: "THE FACTS", headline: t.coin + " " + side, cards: [{ k: "Size", v: money(t.value), beat: 1 }, { k: "Entry", v: "$" + px(t.entryPx), beat: 2 }, { k: "Leverage", v: t.leverage + "x", beat: 2 }, { k: "Price now", v: "$" + px(+w.mids[t.coin]), beat: 3 }, { k: "Result now", v: (tp >= 0 ? "+" : "") + tp.toFixed(1) + "%", tone: tp >= 0 ? "up" : "dn", beat: 3 }, { k: "Wallet", v: t.address.slice(0, 6) + "..", beat: 1 }], bullets: [] }) },
    { say: `On the chart you can see where it came in. ${liqDist ? `The liquidation price is ${px(t.liqPx)} dollars, about ${liqDist.toFixed(0)} percent away. That is the price where the exchange would close the position by force.` : `This position shows no close liquidation price, which usually means low leverage or a large cushion.`}`, beats: 2,
      scene: base({ layout: "chart", kicker: "ON THE CHART", headline: t.coin + " · 4 hour", big: { value: (tp >= 0 ? "+" : "") + tp.toFixed(1) + "%", label: "whale result now", tone: tp >= 0 ? "up" : "dn" }, bullets: [{ t: "Entry $" + px(t.entryPx), beat: 1 }, { t: liqDist ? "Liquidation $" + px(t.liqPx) : "No near liquidation", beat: 2 }], chart: { candles: k, hlines: [{ price: t.entryPx, label: "entry " + px(t.entryPx), fit: true }, ...(t.liqPx && liqDist < 40 ? [{ price: t.liqPx, label: "liq " + px(t.liqPx), color: "#ef4444", fit: true }] : [])], marks: [{ i: k.length - 1, price: +w.mids[t.coin], label: "now" }], title: t.coin + " · real data" } }) },
    { say: `One whale is a story. The whole crowd is a trend. Among the ${w.rows.length} biggest positions we track, ${w.longs.length} are longs worth ${money(w.longV)} and ${w.shorts.length} are shorts worth ${money(w.shortV)}. So the whale crowd leans ${lean}, about ${pct} percent of the money.`, beats: 3,
      scene: base({ layout: "cards", kicker: "THE WHOLE CROWD", headline: "Whales lean " + lean, cards: [{ k: "Longs", v: w.longs.length + " · " + money(w.longV), tone: "up", beat: 1 }, { k: "Shorts", v: w.shorts.length + " · " + money(w.shortV), tone: "dn", beat: 2 }, { k: "Money on the " + lean + " side", v: pct + "%", beat: 3 }], bullets: [], mood: "wow" }) },
    { say: `What should you learn from this? Whales are not magicians, they lose too. Big size does not mean a good trade. Use whale data as one input: it shows where big money is positioned, and where it could be forced out. Never copy a position blindly.`, beats: 3,
      scene: base({ layout: "cards", kicker: "THE LESSON", headline: "How to use whale data", cards: [{ k: "Whales", v: "also lose", beat: 1 }, { k: "Size", v: "is not skill", beat: 2 }, { k: "Never", v: "copy blindly", beat: 3 }], bullets: [] }) },
    { say: OUTRO_SAY, beats: 1, scene: OUTRO(page) },
  ];
  return pack("long", `Whale of the week: ${money(t.value)} ${t.coin} ${side}, and where the whale crowd leans`, page, scenes, { topic: "whale:" + t.address + ":" + t.coin, thumb: { headline: money(t.value) + " " + t.coin + " " + side.toUpperCase(), sub: "whale of the week", big: (tp >= 0 ? "+" : "") + tp.toFixed(0) + "%" } });
}

// ---------- Wednesday: one real whale trade replayed on a real chart ----------
export async function wednesday() {
  const page = SITE + "/en/leverage-trading/", w = await whalePack();
  const t = w.rows[2] || w.rows[0], tp = w.pnl(t), side = t.szi < 0 ? "short" : "long", now = +w.mids[t.coin];
  const k = await getCandles(t.coin, "1h", 72);
  let ei = k.length - 1; for (let i = k.length - 1; i >= 0; i--) if (k[i][3] <= t.entryPx && k[i][2] >= t.entryPx) { ei = i; break; }
  const risk = t.liqPx ? Math.abs(t.liqPx - t.entryPx) / t.entryPx * 100 : null;
  const scenes = [
    { say: `Let us replay a real whale trade, step by step, like a coach watching a game. The player: a wallet starting with ${t.address.slice(0, 6)}. The game: a ${moneySay(t.value)} ${side} on ${t.coin}. Right now it is ${tp >= 0 ? "winning" : "losing"}.`, beats: 1,
      scene: base({ layout: "title", kicker: "WHALE TRADE REPLAY", headline: t.coin + " " + side.toUpperCase() + " · " + money(t.value), sub: "Replayed on the real chart", mood: tp >= 0 ? "wow" : "sad" }) },
    { say: `Step one, the entry. The whale got in around ${px(t.entryPx)} dollars. See the yellow line? That is the entry. Price was last there about ${Math.max(1, k.length - 1 - ei)} hours ago. A ${side} means the whale ${side === "long" ? "wins if the price goes up" : "wins if the price goes down"}.`, beats: 2,
      scene: base({ layout: "chart", kicker: "STEP 1 · THE ENTRY", headline: "Entry $" + px(t.entryPx), bullets: [{ t: side.toUpperCase() + " = bet on " + (side === "long" ? "UP" : "DOWN"), beat: 1 }, { t: "Size " + money(t.value), beat: 2 }], chart: { candles: k, hlines: [{ price: t.entryPx, label: "entry " + px(t.entryPx), fit: true }], marks: [{ i: ei, price: t.entryPx, label: "entry zone" }], title: t.coin + " · 1 hour · real data" } }) },
    { say: `Step two, the leverage. This whale uses ${t.leverage} times leverage. That multiplies profit and loss by ${t.leverage}. ${risk ? `The red line is the liquidation price, ${px(t.liqPx)} dollars, only ${risk.toFixed(0)} percent from the entry. Touch it and the position is gone.` : `There is no liquidation line close by, so this position has a big safety cushion.`}`, beats: 2,
      scene: base({ layout: "chart", kicker: "STEP 2 · THE RISK", headline: t.leverage + "x leverage", bullets: [{ t: "Profit and loss x" + t.leverage, beat: 1 }, { t: risk ? "Liquidation " + risk.toFixed(0) + "% from entry" : "Large cushion", beat: 2 }], chart: { candles: k, hlines: [{ price: t.entryPx, label: "entry " + px(t.entryPx), fit: true }, ...(t.liqPx && risk < 60 ? [{ price: t.liqPx, label: "liq " + px(t.liqPx), color: "#ef4444", fit: true }] : [])], title: t.coin + " · where it gets dangerous" } }) },
    { say: `Step three, the result right now. The price is ${px(now)} dollars. On the money the whale put in, that is ${tp >= 0 ? "plus" : "minus"} ${Math.abs(tp).toFixed(1)} percent. Without leverage, the same move would be only ${(Math.abs(tp) / t.leverage).toFixed(1)} percent. That is how leverage works: it makes everything bigger, the wins and the losses.`, beats: 2,
      scene: base({ layout: "chart", kicker: "STEP 3 · THE RESULT NOW", headline: "Result today", big: { value: (tp >= 0 ? "+" : "") + tp.toFixed(1) + "%", label: "on the whale's own money", tone: tp >= 0 ? "up" : "dn" }, bullets: [{ t: "Price now $" + px(now), beat: 1 }, { t: "Same move, no leverage: " + (tp >= 0 ? "+" : "-") + (Math.abs(tp) / t.leverage).toFixed(1) + "%", beat: 2 }], chart: { candles: k, hlines: [{ price: t.entryPx, label: "entry", fit: true }], marks: [{ i: k.length - 1, price: now, label: "now " + px(now), color: tp >= 0 ? "#22c55e" : "#ef4444" }], title: t.coin + " · result" } }) },
    { say: `So what can we learn? One: big money still faces liquidation risk. Two: the entry price is the line that matters, above it or below it decides everything. Three: you do not need a whale's size to learn from its trade, just watch how it manages risk, then practice with small money first.`, beats: 3,
      scene: base({ layout: "cards", kicker: "WHAT WE LEARNED", headline: "Three takeaways", cards: [{ k: "1", v: "Whales face liquidation", beat: 1 }, { k: "2", v: "Entry is the key line", beat: 2 }, { k: "3", v: "Watch the risk, not the size", beat: 3 }], bullets: [] }) },
    { say: OUTRO_SAY, beats: 1, scene: OUTRO(page) },
  ];
  return pack("long", `Whale trade replay: ${money(t.value)} ${t.coin} ${side} on the real chart`, page, scenes, { topic: "replay:" + t.address + ":" + t.coin, thumb: { headline: "Replay: " + t.coin + " " + side, sub: money(t.value) + " whale trade", big: (tp >= 0 ? "+" : "") + tp.toFixed(0) + "%" } });
}

// ---------- Tuesday: coin intro ----------
const COINS = {
  SOL: { name: "Solana", page: "/en/what-is-solana/", facts: ["A fast, low-fee blockchain launched in 2020", "Created by Anatoly Yakovenko, a former Qualcomm engineer", "Popular for memecoins, payments and trading apps", "Uses proof of stake plus a clock idea called proof of history"], say: "Solana is a blockchain, a shared public ledger, built for speed and tiny fees. It launched in 2020, created by Anatoly Yakovenko. Its coin is called S O L, and you use it to pay fees and to stake. It became famous for memecoins and fast trading apps, and also for network outages in its early years, which is a risk worth knowing." },
};
export async function tuesday(topic) {
  const c = COINS[topic.coin || "SOL"], coin = topic.coin || "SOL", page = SITE + c.page;
  const [d, mids, feed] = await Promise.all([getCandles(coin, "1d", 60), getMids(), getFeed()]);
  const now = +mids[coin], m30 = ((now - d[d.length - 31][4]) / d[d.length - 31][4]) * 100, hi = Math.max(...d.slice(-30).map((x) => x[2])), lo = Math.min(...d.slice(-30).map((x) => x[3]));
  const mine = feed.filter((r) => r.coin === coin), mv = mine.reduce((s, r) => s + r.value, 0);
  const scenes = [
    { say: `Coin intro time. Today: ${c.name}, ticker ${coin}. What is it, what is it used for, what are the risks, and what are the whales doing with it right now? Everything with live numbers.`, beats: 1,
      scene: base({ layout: "title", kicker: "COIN INTRO", headline: c.name + " (" + coin + ")", sub: "Price now $" + px(now), mood: "wow" }) },
    { say: c.say, beats: 4,
      scene: base({ layout: "steps", kicker: "WHAT IT IS", headline: c.name + " in four lines", bullets: c.facts.map((t, i) => ({ t, beat: i + 1 })), chart: { candles: d.slice(-45), title: coin + " · daily candles · live data" } }) },
    { say: `Now the numbers, live. ${coin} trades at ${px(now)} dollars. Over the last thirty days it moved ${m30 >= 0 ? "plus" : "minus"} ${Math.abs(m30).toFixed(1)} percent, with a high of ${px(hi)} and a low of ${px(lo)}. That range tells you how bumpy the ride has been.`, beats: 3,
      scene: base({ layout: "cards", kicker: "LIVE NUMBERS", headline: coin + " last 30 days", cards: [{ k: "Price now", v: "$" + px(now), beat: 1 }, { k: "30 day change", v: (m30 >= 0 ? "+" : "") + m30.toFixed(1) + "%", tone: m30 >= 0 ? "up" : "dn", beat: 2 }, { k: "30 day range", v: "$" + px(lo) + " to $" + px(hi), beat: 3 }], bullets: [] }) },
    { say: mine.length ? `What are the whales doing? Our tracker shows ${mine.length} big ${coin} futures positions right now, worth ${money(mv)} in total. Check the live whale page to see if the big money is long or short.` : `What are the whales doing? At this moment our tracker shows no giant ${coin} futures position, so the big money is quiet here. Check the live page, it changes every few minutes.`, beats: 2,
      scene: base({ layout: "chart", kicker: "WHAT THE WHALES DO", headline: coin + " whales", big: { value: mine.length ? money(mv) : "quiet", label: mine.length ? mine.length + " big positions" : "no giant positions now" }, bullets: [{ t: "Live feed on marketradarwhale.com", beat: 1 }, { t: "Updates every few minutes", beat: 2 }], chart: { candles: d.slice(-30), title: coin + " · 30 days" } }) },
    { say: `Risks, in plain words. Prices can swing a lot in a day. A coin can fall ninety percent and never return. Never put in money you need for rent or food, and never trust anyone who promises a guaranteed return.`, beats: 3,
      scene: base({ layout: "cards", kicker: "RISKS", headline: "Know before you buy", cards: [{ k: "Swings", v: "can be huge", beat: 1 }, { k: "Losses", v: "can be permanent", beat: 2 }, { k: "Promises", v: "of sure profit = scam", beat: 3 }], bullets: [], mood: "sad" }) },
    { say: OUTRO_SAY, beats: 1, scene: OUTRO(page) },
  ];
  return pack("long", `What is ${c.name} (${coin})? Live price, risks and what whales are doing`, page, scenes, { topic: "coin:" + coin, thumb: { headline: "What is " + c.name + "?", sub: "live " + coin + " data", big: "$" + px(now) } });
}

// ---------- Thursday: beginner safety ----------
const SAFETY = {
  seed_phrase: { title: "Never share your seed phrase: how crypto wallets get emptied", rule: "No real person or website will ever need your seed phrase", hook: "There is one secret in crypto that, if you share it, lets a stranger empty your wallet in seconds.", page: "/en/crypto-scams/",
    what: "Your seed phrase is a list of twelve or twenty four words. It is the master key to your wallet. Anyone who has these words controls all your coins, from anywhere in the world, and there is no bank to call to reverse it.",
    tricks: [["Fake support", "A message says: we are wallet support, send your words to verify."], ["Fake website", "A page asks you to type the words to claim an airdrop."], ["Fake app", "A copy of a wallet app asks for your phrase on first launch."]],
    steps: ["Write it on paper, never in a photo or in the cloud", "Never type it into any website", "Real support never asks for it, ever", "Use a hardware wallet for large amounts"] },
};
export async function thursday(topic) {
  const s = SAFETY[topic.key || "seed_phrase"], page = SITE + s.page;
  const scenes = [
    { say: s.hook + " This is the beginner safety lesson, and it takes three minutes.", beats: 1, scene: base({ layout: "title", kicker: "BEGINNER SAFETY", headline: "The one secret you never share", sub: "Seed phrase safety", mood: "wow" }) },
    { say: s.what, beats: 3, scene: base({ layout: "outro", kicker: "WHAT IT IS", headline: "Seed phrase = master key", bullets: [{ t: "12 or 24 words", beat: 1 }, { t: "Controls every coin in the wallet", beat: 2 }, { t: "No bank, no undo button", beat: 3 }], mood: "wow" }) },
    { say: `Here are the three most common tricks. ${s.tricks.map((t) => t[0] + ". " + t[1]).join(" ")}`, beats: 3, scene: base({ layout: "cards", kicker: "THE TRICKS", headline: "How scammers ask for it", cards: s.tricks.map((t, i) => ({ k: t[0], v: t[1].split(" ").slice(0, 4).join(" ") + "...", beat: i + 1, tone: "dn" })), bullets: [{ t: s.tricks[0][1], beat: 1 }, { t: s.tricks[1][1], beat: 2 }, { t: s.tricks[2][1], beat: 3 }], mood: "sad" }) },
    { say: `What to do instead. ${s.steps.join(". ")}. If you ever typed your phrase somewhere by mistake, move your coins to a new wallet immediately.`, beats: 4, scene: base({ layout: "outro", kicker: "WHAT TO DO", headline: "Four safe habits", bullets: s.steps.map((t, i) => ({ t, beat: i + 1 })), mood: "wow" }) },
    { say: `Remember the rule: ${s.rule}. Say it out loud once. And if something feels too good to be true, it is. Want to practice safely? Start with tiny amounts.`, beats: 1, scene: base({ layout: "title", kicker: "THE RULE", headline: s.rule, sub: "Save this video for the next time someone asks", mood: "wow" }) },
    { say: OUTRO_SAY, beats: 1, scene: OUTRO(page) },
  ];
  return pack("long", s.title, page, scenes, { topic: "safety:" + (topic.key || "seed_phrase"), thumb: { headline: "Never share this", sub: "beginner safety", big: "12 WORDS" } });
}

// ---------- Friday: weekly recap ----------
export async function friday() {
  const page = SITE + "/en/whales/", w = await whalePack();
  const btc = await getCandles("BTC", "1d", 10), eth = await getCandles("ETH", "1d", 10);
  const ch = (k) => ((k[k.length - 1][4] - k[k.length - 8][4]) / k[k.length - 8][4]) * 100, cb = ch(btc), ce = ch(eth);
  const top = w.rows.slice(0, 3), best = [...w.rows].sort((a, b) => w.pnl(b) - w.pnl(a))[0], worst = [...w.rows].sort((a, b) => w.pnl(a) - w.pnl(b))[0];
  const lean = w.longV >= w.shortV ? "long" : "short";
  const scenes = [
    { say: `Friday recap! Seven days in crypto, in under three minutes: how the two giants moved, what the biggest whales hold, and the best and worst whale trades right now.`, beats: 1, scene: base({ layout: "title", kicker: "WEEKLY RECAP", headline: "The week in whales", sub: dateLabel(), mood: "wow" }) },
    { say: `First, the market. Over the last seven days, Bitcoin moved ${cb >= 0 ? "plus" : "minus"} ${Math.abs(cb).toFixed(1)} percent and Ethereum ${ce >= 0 ? "plus" : "minus"} ${Math.abs(ce).toFixed(1)} percent. Bitcoin is now at ${px(btc[btc.length - 1][4])} dollars.`, beats: 2,
      scene: base({ layout: "chart", kicker: "THE MARKET", headline: "Bitcoin and Ethereum", big: { value: (cb >= 0 ? "+" : "") + cb.toFixed(1) + "%", label: "Bitcoin, 7 days", tone: cb >= 0 ? "up" : "dn" }, bullets: [{ t: "ETH 7 days: " + (ce >= 0 ? "+" : "") + ce.toFixed(1) + "%", beat: 1 }, { t: "BTC now $" + px(btc[btc.length - 1][4]), beat: 2 }], chart: { candles: btc, title: "BTC · daily · live data" } }) },
    { say: `Second, the three biggest whale positions today. ${top.map((r, i) => `Number ${i + 1}: ${moneySay(r.value)} ${r.szi < 0 ? "short" : "long"} on ${r.coin}`).join(". ")}.`, beats: 3,
      scene: base({ layout: "cards", kicker: "TOP 3 WHALES", headline: "The biggest bets", cards: top.map((r, i) => ({ k: "#" + (i + 1) + " " + r.coin, v: money(r.value) + " " + (r.szi < 0 ? "SHORT" : "LONG"), tone: r.szi < 0 ? "dn" : "up", beat: i + 1 })), bullets: [] }) },
    { say: `Third, the crowd. Whales lean ${lean} right now: ${money(w.longV)} in longs against ${money(w.shortV)} in shorts.`, beats: 2,
      scene: base({ layout: "cards", kicker: "THE CROWD", headline: "Longs vs shorts", cards: [{ k: "Longs", v: money(w.longV), tone: "up", beat: 1 }, { k: "Shorts", v: money(w.shortV), tone: "dn", beat: 2 }, { k: "Leaning", v: lean.toUpperCase(), beat: 2 }], bullets: [] }) },
    { say: `Fourth, scoreboard. The best open whale trade right now is a ${best.szi < 0 ? "short" : "long"} on ${best.coin}, up ${w.pnl(best).toFixed(0)} percent. The worst is a ${worst.szi < 0 ? "short" : "long"} on ${worst.coin}, down ${Math.abs(w.pnl(worst)).toFixed(0)} percent. Whales win and lose, just like us.`, beats: 2,
      scene: base({ layout: "cards", kicker: "SCOREBOARD", headline: "Best and worst open trade", cards: [{ k: "Best · " + best.coin, v: "+" + w.pnl(best).toFixed(0) + "%", tone: "up", beat: 1 }, { k: "Worst · " + worst.coin, v: w.pnl(worst).toFixed(0) + "%", tone: "dn", beat: 2 }], bullets: [] }) },
    { say: OUTRO_SAY, beats: 1, scene: OUTRO(page) },
  ];
  return pack("long", `Weekly whale recap: Bitcoin ${cb >= 0 ? "+" : ""}${cb.toFixed(1)}%, whales lean ${lean}`, page, scenes, { topic: "recap:" + new Date().toISOString().slice(0, 10), thumb: { headline: "Weekly whale recap", sub: "BTC " + (cb >= 0 ? "+" : "") + cb.toFixed(1) + "% this week", big: lean.toUpperCase() } });
}

function pack(kind, title, page, scenes, extra) {
  return { kind, title, page, scenes, text: scenes.map((s) => s.say).join(" "), ...extra };
}
export const LONG_BY_DAY = { 0: sunday, 1: monday, 2: tuesday, 3: wednesday, 4: thursday, 5: friday, 6: saturday };
