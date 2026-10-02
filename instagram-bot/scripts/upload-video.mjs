import { execFileSync } from "node:child_process";
import { mkdtempSync, copyFileSync, mkdirSync, readdirSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

// Hosts the generated video on this repo's own gh-pages branch (GitHub Pages) so Instagram's
// servers can fetch it by URL — no third-party storage, no card, no extra secrets: it reuses
// the same GITHUB_TOKEN and GITHUB_REPOSITORY the workflow already has.
//
// Videos only need to exist long enough for Instagram to download them during container
// processing (minutes), so old ones are pruned on every run to keep the branch small.
const MAX_AGE_DAYS = 14;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function git(args, cwd) {
  execFileSync("git", args, { cwd, stdio: "inherit" });
}

export async function uploadVideo({ filePath, key }) {
  const token = requireEnv("GITHUB_TOKEN");
  const repoSlug = requireEnv("GITHUB_REPOSITORY"); // "owner/repo", auto-set by GitHub Actions
  const [owner, repoName] = repoSlug.split("/");
  const remote = `https://x-access-token:${token}@github.com/${repoSlug}.git`;

  const dir = mkdtempSync(join(tmpdir(), "mrw-ghpages-"));
  git(["clone", "--branch", "gh-pages", "--single-branch", "--depth", "1", remote, dir]);

  const destAbs = join(dir, key);
  mkdirSync(dirname(destAbs), { recursive: true });
  copyFileSync(filePath, destAbs);

  pruneOld(join(dir, "videos"));

  git(["add", "-A"], dir);
  git(
    [
      "-c", "user.name=github-actions[bot]",
      "-c", "user.email=github-actions[bot]@users.noreply.github.com",
      "commit", "-m", `Add ${key}`,
    ],
    dir
  );
  git(["push", "origin", "gh-pages"], dir);

  rmSync(dir, { recursive: true, force: true });

  return `https://${owner}.github.io/${repoName}/${key}`;
}

// Filenames embed a Date.now() timestamp (e.g. "data-1790323757972.mp4"); mtimes are useless
// here since a fresh --depth 1 clone resets them, so age is read from the filename instead.
function pruneOld(videosDir) {
  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
  let langDirs;
  try {
    langDirs = readdirSync(videosDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    return;
  }
  for (const langDir of langDirs) {
    const full = join(videosDir, langDir.name);
    for (const file of readdirSync(full)) {
      const match = file.match(/(\d{10,})\.mp4$/);
      if (match && Number(match[1]) < cutoff) {
        rmSync(join(full, file), { force: true });
      }
    }
  }
}
