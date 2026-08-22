import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { loadLock } from "./lock.js";
import { runAdd } from "./commands/add.js";
import { runSync } from "./commands/sync.js";
import { emptyPackage } from "./lock.js";
import { locateRepo } from "./repo.js";
import { tempDir, writeRepo, writeSkill } from "./testutil.js";

describe("kstack add / first-party protection", () => {
  it("vendors a local source into global/ and records a lock pin", () => {
    const repo = writeRepo({ firstParty: ["show-me"] });
    const source = tempDir("kstack-src-");
    writeSkill(source, "demo-tool", "wrapper");
    const ctx = locateRepo({ repo });
    runAdd(ctx, { source, scope: "global", skills: ["demo-tool"] });

    const lock = loadLock(join(repo, "lock.json"));
    assert.ok(lock.packages[source]);
    const pkg = lock.packages[source];
    assert.ok(pkg !== undefined);
    assert.equal(pkg.pin, "local");
    assert.deepEqual(pkg.skills, ["demo-tool"]);
    assert.match(
      readFileSync(join(repo, "global", "demo-tool", "SKILL.md"), "utf8"),
      /wrapper/,
    );
    assert.match(
      readFileSync(join(repo, "global", "show-me", "SKILL.md"), "utf8"),
      /first-party/,
    );
  });

  it("refuses to overwrite a first-party folder", () => {
    const repo = writeRepo({ firstParty: ["show-me"] });
    const source = tempDir("kstack-src-");
    writeSkill(source, "show-me", "should-not-win");
    const ctx = locateRepo({ repo });
    assert.throws(
      () => runAdd(ctx, { source, scope: "global", skills: ["show-me"] }),
      /first-party/,
    );
    assert.match(
      readFileSync(join(repo, "global", "show-me", "SKILL.md"), "utf8"),
      /first-party/,
    );
  });

  it("refuses a frontmatter name that would escape the tier", () => {
    const repo = writeRepo({ firstParty: ["show-me"] });
    const source = tempDir("kstack-src-");
    const nested = join(source, "escape");
    mkdirSync(nested, { recursive: true });
    writeFileSync(
      join(nested, "SKILL.md"),
      "---\nname: ../lighthouse/pwned\n---\nnope\n",
    );
    const ctx = locateRepo({ repo });
    assert.throws(
      () => runAdd(ctx, { source, scope: "global", skills: [] }),
      /no valid skills|invalid skill name/,
    );
    assert.throws(
      () =>
        runAdd(ctx, {
          source,
          scope: "global",
          skills: ["../lighthouse/pwned"],
        }),
      /invalid skill name/,
    );
    assert.equal(existsSync(join(repo, "lighthouse", "pwned")), false);
    assert.match(
      readFileSync(join(repo, "global", "show-me", "SKILL.md"), "utf8"),
      /first-party/,
    );
  });
});

describe("kstack sync", () => {
  it("rewrites the current pin and leaves first-party folders untouched", () => {
    const repo = writeRepo({ firstParty: ["show-me"] });
    const source = tempDir("kstack-src-");
    writeSkill(source, "demo-tool", "wrapper-v1");
    const ctx = locateRepo({ repo });
    runAdd(ctx, { source, scope: "global", skills: ["demo-tool"] });
    const before = loadLock(join(repo, "lock.json"));
    const pkg = before.packages[source];
    assert.ok(pkg !== undefined);
    assert.equal(pkg.pin, "local");

    writeFileSync(join(source, "demo-tool", "SKILL.md"), "---\nname: demo-tool\n---\nwrapper-v1\n");
    const afterAdd = locateRepo({ repo });
    runSync(afterAdd, source);

    const after = loadLock(join(repo, "lock.json"));
    assert.equal(after.packages[source]?.pin, "local");
    assert.match(
      readFileSync(join(repo, "global", "show-me", "SKILL.md"), "utf8"),
      /first-party/,
    );
    assert.match(
      readFileSync(join(repo, "global", "demo-tool", "SKILL.md"), "utf8"),
      /wrapper-v1/,
    );
  });

  it("refuses an empty pin", () => {
    const source = tempDir("kstack-src-");
    writeSkill(source, "demo-tool", "wrapper");
    const lock = {
      version: 1 as const,
      comment: "test",
      packages: {
        [source]: emptyPackage(source, "global", ["demo-tool"]),
      },
    };
    const repo = writeRepo({ firstParty: ["show-me"], lock });
    const ctx = locateRepo({ repo });
    assert.throws(() => runSync(ctx, source), /empty pin/);
    assert.match(
      readFileSync(join(repo, "global", "show-me", "SKILL.md"), "utf8"),
      /first-party/,
    );
  });
});

