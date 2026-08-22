import { join } from "node:path";
import { readlinkSync, realpathSync } from "node:fs";
import { pathsForTier } from "../config.js";
import { exists, isDir, isSymlink } from "../fsutil.js";
import { sha256File } from "../hash.js";
import { scanRepo, tierDir } from "../inventory.js";
import { packageIds } from "../lock.js";
import { skillMdPath } from "../discover.js";
import { resolvePath } from "../paths.js";
import { skillDest } from "../skillname.js";
import type { RepoContext } from "../types.js";
import { TIERS } from "../types.js";
import { assertNever } from "../never.js";

export type SymlinkHealth =
  | "ok"
  | "missing"
  | "broken"
  | "wrong-target"
  | "blocked";

export function inspectSymlink(dest: string, expectedTarget: string): SymlinkHealth {
  if (!exists(dest) && !isSymlink(dest)) {
    return "missing";
  }
  if (isSymlink(dest)) {
    let current: string;
    try {
      current = readlinkSync(dest);
    } catch {
      return "broken";
    }
    if (!exists(dest)) {
      return "broken";
    }
    try {
      const actual = realpathSync(dest);
      const expected = realpathSync(expectedTarget);
      return actual === expected ? "ok" : "wrong-target";
    } catch {
      return current === expectedTarget ? "ok" : "wrong-target";
    }
  }
  return "blocked";
}

export function runStatus(ctx: RepoContext): number {
  const records = scanRepo(ctx.repoRoot, ctx.lock);
  const firstParty = records.filter((s) => s.kind === "first-party");
  const owned = records.filter((s) => s.kind === "lock-owned");
  let drift = 0;

  console.log(`repo  ${ctx.repoRoot}`);
  console.log("");
  console.log("pins");
  for (const id of packageIds(ctx.lock)) {
    const pkg = ctx.lock.packages[id];
    if (pkg === undefined) {
      continue;
    }
    const missing: string[] = [];
    const hashDrift: string[] = [];
    for (const name of pkg.skills) {
      const dir = skillDest(tierDir(ctx.repoRoot, pkg.tier), name);
      const md = skillMdPath(dir);
      if (!exists(md)) {
        missing.push(name);
        continue;
      }
      const expected = pkg.hashes[name];
      if (expected !== undefined && sha256File(md) !== expected) {
        hashDrift.push(name);
      }
    }
    const pinLabel = pkg.pin.length > 0 ? pkg.pin : "(empty)";
    const flags: string[] = [];
    if (pkg.pin.length === 0) {
      flags.push("empty-pin");
      drift += 1;
    }
    if (missing.length > 0) {
      flags.push(`missing:${missing.join(",")}`);
      drift += missing.length;
    }
    if (hashDrift.length > 0) {
      flags.push(`hash-drift:${hashDrift.join(",")}`);
      drift += hashDrift.length;
    }
    const flagText = flags.length > 0 ? `  DRIFT ${flags.join(" ")}` : "  ok";
    console.log(
      `  ${id}  pin=${pinLabel}  ${pkg.tier}/  ${pkg.skills.length} skills${flagText}`,
    );
  }
  if (packageIds(ctx.lock).length === 0) {
    console.log("  (no packages)");
  }

  console.log("");
  console.log(`first-party  ${firstParty.length}`);
  for (const skill of firstParty) {
    const flag = skill.hasSkillMd ? "" : "  missing-SKILL.md";
    if (!skill.hasSkillMd) {
      drift += 1;
    }
    console.log(`  ${skill.tier}/${skill.name}${flag}`);
  }
  if (firstParty.length === 0) {
    console.log("  (none)");
  }

  console.log("");
  console.log(`lock-owned  ${owned.length}`);
  for (const skill of owned) {
    const flag = skill.hasSkillMd ? "" : "  missing-SKILL.md";
    console.log(`  ${skill.tier}/${skill.name}  ${skill.packageId}${flag}`);
  }
  if (owned.length === 0) {
    console.log("  (none on disk)");
  }

  console.log("");
  console.log("symlinks");
  let symlinkIssues = 0;
  for (const tier of TIERS) {
    switch (tier) {
      case "global":
      case "lighthouse":
      case "lightmind":
        break;
      default:
        assertNever(tier);
    }
    const skills = records.filter((s) => s.tier === tier);
    for (const raw of pathsForTier(ctx.config, tier)) {
      const destRoot = resolvePath(raw);
      if (!isDir(destRoot)) {
        console.log(`  ${raw}  missing`);
        continue;
      }
      for (const skill of skills) {
        const dest = join(destRoot, skill.name);
        const health = inspectSymlink(dest, skill.path);
        if (health !== "ok") {
          symlinkIssues += 1;
          drift += 1;
        }
        console.log(`  ${dest}  ${health}`);
      }
    }
  }

  console.log("");
  if (drift === 0 && symlinkIssues === 0) {
    console.log("status  clean");
    return 0;
  }
  console.log(`status  DRIFT (${drift} issue(s))`);
  return 1;
}
