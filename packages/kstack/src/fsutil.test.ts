import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { copyDirReplace } from "./fsutil.js";
import { tempDir } from "./testutil.js";

describe("copyDirReplace", () => {
  it("skips SKIP_DIR_NAMES and does not follow an out-of-tree symlink", () => {
    const outside = tempDir("kstack-out-");
    const secret = join(outside, "secret.txt");
    writeFileSync(secret, "host-secret");

    const src = tempDir("kstack-copy-src-");
    writeFileSync(join(src, "SKILL.md"), "skill body");
    mkdirSync(join(src, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(src, "node_modules", "pkg", "index.js"), "junk");
    mkdirSync(join(src, "dist"), { recursive: true });
    writeFileSync(join(src, "dist", "out.js"), "built");
    writeFileSync(join(src, ".DS_Store"), "ds");
    symlinkSync(secret, join(src, "leaked"));

    const dest = join(tempDir("kstack-copy-dest-"), "skill");
    copyDirReplace(src, dest);

    assert.equal(readFileSync(join(dest, "SKILL.md"), "utf8"), "skill body");
    assert.equal(existsSync(join(dest, "node_modules")), false);
    assert.equal(existsSync(join(dest, "dist")), false);
    assert.equal(existsSync(join(dest, ".DS_Store")), false);
    assert.equal(existsSync(join(dest, "leaked")), false);
  });

  it("flattens an in-tree SKILL.md symlink instead of copying the host target path", () => {
    const src = tempDir("kstack-copy-link-");
    writeFileSync(join(src, "SKILL.md"), "nested body");
    const nested = join(src, "skills", "officecli");
    mkdirSync(nested, { recursive: true });
    symlinkSync(join(src, "SKILL.md"), join(nested, "SKILL.md"));

    const dest = join(tempDir("kstack-copy-dest-"), "officecli");
    copyDirReplace(nested, dest, src);
    assert.equal(readFileSync(join(dest, "SKILL.md"), "utf8"), "nested body");
  });
});
