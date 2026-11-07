import { renameSync, writeFileSync } from "node:fs";
import { isTier, type LockFile, type LockPackage, type Tier } from "./types.js";
import { readText } from "./fsutil.js";
import { assertSkillName } from "./skillname.js";

type RawLockPackage = {
  source?: unknown;
  pin?: unknown;
  tier?: unknown;
  tiers?: unknown;
  skills?: unknown;
  hashes?: unknown;
  fetchedAt?: unknown;
};

type RawLock = {
  version?: unknown;
  $comment?: unknown;
  packages?: unknown;
};

function asString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  return value;
}

function asStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
  return value;
}

function parsePackage(id: string, raw: RawLockPackage): LockPackage {
  const source = asString(raw.source, `packages.${id}.source`);
  const pin = raw.pin === undefined ? "" : asString(raw.pin, `packages.${id}.pin`);
  const tierValue = asString(raw.tier, `packages.${id}.tier`);
  if (!isTier(tierValue)) {
    throw new Error(`packages.${id}.tier must be a known tier`);
  }
  const tiers = parseTiers(id, tierValue, raw.tiers);
  const skills = asStringArray(raw.skills, `packages.${id}.skills`);
  if (new Set(skills).size !== skills.length) {
    throw new Error(`packages.${id}.skills contains duplicates`);
  }
  for (const name of skills) {
    try {
      assertSkillName(name);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`packages.${id}.skills: ${reason}`);
    }
  }
  const hashes: Record<string, string> = {};
  if (raw.hashes !== undefined) {
    if (raw.hashes === null || typeof raw.hashes !== "object") {
      throw new Error(`packages.${id}.hashes must be an object`);
    }
    for (const [name, hash] of Object.entries(raw.hashes)) {
      hashes[name] = asString(hash, `packages.${id}.hashes.${name}`);
    }
  }
  const fetchedAt =
    raw.fetchedAt === undefined
      ? ""
      : asString(raw.fetchedAt, `packages.${id}.fetchedAt`);
  return { source, pin, tier: tierValue, tiers, skills, hashes, fetchedAt };
}

function parseTiers(id: string, tier: Tier, raw: unknown): Tier[] {
  if (raw === undefined) {
    return [tier];
  }
  const values = asStringArray(raw, `packages.${id}.tiers`);
  if (values.length === 0) {
    throw new Error(`packages.${id}.tiers must list at least one tier`);
  }
  const tiers: Tier[] = [];
  for (const value of values) {
    if (!isTier(value)) {
      throw new Error(`packages.${id}.tiers must be known tiers`);
    }
    if (tiers.includes(value)) {
      throw new Error(`packages.${id}.tiers contains duplicates`);
    }
    tiers.push(value);
  }
  if (!tiers.includes(tier)) {
    throw new Error(`packages.${id}.tier must be included in tiers`);
  }
  return tiers;
}

export function packageTiers(pkg: LockPackage): Tier[] {
  return pkg.tiers.length > 0 ? pkg.tiers : [pkg.tier];
}

export function parseLock(text: string): LockFile {
  let raw: RawLock;
  try {
    raw = JSON.parse(text) as RawLock;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`lock.json is not valid JSON: ${reason}`);
  }
  if (raw.version !== 1) {
    throw new Error(`unsupported lock.json version: ${String(raw.version)}`);
  }
  if (raw.packages === undefined || raw.packages === null || typeof raw.packages !== "object") {
    throw new Error("lock.json packages must be an object");
  }
  const packages: Record<string, LockPackage> = {};
  for (const [id, value] of Object.entries(raw.packages)) {
    if (value === null || typeof value !== "object") {
      throw new Error(`packages.${id} must be an object`);
    }
    packages[id] = parsePackage(id, value as RawLockPackage);
  }
  const owned = new Map<string, string>();
  for (const [id, pkg] of Object.entries(packages)) {
    for (const tier of packageTiers(pkg)) {
      for (const skill of pkg.skills) {
        const key = `${tier}/${skill}`;
        const previous = owned.get(key);
        if (previous !== undefined && previous !== id) {
          throw new Error(
            `skill '${skill}' in ${tier}/ is owned by both '${previous}' and '${id}'`,
          );
        }
        owned.set(key, id);
      }
    }
  }
  return {
    version: 1,
    comment: typeof raw.$comment === "string" ? raw.$comment : "",
    packages,
  };
}

