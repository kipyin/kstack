import { emptyPackage, packageTiers, writeLock } from "../lock.js";
import { fetchSource, selectDiscovered, writeOwnedSkills } from "../materialize.js";
import { parseSource } from "../git.js";
import type { RepoContext, Tier } from "../types.js";
import { TIERS, isTier } from "../types.js";

export type AddOptions = {
  source: string;
  scope: string | readonly string[];
  skills: string[];
};

function sameTiers(left: readonly Tier[], right: readonly Tier[]): boolean {
  return left.length === right.length && left.every((tier, index) => tier === right[index]);
}

function scopesOf(scope: string | readonly string[]): Tier[] {
  const list = typeof scope === "string" ? [scope] : [...scope];
  if (list.length === 0) {
    throw new Error(`--scope is required (${TIERS.join("|")})`);
  }
  const tiers: Tier[] = [];
  for (const item of list) {
    if (!isTier(item)) {
      throw new Error(`--scope must be ${TIERS.join("|")}; got '${item}'`);
    }
    if (!tiers.includes(item)) {
      tiers.push(item);
    }
  }
  return tiers;
}

export function runAdd(ctx: RepoContext, options: AddOptions): void {
  const scopes = scopesOf(options.scope);
  const parsed = parseSource(options.source);
  const packageId = parsed.source;
  const existing = ctx.lock.packages[packageId];
  const fetched = fetchSource(parsed.source, parsed.ref);
  try {
    const wanted = options.skills.length > 0 ? options.skills : null;
    const selected = selectDiscovered(fetched.discovered, wanted);
    const names = selected.map((skill) => skill.name);
    if (existing !== undefined && !sameTiers(packageTiers(existing), scopes)) {
      throw new Error(
        `package '${packageId}' is already locked to ${packageTiers(existing).join(", ")}; got --scope ${scopes.join(", ")}`,
      );
    }
    const base = existing ?? emptyPackage(parsed.source, scopes, names);
    const next = writeOwnedSkills(
      ctx,
      packageId,
      base,
      selected,
      fetched.pin,
      fetched.root,
    );
    ctx.lock.packages[packageId] = next;
    writeLock(ctx.lockPath, ctx.lock);
    console.log(
      `added ${packageId} @ ${fetched.pin} → ${scopes.join(", ")} (${names.join(", ")})`,
    );
  } finally {
    fetched.cleanup();
  }
}
