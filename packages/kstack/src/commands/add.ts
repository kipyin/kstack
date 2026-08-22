import { emptyPackage, writeLock } from "../lock.js";
import { fetchSource, selectDiscovered, writeOwnedSkills } from "../materialize.js";
import { parseSource } from "../git.js";
import type { RepoContext, Tier } from "../types.js";
import { isTier } from "../types.js";

export type AddOptions = {
  source: string;
  scope: string;
  skills: string[];
};

export function runAdd(ctx: RepoContext, options: AddOptions): void {
  if (!isTier(options.scope)) {
    throw new Error(`--scope must be global, lighthouse, or lightmind`);
  }
  const scope: Tier = options.scope;
  const parsed = parseSource(options.source);
  const packageId = parsed.source;
  const existing = ctx.lock.packages[packageId];
  const fetched = fetchSource(parsed.source, parsed.ref);
  try {
    const wanted = options.skills.length > 0 ? options.skills : null;
    const selected = selectDiscovered(fetched.discovered, wanted);
    const names = selected.map((skill) => skill.name);
    const base =
      existing ??
      emptyPackage(
        parsed.source,
        scope,
        names,
      );
    if (existing !== undefined && existing.tier !== scope) {
      throw new Error(
        `package '${packageId}' is already locked to tier ${existing.tier}; got --scope ${scope}`,
      );
    }
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
      `added ${packageId} @ ${fetched.pin} → ${scope}/ (${names.join(", ")})`,
    );
  } finally {
    fetched.cleanup();
  }
}
