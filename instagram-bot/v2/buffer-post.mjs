// Instagram Reels poster via Buffer (T50-08 v6c, owner D196: Instagram gets the same v6 video). cron OFF until the owner connects
// the IG pages in Buffer (owner-decision: which page = which language). Buffer API = GraphQL POST https://api.buffer.com,
// "Authorization: Bearer <BUFFER_API_KEY>", createPost with a PUBLIC video URL (Buffer has no file upload).
// Field names [E] from Buffer's create-video-post example (developers.buffer.com/examples/create-video-post.html): verify against the
// live schema with one dry_run=false test before turning the cron on.
// node v2/buffer-post.mjs --meta=<short-*.meta.json> --video-url=<public mp4 url> [--channel=<buffer channel id>] [--send]
import { readFileSync } from "node:fs";
const arg = (n) => { const h = process.argv.find((a) => a.startsWith("--" + n + "=")); return h ? h.slice(n.length + 3) : null; };
const meta = JSON.parse(readFileSync(arg("meta"), "utf8"));
if (meta.style !== "v6") { console.error("refusing: not a v6 video (R65)"); process.exit(3); }
const text = (meta.title + "\n\n" + meta.description.split("\n\nChapters:")[0] + "\n\n#crypto #bitcoin #trading #cryptoeducation").slice(0, 2200);
const body = { query: "mutation CreatePost($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id status } } ... on MutationError { message } } }",
  variables: { input: { channelId: arg("channel") || "<IG_CHANNEL_ID>", text, schedulingType: "automatic", mode: "shareNow", assets: { videos: [{ url: arg("video-url") || "<PUBLIC_MP4_URL>" }] }, metadata: { instagram: { type: "reel", shouldShareToFeed: true } } } } };
if (!process.argv.includes("--send")) { console.log("DRY RUN (nothing sent). Request body:\n" + JSON.stringify(body, null, 1).slice(0, 3000)); process.exit(0); }
const key = process.env.BUFFER_API_KEY;
if (!key) throw new Error("needs BUFFER_API_KEY secret");
const r = await fetch("https://api.buffer.com", { method: "POST", headers: { authorization: "Bearer " + key, "content-type": "application/json" }, body: JSON.stringify(body) });
const j = await r.json().catch(() => ({}));
console.log("BUFFER", r.status, JSON.stringify(j).slice(0, 400));
if (!r.ok || j.errors || /MutationError/.test(JSON.stringify(j)) || !(j.data && j.data.createPost && j.data.createPost.post)) process.exit(4);
