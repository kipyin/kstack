import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { skillsRepoRoot, tempDir } from "./testutil.js";

describe("install.sh", () => {
  it("never calls npx and copies global skills into ~/.cursor/skills", () => {
    const repo = skillsRepoRoot();
    const script = readFileSync(join(repo, "install.sh"), "utf8");
    const code = script
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("#"))
      .join("\n");
    assert.equal(code.includes("npx"), false);

    const home = tempDir("kstack-home-");
    const result = spawnSync("bash", [join(repo, "install.sh"), "global"], {
      encoding: "utf8",
      env: { ...process.env, HOME: home },
    });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const dest = join(home, ".cursor", "skills");
    assert.equal(existsSync(join(dest, "show-me", "SKILL.md")), true);
    assert.equal(existsSync(join(dest, "humanizer-zh", "SKILL.md")), true);
    const names = readdirSync(dest);
    assert.ok(names.includes("ultra-review"));
    assert.ok(!names.includes("db-create-update"));
  });

  it("copies a project tier when selected", () => {
    const repo = skillsRepoRoot();
    const home = tempDir("kstack-home-");
    const result = spawnSync("bash", [join(repo, "install.sh"), "lighthouse"], {
      encoding: "utf8",
      env: { ...process.env, HOME: home },
    });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal(
      existsSync(join(home, ".cursor", "skills", "gitee-pr-workflow", "SKILL.md")),
      true,
    );
    assert.equal(existsSync(join(home, ".cursor", "skills", "show-me", "SKILL.md")), true);
  });
});
