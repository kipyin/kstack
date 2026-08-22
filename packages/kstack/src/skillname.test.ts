import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "node:test";
import { assertSkillName, isSkillName, skillDest } from "./skillname.js";

describe("skill names", () => {
  it("accepts a single path segment", () => {
    assert.equal(isSkillName("officecli"), true);
    assert.equal(isSkillName("improve-codebase-architecture"), true);
    assert.doesNotThrow(() => assertSkillName("ego-browser"));
  });

  it("rejects path traversal and multi-segment names", () => {
    for (const name of ["", ".", "..", "../lighthouse/x", "foo/bar", "foo\\bar"]) {
      assert.equal(isSkillName(name), false, name);
      assert.throws(() => assertSkillName(name), /invalid skill name/);
    }
  });

  it("keeps dest inside the tier directory", () => {
    const tier = "/workspace/global";
    assert.equal(skillDest(tier, "show-me"), join(tier, "show-me"));
    assert.throws(() => skillDest(tier, ".."), /invalid skill name/);
    assert.throws(() => skillDest(tier, "../lighthouse/x"), /invalid skill name/);
  });
});
