import assert from "node:assert/strict";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runLink } from "./commands/link.js";
import { inspectSymlink } from "./commands/status.js";
import { locateRepo } from "./repo.js";
import { tempDir, writeRepo } from "./testutil.js";

describe("kstack link", () => {
  it("creates and replaces symlinks, and refuses a real directory without --force", () => {
    const destRoot = join(tempDir("kstack-link-"), "skills");
    const repo = writeRepo({
      paths: { global: [destRoot] },
      firstParty: ["show-me"],
    });
    const ctx = locateRepo({ repo });
    runLink(ctx, { force: false });
    const dest = join(destRoot, "show-me");
    assert.equal(inspectSymlink(dest, join(repo, "global", "show-me")), "ok");

    runLink(ctx, { force: false });
    assert.equal(inspectSymlink(dest, join(repo, "global", "show-me")), "ok");

    unlinkSync(dest);
    mkdirSync(dest);
    writeFileSync(join(dest, "SKILL.md"), "real dir now");
    assert.throws(() => runLink(ctx, { force: false }), /non-symlink/);

    runLink(ctx, { force: true });
    assert.equal(inspectSymlink(dest, join(repo, "global", "show-me")), "ok");
  });
});
