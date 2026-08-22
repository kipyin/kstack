import { readdirSync } from "node:fs";
import { join } from "node:path";
import { exists, isDir } from "../fsutil.js";
import { parseListDir, scanRepo, scanTier } from "../inventory.js";
import { ownerOfSkill } from "../lock.js";
import { resolvePath } from "../paths.js";
import type { RepoContext, SkillRecord } from "../types.js";
import { assertNever } from "../never.js";

function formatRecord(skill: SkillRecord): string {
  const owner = skill.packageId === null ? "" : `  ${skill.packageId}`;
  const missing = skill.hasSkillMd ? "" : "  (missing SKILL.md)";
  return `  ${skill.name.padEnd(32)} ${skill.kind}${owner}${missing}`;
}

function printRecords(title: string, records: SkillRecord[]): void {
  const firstParty = records.filter((s) => s.kind === "first-party").length;
  const owned = records.filter((s) => s.kind === "lock-owned").length;
  console.log(`${title}  (${records.length} skills, ${firstParty} first-party, ${owned} lock-owned)`);
  if (records.length === 0) {
    console.log("  (empty)");
    return;
  }
  for (const skill of records) {
    console.log(formatRecord(skill));
  }
}

function listPath(ctx: RepoContext, path: string): void {
  const abs = resolvePath(path, ctx.repoRoot);
  if (!isDir(abs)) {
    throw new Error(`not a directory: ${abs}`);
  }
  const names = readdirSync(abs, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
  console.log(`${abs}`);
  if (names.length === 0) {
    console.log("  (empty)");
    return;
  }
  for (const name of names) {
    const owner = ownerOfSkill(ctx.lock, name);
    const kind = owner === null ? "first-party" : "lock-owned";
    const ownerSuffix = owner === null ? "" : `  ${owner}`;
    const missing = exists(join(abs, name, "SKILL.md")) ? "" : "  (missing SKILL.md)";
    console.log(`  ${name.padEnd(32)} ${kind}${ownerSuffix}${missing}`);
  }
}

export function runList(ctx: RepoContext, dir?: string): void {
  const parsed = parseListDir(ctx.repoRoot, dir);
  switch (parsed.kind) {
    case "all": {
      const records = scanRepo(ctx.repoRoot, ctx.lock);
      for (const tier of ["global", "lighthouse", "lightmind"] as const) {
        printRecords(`${tier}/`, records.filter((s) => s.tier === tier));
        console.log("");
      }
      return;
    }
    case "tier": {
      printRecords(`${parsed.tier}/`, scanTier(ctx.repoRoot, ctx.lock, parsed.tier));
      return;
    }
    case "path": {
      listPath(ctx, parsed.path);
      return;
    }
    default:
      assertNever(parsed);
  }
}
