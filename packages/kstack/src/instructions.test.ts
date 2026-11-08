import assert from "node:assert/strict";
import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runLink } from "./commands/link.js";
import { runStatus } from "./commands/status.js";
import { parseConfigToml } from "./config.js";
import { inspectInstructionLink } from "./instructions.js";
import { locateRepo } from "./repo.js";
import { tempDir, writeRepo } from "./testutil.js";

function fixture() {
  const root = writeRepo({});
  const source = join(root, "global", "AGENTS.md");
  const dest = join(tempDir("kstack-instructions-"), "harness", "AGENTS.md");
  writeFileSync(source, "Shared instructions\n");
  writeFileSync(join(root, "kstack.toml"), `[instructions]\npaths = [${JSON.stringify(dest)}]\n`);
  return { root, source, dest, ctx: locateRepo({ repo: root }) };
}

describe("shared instruction links", () => {
  it("parses explicit paths and rejects invalid configuration", () => {
    assert.deepEqual(parseConfigToml("").instructionPaths, []);
    assert.deepEqual(parseConfigToml('[instructions]\npaths = ["~/a"]\n').instructionPaths, ["~/a"]);
    assert.throws(() => parseConfigToml('[instructions]\npaths = "~/a"\n'), /array of strings/);
    assert.throws(() => parseConfigToml('[instructions]\nunknown = []\n'), /unknown instructions key/);
  });

  it("links the shared file, reports health, and is idempotent", () => {
    const { ctx, source, dest } = fixture();
    assert.equal(runStatus(ctx), 1);
    runLink(ctx, { force: false });
    assert.equal(readlinkSync(dest), source);
    assert.equal(readFileSync(dest, "utf8"), "Shared instructions\n");
    assert.equal(inspectInstructionLink({ source, dest }), "ok");
    assert.equal(runStatus(ctx), 0);
    runLink(ctx, { force: false });
    assert.equal(readlinkSync(dest), source);
  });

  it("can link instructions without changing skills", () => {
    const { ctx, source, dest } = fixture();
    const skillsDir = join(tempDir("kstack-skill-dest-"), "skills");
    ctx.config.paths.global.push(skillsDir);
    mkdirSync(join(ctx.repoRoot, "global", "test-skill"));
    writeFileSync(join(ctx.repoRoot, "global", "test-skill", "SKILL.md"), "test");
    runLink(ctx, { force: false, instructionsOnly: true });
    assert.equal(readlinkSync(dest), source);
    assert.equal(existsSync(skillsDir), false);
  });

  it("preflights every destination before changing files, even with --force", () => {
    const { ctx, source, dest } = fixture();
    const conflict = join(tempDir("kstack-conflict-"), "AGENTS.md");
    writeFileSync(conflict, "personal instructions\n");
    ctx.config.instructionPaths.push(conflict);
    assert.throws(() => runLink(ctx, { force: true }), /preserved/);
    assert.equal(existsSync(dest), false);
    assert.equal(readFileSync(conflict, "utf8"), "personal instructions\n");
    assert.equal(inspectInstructionLink({ source, dest: conflict }), "conflict");
    runLink(ctx, { force: false, dryRun: true });
    assert.equal(existsSync(dest), false);
    assert.equal(readFileSync(conflict, "utf8"), "personal instructions\n");
  });

  it("backs up existing files and wrong or broken links only when requested", () => {
    const { ctx, source, dest } = fixture();
    mkdirSync(join(dest, ".."), { recursive: true });
    writeFileSync(dest, "old instructions\n");
    const wrong = join(tempDir("kstack-wrong-"), "AGENTS.md");
    const dangling = join(tempDir("kstack-dangling-"), "AGENTS.md");
    symlinkSync(source + ".other", wrong);
    symlinkSync("missing.md", dangling);
    ctx.config.instructionPaths.push(wrong, dangling);
    runLink(ctx, { force: false, backupInstructions: true });
    assert.equal(readFileSync(dest + ".kstack-backup", "utf8"), "old instructions\n");
    assert.equal(readlinkSync(wrong + ".kstack-backup"), source + ".other");
    assert.equal(readlinkSync(dangling + ".kstack-backup"), "missing.md");
    for (const path of [dest, wrong, dangling]) assert.equal(readlinkSync(path), source);
  });

  it("refuses to overwrite backups and directories without changing any destination", () => {
    const { ctx, dest } = fixture();
    mkdirSync(join(dest, ".."), { recursive: true });
    writeFileSync(dest, "old\n");
    writeFileSync(dest + ".kstack-backup", "earlier backup\n");
    assert.throws(() => runLink(ctx, { force: false, backupInstructions: true }), /backup already exists/);
    assert.equal(readFileSync(dest, "utf8"), "old\n");
    const dir = join(tempDir("kstack-dir-"), "AGENTS.md");
    mkdirSync(dir);
    ctx.config.instructionPaths = [dir];
    assert.throws(() => runLink(ctx, { force: true, backupInstructions: true }), /destination is a directory/);
    assert.equal(lstatSync(dir).isDirectory(), true);
  });

  it("reports a missing source and does not create links", () => {
    const { ctx, source, dest } = fixture();
    unlinkSync(source);
    assert.equal(runStatus(ctx), 1);
    assert.throws(() => runLink(ctx, { force: false }), /missing shared instruction file/);
    assert.equal(existsSync(dest), false);
  });

  it("rejects the shared source as a destination", () => {
    const { ctx, source } = fixture();
    ctx.config.instructionPaths = [source];
    assert.throws(() => runLink(ctx, { force: false, backupInstructions: true }), /shared source/);
    assert.equal(readFileSync(source, "utf8"), "Shared instructions\n");
  });
});
