// X card v3 chart style for videos (T50-08 v3). MIRROR of chartSvg() in mr-channel-post/x_card.mjs (separate repo, cannot import):
// candles end at ~76% width, dashed blue ENTRY line + solid NOW line with labels on the right axis, entry arrow,
// shaded entry->now zone (green profit / red loss) and a ROE badge. Candles here are arrays [t,o,h,l,c,v] (lib.getCandles).
// fs = font scale (1 = the 1200x675 card). Optional liq line (red, dotted) when it lies inside the range.
import { px } from "./lib.mjs";

const UP = "#35e6b8", DN = "#ff5470", BLUE = "#378ADD", GRID = "#1c2e38", TXT = "#7fa39a", LIQ = "#ff2d55";

// entry time = the most recent candle whose high/low range contains the entry price (else the first candle)
export function entryIndex(candles, entry) {
  for (let i = candles.length - 1; i >= 0; i--) if (candles[i][3] <= entry && candles[i][2] >= entry) return i;
  return 0;
}

export function xChartSvg({ candles, entry, now, side, lev, liq, title, hi: his = [], W = 1000, H = 560, fs = 1.4, show = 9, focus = null }) {
  const cur = now ?? candles.at(-1)[4];
  const useLiq = liq && Math.abs(liq - cur) / cur < 0.25 ? liq : null;
  const T = title ? Math.round(34 * fs) : 0, Hc = H - T;
  let lo = Math.min(...candles.map((c) => c[3]), entry ?? cur, cur), hi = Math.max(...candles.map((c) => c[2]), entry ?? cur, cur);
  if (useLiq) { lo = Math.min(lo, useLiq); hi = Math.max(hi, useLiq); }
  const pad = (hi - lo) * 0.1 || 1, y0 = lo - pad, y1 = hi + pad;
  const LW = Math.round(134 * fs), AX = W - LW, CW = Math.min(Math.round(W * 0.76), AX - Math.round(150 * fs)); // leave room for the ROE badge on small charts
  const n = candles.length, X = (i) => (i / n) * CW, Y = (p) => T + Hc - ((p - y0) / (y1 - y0)) * Hc;
  const w = Math.max(2, CW / n - 2);
  const bars = candles.map((c, i) => { const col = c[4] >= c[1] ? UP : DN, x = X(i) + w / 2;
    return `<line x1="${x}" x2="${x}" y1="${Y(c[2])}" y2="${Y(c[3])}" stroke="${col}" stroke-width="${1.5 * fs}"/><rect x="${x - w / 2}" y="${Math.min(Y(c[1]), Y(c[4]))}" width="${w}" height="${Math.max(1.5, Math.abs(Y(c[1]) - Y(c[4])))}" fill="${col}"/>`; }).join("");
  const F = (s) => Math.round(s * fs);
  const parts = { grid: "", zone: "", entry: "", now: "", arrow: "", pl: "", liq: "", labels: "", focus: "" };
  const FC = "#fbbf24", ring = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${FC}" stroke-width="${F(6)}"/><circle cx="${x}" cy="${y}" r="${r + F(9)}" fill="none" stroke="${FC}" stroke-opacity=".35" stroke-width="${F(4)}"/>`;
  const outline = (y) => `<rect x="${AX - F(2)}" y="${y - F(21)}" width="${W - AX + F(1)}" height="${F(42)}" rx="${F(8)}" fill="none" stroke="${FC}" stroke-width="${F(5)}"/>`;
  const hasE = entry != null && show >= 2;
  const long = side === "LONG", ey = hasE ? Y(entry) : null, ny = Y(cur);
  const profit = hasE ? (long ? cur >= entry : cur <= entry) : true, zc = profit ? UP : DN;
  parts.grid = [0, 1, 2, 3].map((i) => { const p = y0 + ((y1 - y0) * i) / 3, y = Y(p); const hide = (ey != null && Math.abs(y - ey) < F(22)) || Math.abs(y - ny) < F(22);
    return `<line x1="0" x2="${AX}" y1="${y}" y2="${y}" stroke="${GRID}" stroke-width="${fs}"/>${hide ? "" : `<text x="${AX + F(10)}" y="${y + F(7)}" fill="${TXT}" font-size="${F(20)}">${px(p)}</text>`}`; }).join("");
  const box = (y, col, txt, fg = "#06120f") => `<rect x="${AX + 2}" y="${y - F(16)}" width="${W - AX - 2}" height="${F(32)}" rx="${F(5)}" fill="${col}"/><text x="${AX + F(8)}" y="${y + F(7)}" fill="${fg}" font-size="${F(19)}" font-weight="700">${txt}</text>`;
  let labels = [];
  if (hasE) {
    const ei = entryIndex(candles, entry), ex = X(ei) + w / 2, ec = candles[ei];
    parts.entry = `<line x1="0" x2="${AX}" y1="${ey}" y2="${ey}" stroke="${BLUE}" stroke-dasharray="${F(8)} ${F(6)}" stroke-width="${2.5 * fs}"/>`;
    const ay = long ? Y(ec[3]) + F(8) : Y(ec[2]) - F(8), aw = F(13), ah = F(24);
    const ar = long ? `${ex},${ay} ${ex - aw},${ay + ah} ${ex + aw},${ay + ah}` : `${ex},${ay} ${ex - aw},${ay - ah} ${ex + aw},${ay - ah}`;
    parts.arrow = `<polygon points="${ar}" fill="${long ? UP : DN}" stroke="#070b0f" stroke-width="${2 * fs}"/>`;
    labels.push([ey, BLUE, "Entry " + px(entry), "#fff"]);
    if (focus === "entry") parts.focus += ring(ex, ey, F(30)) + `<line x1="0" x2="${AX}" y1="${ey}" y2="${ey}" stroke="${FC}" stroke-opacity=".45" stroke-width="${F(9)}"/>`;
    if (show >= 3) {
      parts.zone = Math.abs(ey - ny) > 1 ? `<rect x="${ex}" y="${Math.min(ey, ny)}" width="${Math.max(0, CW - ex)}" height="${Math.abs(ey - ny)}" fill="${zc}" opacity="0.3"/>` : "";
      const move = ((cur - entry) / entry) * (long ? 1 : -1) * 100, roe = move * (lev || 1), bx = CW + F(14), bw = AX - CW - F(28);
      const by = Math.min(Math.max((ey + ny) / 2, T + F(40)), H - F(40));
      parts.pl = `<rect x="${bx}" y="${by - F(34)}" width="${bw}" height="${F(68)}" rx="${F(10)}" fill="${zc}"/><text x="${bx + bw / 2}" y="${by + F(2)}" text-anchor="middle" fill="#06120f" font-size="${F(28)}" font-weight="800">${roe >= 0 ? "+" : "−"}${Math.abs(roe).toFixed(1)}%</text><text x="${bx + bw / 2}" y="${by + F(25)}" text-anchor="middle" fill="#06120f" font-size="${F(16)}" font-weight="600">ROE${lev ? " (" + lev + "x)" : ""}</text>`;
      if (focus === "roe") parts.focus += `<rect x="${bx - F(8)}" y="${by - F(42)}" width="${bw + F(16)}" height="${F(84)}" rx="${F(14)}" fill="none" stroke="${FC}" stroke-width="${F(6)}"/>`;
    }
  }
  // hi = highlighted candles (e.g. a candle pattern): shaded column + arrow pointing down at the candle
  parts.hi = his.map((i) => { const x = X(i) + w / 2, top = Y(candles[i][2]) - F(10), aw = F(13), ah = F(24);
    return `<rect x="${x - w * 1.3}" y="${T}" width="${w * 2.6}" height="${Hc}" fill="#5eb5f7" opacity=".18" rx="${F(6)}"/><polygon points="${x},${top} ${x - aw},${top - ah} ${x + aw},${top - ah}" fill="#fbbf24" stroke="#070b0f" stroke-width="${2 * fs}"/>`; }).join("");
  parts.now = `<line x1="0" x2="${AX}" y1="${ny}" y2="${ny}" stroke="${zc}" stroke-width="${2.5 * fs}"/>`;
  labels.push([ny, zc, "Now " + px(cur)]);
  if (focus === "now") parts.focus += ring(X(n - 1) + w / 2, ny, F(26)) + `<line x1="0" x2="${AX}" y1="${ny}" y2="${ny}" stroke="${FC}" stroke-opacity=".45" stroke-width="${F(9)}"/>`;
  if (useLiq && show >= 4) { const ly = Y(useLiq); parts.liq = `<line x1="0" x2="${AX}" y1="${ly}" y2="${ly}" stroke="${LIQ}" stroke-dasharray="${F(3)} ${F(5)}" stroke-width="${2.5 * fs}"/>`; labels.push([ly, LIQ, "Liq " + px(useLiq), "#fff"]); if (focus === "liq") parts.focus += `<line x1="0" x2="${AX}" y1="${ly}" y2="${ly}" stroke="${FC}" stroke-opacity=".5" stroke-width="${F(10)}"/>`; }
  // keep label boxes >= 34 px (scaled) apart
  labels.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < labels.length; i++) if (labels[i][0] - labels[i - 1][0] < F(34)) labels[i][0] = labels[i - 1][0] + F(34);
  parts.labels = labels.map((l) => box(...l)).join("");
  const fl = { entry: "Entry", now: "Now", liq: "Liq" }[focus], fb = fl && labels.find((l) => l[2].startsWith(fl));
  if (fb) parts.labels += outline(fb[0]);
  const ttl = title ? `<text x="4" y="${F(24)}" fill="${TXT}" font-size="${F(22)}">${title}</text>` : "";
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI,Noto Sans,Arial,sans-serif">${ttl}${parts.grid}${parts.hi}${parts.zone}${bars}${parts.liq}${parts.entry}${parts.now}${parts.arrow}${parts.pl}${parts.focus}${parts.labels}</svg>`;
}
