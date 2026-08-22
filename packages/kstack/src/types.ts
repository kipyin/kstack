export const TIERS = ["global", "lighthouse", "lightmind"] as const;
export type Tier = (typeof TIERS)[number];

export const KIND = ["first-party", "lock-owned"] as const;
export type SkillKind = (typeof KIND)[number];

export type LockPackage = {
  source: string;
  pin: string;
  tier: Tier;
  skills: string[];
  hashes: Record<string, string>;
  fetchedAt: string;
};

export type LockFile = {
  version: 1;
  comment: string;
  packages: Record<string, LockPackage>;
};

export type LinkPaths = Record<Tier, string[]>;

export type KstackConfig = {
  paths: LinkPaths;
};

export type SkillRecord = {
  name: string;
  tier: Tier;
  path: string;
  kind: SkillKind;
  packageId: string | null;
  hasSkillMd: boolean;
};

export type RepoContext = {
  repoRoot: string;
  configPath: string;
  lockPath: string;
  config: KstackConfig;
  lock: LockFile;
};

export function isTier(value: string): value is Tier {
  return (TIERS as readonly string[]).includes(value);
}
