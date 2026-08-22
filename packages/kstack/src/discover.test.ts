import assert from "node:assert/strict";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { discoverSkills } from "./discover.js";
import { tempDir } from "./testutil.js";

describe("discoverSkills", () => {
  it("prefers a nested skill folder over a repo-root SKILL.md of the same name", () => {
    const root = tempDir("kstack-disc-");
    writeFileSync(
      join(root, "SKILL.md"),
      "---\nname: officecli\n---\nroot copy\n",
    );
    const nested = join(root, "skills", "officecli");
    mkdirSync(nested, { recursive: true });
    writeFileSync(
      join(nested, "SKILL.md"),
      "---\nname: officecli\n---\nnested copy\n",
    );
    const found = discoverSkills(root);
    assert.equal(found.length, 1);
    assert.equal(found[0]?.dir, nested);
  });

  it("follows a nested SKILL.md symlink instead of using the repo root", () => {
    const root = tempDir("kstack-disc-link-");
    writeFileSync(
      join(root, "SKILL.md"),
      "---\nname: officecli\n---\nroot copy\n",
    );
    const nested = join(root, "skills", "officecli");
    mkdirSync(nested, { recursive: true });
    symlinkSync(join(root, "SKILL.md"), join(nested, "SKILL.md"));
    const found = discoverSkills(root);
    assert.equal(found.length, 1);
    assert.equal(found[0]?.dir, nested);
  });

  it("skips a frontmatter name that is not one path segment", () => {
    const root = tempDir("kstack-disc-evil-");
    const nested = join(root, "skills", "escape");
    mkdirSync(nested, { recursive: true });
    writeFileSync(
      join(nested, "SKILL.md"),
      "---\nname: ../lighthouse/pwned\n---\nnope\n",
    );
    assert.deepEqual(discoverSkills(root), []);
  });
});

