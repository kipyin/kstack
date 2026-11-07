import { exists } from "./fsutil.js";
import { copyDirReplace, symlinkSkillDir } from "./fsutil.js";
import { sha256File } from "./hash.js";
import { discoverSkills, skillMdPath, type DiscoveredSkill } from "./discover.js";
import { cloneAtRef, currentPin, removeTempDir, resolveSource } from "./git.js";
import { ownersOfSkill, packageTiers } from "./lock.js";
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
  const owners = ownersOfSkill(ctx.lock, skillName, tier);
  const owner = owners.length === 1 ? owners[0] ?? null : null;
  if (owners.length > 1) {
    throw new Error(
      `refusing to write '${skillName}' in ${tier}/: owned by ${owners.join(", ")}`,
    );
  }
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
  const tiers = packageTiers(pkg);
  if (selected.length === 0) {
    throw new Error(`no valid skills to write for ${packageId}`);
  }
  for (const tier of tiers) {
    for (const skill of selected) {
      assertWritable(ctx, tier, skill.name, packageId);
    }
  }
  const primary = tiers[0] ?? pkg.tier;
  const hashes: Record<string, string> = { ...pkg.hashes };
  for (const skill of selected) {
    const dest = skillDest(tierDir(ctx.repoRoot, primary), skill.name);
    copyDirReplace(skill.dir, dest, containRoot);
    hashes[skill.name] = sha256File(skillMdPath(dest));
  }
  for (const tier of tiers.slice(1)) {
    for (const skill of selected) {
      const dest = skillDest(tierDir(ctx.repoRoot, tier), skill.name);
      const source = skillDest(tierDir(ctx.repoRoot, primary), skill.name);
      symlinkSkillDir(dest, source);
    }
  }
  const skills = [...new Set([...pkg.skills, ...selected.map((s) => s.name)])];
  const tier = primary;
  return {
    source: pkg.source,
    pin,
    tier,
    tiers,
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
  return onDisk.filter((name) => ownersOfSkill(lock, name).length === 0);
}
