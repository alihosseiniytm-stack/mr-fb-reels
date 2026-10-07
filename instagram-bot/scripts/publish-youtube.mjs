// Direct YouTube upload (YouTube Data API v3, resumable) — no Make, no third party.
// Secrets: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN (see SETUP-YOUTUBE.md).
import { readFile, stat } from "node:fs/promises";

async function accessToken() {
  const { YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN } = process.env;
  if (!YT_CLIENT_ID || !YT_CLIENT_SECRET || !YT_REFRESH_TOKEN) throw new Error("YouTube upload needs YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN secrets");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: YT_CLIENT_ID, client_secret: YT_CLIENT_SECRET, refresh_token: YT_REFRESH_TOKEN, grant_type: "refresh_token" }),
  });
  const j = await res.json();
  if (!res.ok || !j.access_token) throw new Error("YouTube token refresh failed: " + res.status + " " + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

export async function publishYouTube({ filePath, caption, lang }) {
  const token = await accessToken();
  const lines = caption.split("\n").filter((l) => l.trim());
  const title = (lines[0].replace(/#\S+/g, "").trim().slice(0, 88) + " #Shorts").slice(0, 100);
  const body = {
    snippet: { title, description: caption + "\n\n#Shorts", categoryId: "25", defaultLanguage: lang },
    status: { privacyStatus: process.env.YT_PRIVACY || "public", selfDeclaredMadeForKids: false, containsSyntheticMedia: true },
  };
  const size = (await stat(filePath)).size;
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: { authorization: "Bearer " + token, "content-type": "application/json; charset=UTF-8", "x-upload-content-length": String(size), "x-upload-content-type": "video/mp4" },
    body: JSON.stringify(body),
  });
  if (!init.ok) throw new Error("YouTube upload init failed: " + init.status + " " + (await init.text()).slice(0, 300));
  const url = init.headers.get("location");
  const put = await fetch(url, { method: "PUT", headers: { "content-type": "video/mp4", "content-length": String(size) }, body: await readFile(filePath) });
  const out = await put.json().catch(() => ({}));
  if (!put.ok || !out.id) throw new Error("YouTube upload failed: " + put.status + " " + JSON.stringify(out).slice(0, 300));
  return { id: out.id, url: "https://youtube.com/shorts/" + out.id, privacy: out.status?.privacyStatus };
}
