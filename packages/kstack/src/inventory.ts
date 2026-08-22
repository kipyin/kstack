import { join } from "node:path";
import { exists, listSkillDirs } from "./fsutil.js";
import { ownerOfSkill } from "./lock.js";
import { skillMdPath } from "./discover.js";
import { TIERS, type LockFile, type SkillRecord, type Tier } from "./types.js";
import { isTier } from "./types.js";
import { assertNever } from "./never.js";

export function tierDir(repoRoot: string, tier: Tier): string {
  switch (tier) {
    case "global":
    case "lighthouse":
    case "lightmind":
      return join(repoRoot, tier);
    default:
      return assertNever(tier);
  }
}

export function scanTier(
  repoRoot: string,
  lock: LockFile,
  tier: Tier,
): SkillRecord[] {
  const root = tierDir(repoRoot, tier);
  const names = listSkillDirs(root);
  return names.map((name) => {
    const path = join(root, name);
    const packageId = ownerOfSkill(lock, name);
    const kind = packageId === null ? "first-party" : "lock-owned";
    return {
      name,
      tier,
      path,
      kind,
      packageId,
      hasSkillMd: exists(skillMdPath(path)),
    };
  });
}

export function scanRepo(repoRoot: string, lock: LockFile): SkillRecord[] {
  return TIERS.flatMap((tier) => scanTier(repoRoot, lock, tier));
}

export function parseListDir(
  repoRoot: string,
  dir?: string,
): { kind: "all" } | { kind: "tier"; tier: Tier } | { kind: "path"; path: string } {
  if (dir === undefined) {
    return { kind: "all" };
  }
  if (isTier(dir)) {
    return { kind: "tier", tier: dir };
  }
  return { kind: "path", path: dir };
}
