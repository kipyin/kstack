import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { parseLock, selectPackages, serializeLock } from "./lock.js";
import { skillsRepoRoot } from "./testutil.js";

describe("lock.json", () => {
  it("parses the repo lock and keeps first-party names unowned", () => {
    const text = readFileSync(join(skillsRepoRoot(), "lock.json"), "utf8");
    const lock = parseLock(text);
    assert.equal(lock.version, 1);
    assert.ok(lock.packages["mattpocock/skills"]);
    const matt = lock.packages["mattpocock/skills"];
    assert.ok(matt !== undefined);
    assert.equal(matt.skills.length, 25);
    assert.ok(matt.skills.includes("to-tickets"));
    assert.equal(selectPackages(lock, "ask-matt")[0], "mattpocock/skills");
    assert.equal(selectPackages(lock, "ego-browser")[0], "citrolabs/ego-lite");
  });

  it("round-trips serialize/parse", () => {
    const text = readFileSync(join(skillsRepoRoot(), "lock.json"), "utf8");
    const lock = parseLock(text);
    const again = parseLock(serializeLock(lock));
    assert.deepEqual(again.packages["herdrdev/herdr"], lock.packages["herdrdev/herdr"]);
  });

  it("rejects a skill name that is not one path segment", () => {
    assert.throws(
      () =>
        parseLock(
          JSON.stringify({
            version: 1,
            packages: {
              a: {
                source: "a",
                pin: "abc",
                tier: "global",
                skills: ["../lighthouse/x"],
              },
            },
          }),
        ),
      /invalid skill name/,
    );
  });

  it("rejects two packages owning the same skill", () => {
    assert.throws(
      () =>
        parseLock(
          JSON.stringify({
            version: 1,
            packages: {
              a: { source: "a", pin: "", tier: "global", skills: ["dup"] },
              b: { source: "b", pin: "", tier: "global", skills: ["dup"] },
            },
          }),
        ),
      /owned by both/,
    );
  });
});
