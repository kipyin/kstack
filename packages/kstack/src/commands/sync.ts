import { writeLock } from "../lock.js";
import { materializePackage } from "../materialize.js";
import { selectPackages } from "../lock.js";
import type { RepoContext } from "../types.js";

export function runSync(ctx: RepoContext, query?: string): void {
  const ids = selectPackages(ctx.lock, query);
  for (const id of ids) {
    const result = materializePackage(ctx, id, { bump: false });
    writeLock(ctx.lockPath, ctx.lock);
    console.log(`synced ${id} @ ${result.pin} (${result.written.join(", ")})`);
  }
}
