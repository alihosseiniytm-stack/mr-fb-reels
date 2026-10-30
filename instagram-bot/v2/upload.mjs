// Uploads one v2 video to YouTube (Data API v3, resumable) after the similarity gate passed, sets the A/B thumbnail, logs it in uploads-log.json.
// Usage: node v2/upload.mjs --meta=<file.meta.json> --video=<mp4> --thumbA=<png> --thumbB=<png> [--privacy=public|unlisted|private]
// Secrets (GitHub): YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN. Never printed.
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const arg = (n) => { const h = process.argv.find((a) => a.startsWith("--" + n + "=")); return h ? h.slice(n.length + 3) : null; };
const meta = JSON.parse(readFileSync(arg("meta"), "utf8")), video = arg("video"), privacy = arg("privacy") || "private";
const { YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN } = process.env;
if (!YT_CLIENT_ID || !YT_CLIENT_SECRET || !YT_REFRESH_TOKEN) throw new Error("needs YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN");
const tr = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: YT_CLIENT_ID, client_secret: YT_CLIENT_SECRET, refresh_token: YT_REFRESH_TOKEN, grant_type: "refresh_token" }) });
const tj = await tr.json();
if (!tj.access_token) throw new Error("token refresh failed " + tr.status);
const auth = { authorization: "Bearer " + tj.access_token };
const short = meta.kind === "short";
const title = (meta.title.slice(0, short ? 88 : 98) + (short ? " #Shorts" : "")).slice(0, 100);
const body = { snippet: { title, description: meta.description.slice(0, 4900), tags: ["crypto", "whale alert", "whale tracker", "crypto education", "bitcoin"], categoryId: "27" },
  status: { privacyStatus: privacy, selfDeclaredMadeForKids: false, containsSyntheticMedia: true } };
const size = statSync(video).size;
const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", { method: "POST", headers: { ...auth, "content-type": "application/json; charset=UTF-8", "x-upload-content-length": String(size), "x-upload-content-type": "video/mp4" }, body: JSON.stringify(body) });
if (!init.ok) throw new Error("init failed " + init.status + " " + (await init.text()).slice(0, 200));
const put = await fetch(init.headers.get("location"), { method: "PUT", headers: { "content-type": "video/mp4", "content-length": String(size) }, body: readFileSync(video) });
const out = await put.json().catch(() => ({}));
if (!out.id) throw new Error("upload failed " + put.status);
// thumbnail A/B: odd week = A, even = B (compare views/CTR of the two in Studio later). Shorts keep the auto frame.
let thumb = "none";
if (!short) {
  const wk = Math.floor(Date.now() / 6048e5), which = wk % 2 ? "A" : "B", file = arg("thumb" + which);
  if (file && existsSync(file)) {
    const tt = await fetch("https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=" + out.id, { method: "POST", headers: { ...auth, "content-type": "image/png" }, body: readFileSync(file) });
    thumb = which + (tt.ok ? " set" : " FAILED " + tt.status); // channel must be verified for custom thumbnails
  }
}
const url = (short ? "https://youtube.com/shorts/" : "https://youtube.com/watch?v=") + out.id;
const logFile = fileURLToPath(new URL("./uploads-log.json", import.meta.url));
const log = existsSync(logFile) ? JSON.parse(readFileSync(logFile, "utf8")) : [];
log.unshift({ kind: meta.kind, v2: true, date: new Date().toISOString(), url, title: meta.title, text: meta.text, topic: meta.topic, thumbHashA: meta.thumbHashA, frameHash: meta.frameHash, thumb, privacy });
writeFileSync(logFile, JSON.stringify(log.slice(0, 200), null, 1));
console.log("UPLOADED", url, privacy, "thumb:", thumb);
