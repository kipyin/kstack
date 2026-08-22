import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";
import { looksLikeLocalSource, resolveSource } from "./git.js";
import { tempDir } from "./testutil.js";

describe("resolveSource", () => {
  it("treats owner/repo as git even when that path exists under cwd", () => {
    const cwd = tempDir("kstack-cwd-");
    mkdirSync(join(cwd, "mattpocock", "skills"), { recursive: true });
    const resolved = resolveSource("mattpocock/skills", cwd);
    assert.equal(resolved.kind, "git");
    assert.equal(resolved.location, "https://github.com/mattpocock/skills.git");
  });

  it("expands ~ and does not send it to github", () => {
    assert.equal(looksLikeLocalSource("~/Code/some-skills"), true);
    assert.throws(() => resolveSource("~/definitely-not-a-kstack-source"), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /local source is not a directory/);
      assert.ok(
        error.message.includes(join(homedir(), "definitely-not-a-kstack-source")),
      );
      assert.equal(error.message.includes("github.com"), false);
      return true;
    });
  });

  it("accepts explicit local paths", () => {
    const dir = tempDir("kstack-local-src-");
    const cwd = tempDir("kstack-local-cwd-");
    mkdirSync(join(cwd, "local-src"));
    assert.equal(resolveSource(dir, cwd).kind, "dir");
    assert.equal(resolveSource(dir, cwd).location, dir);
    assert.equal(resolveSource("./local-src", cwd).kind, "dir");
    assert.equal(resolveSource("./local-src", cwd).location, join(cwd, "local-src"));
    assert.equal(resolveSource(pathToFileURL(dir).href, cwd).kind, "dir");
  });
});
