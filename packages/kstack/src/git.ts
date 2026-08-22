import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { exists, isDir } from "./fsutil.js";
import { resolvePath } from "./paths.js";

export type SourceRef = {
  kind: "dir" | "git";
  location: string;
  requestedRef: string | null;
};

export function parseSource(raw: string): { source: string; ref: string | null } {
  const at = raw.lastIndexOf("@");
  if (at > 0 && !raw.includes("://") && !raw.startsWith("/")) {
    const hostish = raw.slice(0, at);
    const ref = raw.slice(at + 1);
    if (hostish.includes("/") && ref.length > 0 && !ref.includes("/")) {
      return { source: hostish, ref };
    }
  }
  return { source: raw, ref: null };
}

export function gitUrlForSource(source: string): string {
  if (
    source.startsWith("https://") ||
    source.startsWith("http://") ||
    source.startsWith("git@") ||
    source.startsWith("ssh://") ||
    source.startsWith("file://")
  ) {
    return source;
  }
  if (source.endsWith(".git") && source.includes("/")) {
    return source;
  }
  return `https://github.com/${source}.git`;
}

export function looksLikeLocalSource(source: string): boolean {
  if (source.startsWith("file://")) {
    return true;
  }
  if (source === "~" || source.startsWith("~/")) {
    return true;
  }
  if (source.startsWith("./") || source.startsWith("../")) {
    return true;
  }
  return isAbsolute(source);
}

export function resolveSource(raw: string, cwd = process.cwd()): SourceRef {
  const { source, ref } = parseSource(raw);
  if (!looksLikeLocalSource(source)) {
    return { kind: "git", location: gitUrlForSource(source), requestedRef: ref };
  }
  const location = source.startsWith("file://")
    ? fileURLToPath(source)
    : resolvePath(source, cwd);
  if (!isDir(location)) {
    throw new Error(`local source is not a directory: ${location}`);
  }
  return { kind: "dir", location, requestedRef: ref };
}

function asText(value: string | Buffer | null | undefined): string {
  if (value === undefined || value === null) {
    return "";
  }
  return typeof value === "string" ? value : value.toString("utf8");
}

function runGit(args: string[], options: SpawnSyncOptions = {}): string {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    ...options,
  });
  if (result.status !== 0) {
    const err = asText(result.stderr || result.stdout).trim();
    throw new Error(`git ${args.join(" ")} failed: ${err}`);
  }
  return asText(result.stdout).trim();
}

export function cloneAtRef(url: string, ref: string | null): { dir: string; pin: string } {
  const dir = mkdtempSync(join(tmpdir(), "kstack-fetch-"));
  try {
    if (ref !== null && ref.length > 0) {
      runGit(["init", "--quiet"], { cwd: dir });
      runGit(["remote", "add", "origin", url], { cwd: dir });
      runGit(["fetch", "--depth", "1", "--quiet", "origin", ref], { cwd: dir });
      runGit(["checkout", "--quiet", "FETCH_HEAD"], { cwd: dir });
    } else {
      runGit(["clone", "--depth", "1", "--quiet", url, dir]);
    }
    const pin = runGit(["rev-parse", "HEAD"], { cwd: dir });
    return { dir, pin };
  } catch (error) {
    rmSync(dir, { recursive: true, force: true });
    throw error;
  }
}

export function removeTempDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

export function currentPin(dir: string): string {
  if (!exists(join(dir, ".git"))) {
    return "local";
  }
  return runGit(["rev-parse", "HEAD"], { cwd: dir });
}
