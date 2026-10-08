import { fileURLToPath } from "node:url";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const MAX_KEYS = 800;

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

const MAX_LOG_ENTRIES = 200;

export async function loadState(lang) {
  const dir = fileURLToPath(new URL(`../state/${lang}${process.env.PLATFORM === "fb" ? "-fb" : process.env.PLATFORM === "yt" ? "-yt" : ""}/`, import.meta.url));
  const usedPath = dir + "used-events.json";
  const historyPath = dir + "history.json";
  const postLogPath = dir + "post-log.json";
  const used = await readJson(usedPath, { keys: [] });
  const history = await readJson(historyPath, {
    lastPostDate: null,
    lastSource: null, // "hl" | "sol"
    tourIndex: 0,
  });
  // One entry per real (non-dry-run) publish: mediaId + actual video length, so
  // scripts/analyze-performance.mjs can later pull Insights for it and compare
  // completion/watch-time across lengths. See instagram-bot/SETUP.md, Part 7.
  const postLog = await readJson(postLogPath, { posts: [] });
  return { usedPath, historyPath, postLogPath, used, history, postLog };
}

export function logPost(postLog, entry) {
  postLog.posts.push(entry);
  if (postLog.posts.length > MAX_LOG_ENTRIES) postLog.posts = postLog.posts.slice(-MAX_LOG_ENTRIES);
}

export function hasUsed(used, key) {
  return used.keys.includes(key);
}

export function markUsed(used, key) {
  used.keys.push(key);
  if (used.keys.length > MAX_KEYS) used.keys = used.keys.slice(-MAX_KEYS);
}

export async function saveState(state) {
  await mkdir(dirname(state.usedPath), { recursive: true });
  await writeFile(state.usedPath, JSON.stringify(state.used, null, 2));
  await writeFile(state.historyPath, JSON.stringify(state.history, null, 2));
  await writeFile(state.postLogPath, JSON.stringify(state.postLog, null, 2));
}
