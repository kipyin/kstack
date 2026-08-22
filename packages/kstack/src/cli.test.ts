import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseArgv } from "./cli.js";

describe("parseArgv", () => {
  it("parses list with optional dir", () => {
    const parsed = parseArgv(["list", "global"]);
    assert.equal(parsed.command, "list");
    assert.deepEqual(parsed.rest, ["global"]);
  });

  it("parses add with repeated --skill and --scope", () => {
    const parsed = parseArgv([
      "--repo",
      "/tmp/skills",
      "add",
      "owner/repo",
      "--scope",
      "global",
      "--skill",
      "one",
      "--skill",
      "two",
    ]);
    assert.equal(parsed.command, "add");
    assert.equal(parsed.locate.repo, "/tmp/skills");
    assert.deepEqual(parsed.rest, ["owner/repo"]);
    assert.deepEqual(parsed.flags.get("scope"), ["global"]);
    assert.deepEqual(parsed.flags.get("skill"), ["one", "two"]);
  });

  it("parses link --force", () => {
    const parsed = parseArgv(["link", "--force"]);
    assert.equal(parsed.command, "link");
    assert.equal(parsed.flags.has("force"), true);
  });

  it("rejects unknown flags", () => {
    assert.throws(() => parseArgv(["list", "--nope"]), /unknown flag/);
  });
});