export function loadLock(path: string): LockFile {
  return parseLock(readText(path));
}

export function serializeLock(lock: LockFile): string {
  const packages: Record<string, unknown> = {};
  for (const id of Object.keys(lock.packages).sort()) {
    const pkg = lock.packages[id];
    if (pkg === undefined) {
      continue;
    }
    const tiers = packageTiers(pkg);
    const entry: Record<string, unknown> = {
      source: pkg.source,
      pin: pkg.pin,
      tier: tiers[0] ?? pkg.tier,
      skills: pkg.skills,
    };
    if (tiers.length > 1) {
      entry.tiers = tiers;
    }
    if (Object.keys(pkg.hashes).length > 0) {
      entry.hashes = pkg.hashes;
    }
    if (pkg.fetchedAt.length > 0) {
      entry.fetchedAt = pkg.fetchedAt;
    }
    packages[id] = entry;
  }
  return `${JSON.stringify(
    {
      $schema: "./lock.schema.json",
      $comment: lock.comment,
      version: 1,
      packages,
    },
    null,
    2,
  )}\n`;
}

export function writeLock(path: string, lock: LockFile): void {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, serializeLock(lock));
  renameSync(tmp, path);
}

export function ownersOfSkill(
  lock: LockFile,
  skill: string,
  tier?: Tier,
): string[] {
  const ids: string[] = [];
  for (const [id, pkg] of Object.entries(lock.packages)) {
    if (!pkg.skills.includes(skill)) {
      continue;
    }
    if (tier !== undefined && !packageTiers(pkg).includes(tier)) {
      continue;
    }
    ids.push(id);
  }
  return ids.sort();
}

export function ownerOfSkill(
  lock: LockFile,
  skill: string,
  tier?: Tier,
): string | null {
  const ids = ownersOfSkill(lock, skill, tier);
  if (ids.length === 1) {
    return ids[0] ?? null;
  }
  return null;
}

export function packageIds(lock: LockFile): string[] {
  return Object.keys(lock.packages).sort();
}

export function selectPackages(lock: LockFile, query?: string): string[] {
  if (query === undefined || query.length === 0) {
    return packageIds(lock);
  }
  if (lock.packages[query] !== undefined) {
    return [query];
  }
  const owners = ownersOfSkill(lock, query);
  if (owners.length === 1) {
    return owners;
  }
  if (owners.length > 1) {
    throw new Error(
      `ambiguous skill '${query}'; owned by: ${owners.join(", ")}`,
    );
  }
  const matches = packageIds(lock).filter(
    (id) => id === query || id.endsWith(`/${query}`) || id.includes(query),
  );
  if (matches.length === 1) {
    const only = matches[0];
    if (only !== undefined) {
      return [only];
    }
  }
  if (matches.length > 1) {
    throw new Error(
      `ambiguous package '${query}'; matches: ${matches.join(", ")}`,
    );
  }
  throw new Error(`unknown package or skill '${query}'`);
}

export function emptyPackage(
  source: string,
  tier: Tier | readonly Tier[],
  skills: string[],
): LockPackage {
  const tiers = typeof tier === "string" ? [tier] : [...tier];
  const first = tiers[0];
  if (first === undefined) {
    throw new Error("package needs a tier");
  }
  return {
    source,
    pin: "",
    tier: first,
    tiers,
    skills,
    hashes: {},
    fetchedAt: "",
  };
}
