import { exists } from "./fsutil.js";
import { copyDirReplace } from "./fsutil.js";
import { sha256File } from "./hash.js";
import { discoverSkills, skillMdPath, type DiscoveredSkill } from "./discover.js";
import { cloneAtRef, currentPin, removeTempDir, resolveSource } from "./git.js";
import { ownerOfSkill } from "./lock.js";
import { tierDir } from "./inventory.js";
import { assertSkillName, skillDest } from "./skillname.js";
import type { LockFile, LockPackage, RepoContext, Tier } from "./types.js";

export type FetchResult = {
  pin: string;
  root: string;
  discovered: DiscoveredSkill[];
  cleanup: () => void;
};

export function fetchSource(rawSource: string, ref: string | null): FetchResult {
  const resolved = resolveSource(rawSource);
  if (resolved.kind === "dir") {
    return {
      pin: currentPin(resolved.location),
      root: resolved.location,
      discovered: discoverSkills(resolved.location),
      cleanup: () => undefined,
    };
  }
  const cloned = cloneAtRef(resolved.location, ref ?? resolved.requestedRef);
  return {
    pin: cloned.pin,
    root: cloned.dir,
    discovered: discoverSkills(cloned.dir),
    cleanup: () => {
      removeTempDir(cloned.dir);
    },
  };
}

export function selectDiscovered(
  discovered: DiscoveredSkill[],
  wanted: string[] | null,
): DiscoveredSkill[] {
  if (wanted === null) {
    return discovered;
  }
  for (const name of wanted) {
    assertSkillName(name);
  }
  const have = new Map(discovered.map((skill) => [skill.name, skill]));
  const missing = wanted.filter((name) => !have.has(name));
  if (missing.length > 0) {
    throw new Error(
      `source does not contain skill(s): ${missing.join(", ")}. Available: ${discovered
        .map((skill) => skill.name)
        .join(", ") || "(none)"}`,
    );
  }
  return wanted.map((name) => {
    const skill = have.get(name);
    if (skill === undefined) {
      throw new Error(`source does not contain skill '${name}'`);
    }
    return skill;
  });
}

function assertWritable(
  ctx: RepoContext,
  tier: Tier,
  skillName: string,
  packageId: string,
): void {
  const dest = skillDest(tierDir(ctx.repoRoot, tier), skillName);
  const owner = ownerOfSkill(ctx.lock, skillName);
  if (owner !== null && owner !== packageId) {
    throw new Error(
      `refusing to write '${skillName}': already owned by lock package '${owner}'`,
    );
  }
  if (exists(dest) && owner === null) {
    throw new Error(
      `refusing to overwrite first-party skill '${skillName}' in ${tier}/`,
    );
  }
}

export function writeOwnedSkills(
  ctx: RepoContext,
  packageId: string,
  pkg: LockPackage,
  selected: DiscoveredSkill[],
  pin: string,
  containRoot: string,
): LockPackage {
  if (selected.length === 0) {
    throw new Error(`no valid skills to write for ${packageId}`);
  }
  for (const skill of selected) {
    assertWritable(ctx, pkg.tier, skill.name, packageId);
  }
  const hashes: Record<string, string> = { ...pkg.hashes };
  for (const skill of selected) {
    const dest = skillDest(tierDir(ctx.repoRoot, pkg.tier), skill.name);
    copyDirReplace(skill.dir, dest, containRoot);
    hashes[skill.name] = sha256File(skillMdPath(dest));
  }
  const skills = [...new Set([...pkg.skills, ...selected.map((s) => s.name)])];
  return {
    source: pkg.source,
    pin,
    tier: pkg.tier,
    skills,
    hashes,
    fetchedAt: new Date().toISOString(),
  };
}

export function materializePackage(
  ctx: RepoContext,
  packageId: string,
  options: { bump: boolean; onlySkills?: string[] },
): { written: string[]; pin: string } {
  const pkg = ctx.lock.packages[packageId];
  if (pkg === undefined) {
    throw new Error(`unknown package '${packageId}'`);
  }
  if (!options.bump && pkg.pin.length === 0) {
    throw new Error(
      `package '${packageId}' has an empty pin; run \`kstack update ${packageId}\` to fetch latest`,
    );
  }
  const ref = options.bump ? null : pkg.pin;
  const fetched = fetchSource(pkg.source, ref);
  try {
    const wanted = options.onlySkills ?? pkg.skills;
    const selected = selectDiscovered(fetched.discovered, wanted);
    const next = writeOwnedSkills(
      ctx,
      packageId,
      pkg,
      selected,
      fetched.pin,
      fetched.root,
    );
    ctx.lock.packages[packageId] = next;
    return { written: selected.map((skill) => skill.name), pin: fetched.pin };
  } finally {
    fetched.cleanup();
  }
}

export function firstPartyNames(lock: LockFile, onDisk: string[]): string[] {
  return onDisk.filter((name) => ownerOfSkill(lock, name) === null);
}
