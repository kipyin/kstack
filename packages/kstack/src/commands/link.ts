import { mkdirSync, rmSync, symlinkSync, unlinkSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { homedir } from "node:os";
import { pathsForTier } from "../config.js";
import { exists, isDir, isSymlink } from "../fsutil.js";
import { scanTier } from "../inventory.js";
import { resolvePath } from "../paths.js";
import type { RepoContext, SkillRecord } from "../types.js";
import { TIERS } from "../types.js";
import { assertNever } from "../never.js";

export type LinkOptions = {
  force: boolean;
};

export type LinkDirPrep =
  | { ok: true; path: string }
  | { ok: false; path: string; reason: string };

export function prepareLinkDir(rawPath: string): LinkDirPrep {
  const path = resolvePath(rawPath);
  if (exists(path) && isDir(path)) {
    return { ok: true, path };
  }
  const parent = dirname(path);
  const project = dirname(parent);
  const parentBase = basename(parent);
  if (parentBase === ".agents" || parentBase === ".cursor") {
    if (project !== homedir() && !exists(project)) {
      return {
        ok: false,
        path,
        reason: `project root does not exist: ${project}`,
      };
    }
  }
  mkdirSync(path, { recursive: true });
  return { ok: true, path };
}

function linkOne(
  skill: SkillRecord,
  destRoot: string,
  force: boolean,
): "created" | "replaced" | "unchanged" {
  const dest = join(destRoot, skill.name);
  const target = skill.path;
  if (isSymlink(dest)) {
    unlinkSync(dest);
    symlinkSync(target, dest);
    return "replaced";
  }
  if (exists(dest)) {
    if (!force) {
      throw new Error(
        `refusing to replace non-symlink ${dest} (skill '${skill.name}'). Re-run with --force to replace real directories.`,
      );
    }
    rmSync(dest, { recursive: true, force: true });
    symlinkSync(target, dest);
    return "replaced";
  }
  symlinkSync(target, dest);
  return "created";
}

export function runLink(ctx: RepoContext, options: LinkOptions): void {
  let created = 0;
  let replaced = 0;
  let skippedPaths = 0;

  for (const tier of TIERS) {
    switch (tier) {
      case "global":
      case "lighthouse":
      case "lightmind":
        break;
      default:
        assertNever(tier);
    }
    const skills = scanTier(ctx.repoRoot, ctx.lock, tier);
    for (const raw of pathsForTier(ctx.config, tier)) {
      const prepared = prepareLinkDir(raw);
      if (!prepared.ok) {
        console.log(`skip ${raw}: ${prepared.reason}`);
        skippedPaths += 1;
        continue;
      }
      for (const skill of skills) {
        const result = linkOne(skill, prepared.path, options.force);
        if (result === "created") {
          created += 1;
        } else if (result === "replaced") {
          replaced += 1;
        }
      }
    }
  }

  console.log(
    `linked ${created} new, replaced ${replaced} existing${
      skippedPaths > 0 ? `, skipped ${skippedPaths} missing path(s)` : ""
    }`,
  );
}
