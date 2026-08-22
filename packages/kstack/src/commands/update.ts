import { selectPackages, writeLock } from "../lock.js";
import { materializePackage } from "../materialize.js";
import type { RepoContext } from "../types.js";

export function runUpdate(ctx: RepoContext, query?: string): void {
  const ids = selectPackages(ctx.lock, query);
  for (const id of ids) {
    const result = materializePackage(ctx, id, { bump: true });
    writeLock(ctx.lockPath, ctx.lock);
    console.log(`updated ${id} @ ${result.pin} (${result.written.join(", ")})`);
  }
}
