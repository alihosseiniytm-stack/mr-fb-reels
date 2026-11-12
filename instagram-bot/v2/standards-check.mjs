// YouTube standards gate (T50-08). Enforces mr-fb-reels/YOUTUBE_STANDARDS.md for one rendered video.
// Usage: node v2/standards-check.mjs <dir> <name>      (reads <dir>/<name>.mp4 + .meta.json, thumbs for long videos)
// Prints ONE summary line (PASS/FAIL + numbers) and the failed rules only; writes <dir>/<name>-standards.txt. Exit 3 = FAIL.
// Needs ffmpeg/ffprobe (GitHub Actions runner). Never run renders on the owner laptop or mr-hub.
import { readFileSync, existsSync, statSync, openSync, readSync, closeSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { spokenNumbers } from "./visual.mjs";
import { ALLOWED } from "./stock.mjs";

const [dir0, name] = process.argv.slice(2), dir = resolve(dir0 || "."), mp4 = `${dir}/${name}.mp4`;
const meta = JSON.parse(readFileSync(`${dir}/${name}.meta.json`, "utf8"));
const short = meta.kind === "short", res = [];
const ok = (rule, c, t) => { res.push({ rule, pass: !!c, t }); return c; };

// ---------- (e) upload specs: https://support.google.com/youtube/answer/1722171 ----------
const pr = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=format_name,duration,size,bit_rate:stream=codec_type,codec_name,profile,pix_fmt,width,height,r_frame_rate,avg_frame_rate,sample_rate,channels,bit_rate", "-of", "json", mp4]).toString());
const v = pr.streams.find((s) => s.codec_type === "video"), a = pr.streams.find((s) => s.codec_type === "audio"), dur = +pr.format.duration;
const fps = (r) => { const [x, y] = String(r).split("/").map(Number); return y ? x / y : x; };
ok("e", /mp4/.test(pr.format.format_name), `container ${pr.format.format_name}`);
ok("e", v && v.codec_name === "h264" && /^High/.test(v.profile || ""), `video ${v && v.codec_name} ${v && v.profile}`);
ok("e", v && v.pix_fmt === "yuv420p", `chroma ${v && v.pix_fmt}`);
const f1 = fps(v.r_frame_rate), f2 = fps(v.avg_frame_rate);
ok("e", Math.abs(f1 - f2) < 0.01 && [24, 25, 30, 48, 50, 60].some((x) => Math.abs(x - f1) < 0.01), `frame rate constant ${f1}/${f2.toFixed(3)} fps`);
ok("e", a && a.codec_name === "aac" && /LC/i.test(a.profile || "LC"), `audio ${a && a.codec_name} ${a && a.profile}`);
ok("e", a && +a.sample_rate === 48000, `audio ${a && a.sample_rate} Hz`);
// moov before mdat = fast start
const atoms = (() => { const fd = openSync(mp4, "r"), out = [], size = statSync(mp4).size, b = Buffer.alloc(16); let pos = 0;
  while (pos < size && out.length < 12) { readSync(fd, b, 0, 16, pos); let len = b.readUInt32BE(0); const typ = b.toString("latin1", 4, 8); if (len === 1) len = Number(b.readBigUInt64BE(8)); out.push(typ); if (len < 8) break; pos += len; }
  closeSync(fd); return out; })();
ok("e", atoms.indexOf("moov") >= 0 && atoms.indexOf("moov") < atoms.indexOf("mdat"), `fast start: atoms ${atoms.join(",")}`);
const vbr = +(v.bit_rate || pr.format.bit_rate) / 1e6;
ok("e", vbr >= 3 && vbr <= 14, `video bitrate ${vbr.toFixed(1)} Mbps (rendered at 8 Mbps target = YouTube 1080p SDR 30 fps; static frames may compress lower)`);
if (short) {
  ok("e", v.width === 1080 && v.height === 1920, `Short 9:16 ${v.width}x${v.height}`);
  ok("e", dur <= 180, `Short length ${dur.toFixed(1)} s <= 180 (answer/15424877)`);
} else {
  ok("e", v.width === 1920 && v.height === 1080, `long 16:9 ${v.width}x${v.height}`);
  for (const t of ["A", "B"]) {
    const f = `${dir}/${name}-thumb${t}.png`;
    if (!ok("e", existsSync(f), `thumb${t} exists`)) continue;
    const h = readFileSync(f).subarray(0, 24), w = h.readUInt32BE(16), hh = h.readUInt32BE(20), mb = statSync(f).size / 1048576;
    ok("e", w === 1280 && hh === 720 && mb < 2, `thumb${t} ${w}x${hh} ${mb.toFixed(2)} MB (16:9, < 2 MB)`);
  }
}

// ---------- (f) loudness: -14 LUFS integrated (+-1.5), true peak <= -1 dBTP ----------
const ln = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", mp4, "-vn", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 26 }).stderr || "";
const L = JSON.parse(ln.slice(ln.lastIndexOf("{"), ln.lastIndexOf("}") + 1));
ok("f", Math.abs(+L.input_i + 14) <= 1.5, `loudness ${L.input_i} LUFS (target -14)`);
ok("f", +L.input_tp <= -1.0, `true peak ${L.input_tp} dBTP (<= -1, no clipping)`);

// ---------- (g) one sentence = one visual ----------
const steps = meta.steps || [];
const noKw = steps.filter((s) => !s.kw), same = steps.filter((s, i) => i && s.key && s.key === steps[i - 1].key);
const numMiss = steps.filter((s) => { const n = spokenNumbers(s.say); if (!n.length) return false; const k = String(s.kw || "").replace(/,/g, ""); return !n.some((x) => k.includes(x.replace(/,/g, ""))); });
ok("g", steps.length >= 5 && steps.every((s) => s.key), `${steps.length} sentences, each with its own picture key`);
ok("g", noKw.length === 0, `on-screen callout for every sentence (missing ${noKw.length}${noKw[0] ? ': "' + noKw[0].say.slice(0, 40) + '"' : ""})`);
ok("g", same.length === 0, `no two sentences in a row on the same picture (repeats ${same.length}${same[0] ? ': "' + same[0].say.slice(0, 40) + '"' : ""})`);
ok("g", numMiss.length === 0, `every spoken number is on screen (missing ${numMiss.length}${numMiss[0] ? ': "' + numMiss[0].say.slice(0, 50) + '" kw=' + numMiss[0].kw : ""})`);
const last = steps.at(-1);
ok("g", last && Math.abs(last.end - dur) < 0.6, `timeline ends ${last && last.end}s = video ${dur.toFixed(1)}s (voice in sync)`);

// ---------- (a) originality: own story + own data (similarity-gate.mjs checks repeats vs recent uploads) ----------
const nums = new Set(spokenNumbers(meta.text || ""));
ok("a", nums.size >= 3, `own data: ${nums.size} distinct real numbers in the narration`);
ok("a", new Set(steps.map((s) => s.key)).size === steps.length, `unique pictures ${new Set(steps.map((s) => s.key)).size}/${steps.length}`);

// ---------- (c) metadata + (d) finance + (b) AI disclosure + brand rule R53 ----------
const title = String(meta.title || ""), desc = String(meta.description || ""), text = String(meta.text || "");
ok("c", title.length > 10 && title.length <= (short ? 88 : 100), `title ${title.length} chars`);
const CLICK = /\b(shocking|insane|you won'?t believe|guaranteed|get rich|100x|1000x|free money|secret trick|must watch|gone wrong!)\b/i;
ok("c", !CLICK.test(title) && !CLICK.test(desc), `no clickbait words`);
const capsWords = title.split(/\s+/).filter((w) => /^[A-Z]{4,}$/.test(w) && !/^(LONG|SHORT|USDC|USDT)$/.test(w));
ok("c", capsWords.length <= 2, `title not shouting (${capsWords.length} all-caps words)`);
const norm = (x) => x.replace(/[,$%+−-]/g, "").replace(/\.0+$/, "");
const tn = (title.match(/\d[\d.,]*/g) || []).map(norm), body = (text + " " + JSON.stringify(steps.map((s) => s.kw))).replace(/,/g, "");
const tMiss = tn.filter((n) => !body.includes(n));
ok("c", tMiss.length === 0, `title numbers are in the video (${tn.join(",") || "none"}${tMiss.length ? "; missing " + tMiss.join(",") : ""})`);
ok("d", /not financial advice/i.test(desc) && (short || /not financial advice/i.test(text)), `"not financial advice" in description${short ? "" : " + narration"}`);
ok("d", !/\b(buy now|sell now|you should (buy|sell)|guaranteed (profit|return))/i.test(text + " " + title), `no investment instructions`);
const doc = meta.style === "doc", v6 = meta.style === "v6";
ok("b", /synthetic voice/i.test(desc) && (v6 ? /drawn by our own code/i.test(desc) : doc ? /licensed stock photos/i.test(desc) : /animated mascot/i.test(desc)), `AI disclosure line in description (synthetic voice, ${v6 ? "own drawings" : doc ? "stock photos" : "animated mascot"})`);
// ---------- (i) v6 one style (owner D178 2026-11-12): own code-drawn pictures only, shot list gate rules (v2/shotlist-gate.mjs) ----------
if (v6) {
  const { checkShots } = await import("./shotlist-gate.mjs");
  const g = checkShots(meta);
  ok("i", g.pass, `shot list: ${g.ok}/${g.n} sentences with a matching tagged picture, max shot ${g.maxLen}s <= 6${g.fails[0] ? "; " + g.fails[0] : ""}`);
  ok("i", steps.every((s) => s.visual && s.visual.type !== "photo" && s.mascot && s.mascot.pose) && !!meta.mascot, `v6: no stock photos, no AI frames, option-B mascot puppet tagged on every sentence (D189/D190)`);
  ok("i", !/stock photo/i.test(desc.replace(/no stock photos/i, "")), `description does not claim stock photos`);
}
// ---------- (h) v5 documentary style: real licensed photos, no mascot, credits for every photo ----------
if (doc) {
  const ph = steps.filter((s) => s.visual === "photo");
  const cf = `${dir}/${name}-credits.json`, credits = existsSync(cf) ? JSON.parse(readFileSync(cf, "utf8")) : [];
  ok("h", !meta.mascot, `doc style: no mascot overlay`);
  const badLic = ph.filter((s) => !ALLOWED.test(String(s.license || "")) || !/^https:\/\//.test(String(s.page || "")));
  ok("h", badLic.length === 0, `every photo has an allowed license + source URL (bad ${badLic.length}${badLic[0] ? ": " + badLic[0].license + " " + badLic[0].page : ""})`);
  ok("h", credits.length === ph.length && ph.every((s) => credits.some((c) => c.page === s.page)), `credits file lists every photo (${credits.length}/${ph.length})`);
  const byMiss = credits.filter((c) => /by/i.test(c.license) && !desc.includes(c.page));
  ok("h", byMiss.length === 0, `CC BY photos credited in the description (missing ${byMiss.length})`);
  ok("h", short ? ph.length >= 2 : ph.length >= 0.25 * steps.length, `photo steps ${ph.length}/${steps.length} (${short ? "Short >= 2" : "long >= 25%"})`);
  ok("h", /\bstock\b/i.test(desc) && !/news photo/i.test(credits.map((c) => c.query).join(" ")), `description names stock pictures; no news queries`);
}
const up = readFileSync(new URL("./upload.mjs", import.meta.url), "utf8");
ok("b", /containsSyntheticMedia:\s*(true|false)/.test(up) && /selfDeclaredMadeForKids:\s*false/.test(up), `upload sets status.containsSyntheticMedia + madeForKids`);
const VENUE = /\b(hyperliquid|binance|bybit|okx|coinbase|kraken|bitget|kucoin|mexc|gate\.io)\b/i;
ok("c", !VENUE.test(title + " " + desc + " " + text), `no venue names in title/description/voice (R53)`);

const fails = res.filter((r) => !r.pass), pass = res.length - fails.length;
const line = `${fails.length ? "FAIL" : "PASS"} ${name}: ${pass}/${res.length} rules | ${v.width}x${v.height} ${v.profile} ${f1}fps ${vbr.toFixed(1)}Mbps | ${a.codec_name} ${a.sample_rate}Hz | ${L.input_i} LUFS TP ${L.input_tp} | ${dur.toFixed(1)}s | ${steps.length} sentences`;
const outTxt = [line, ...fails.map((r) => `  FAIL (${r.rule}) ${r.t}`)].join("\n");
console.log(outTxt);
writeFileSync(`${dir}/${name}-standards.txt`, [line, ...res.map((r) => `${r.pass ? "PASS" : "FAIL"} (${r.rule}) ${r.t}`)].join("\n") + "\n");
process.exit(fails.length ? 3 : 0);
