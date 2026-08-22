import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serializeLock } from "./lock.js";
import type { LockFile } from "./types.js";

export function packageRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

export function skillsRepoRoot(): string {
  return join(packageRoot(), "..", "..");
}

export function tempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function writeSkill(dir: string, name: string, body = "body"): string {
  const skillDir = join(dir, name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(skillDir, "SKILL.md"),
    `---\nname: ${name}\ndescription: test\n---\n\n${body}\n`,
  );
  return skillDir;
}

export function writeToml(paths: {
  global?: string[];
  lighthouse?: string[];
  lightmind?: string[];
}): string {
  const quote = (value: string): string => `"${value}"`;
  const list = (values: string[]): string =>
    `[${values.map(quote).join(", ")}]`;
  return [
    `skills_repo = "~/Code/kstack"`,
    ``,
    `[paths]`,
    `global = ${list(paths.global ?? [])}`,
    `lighthouse = ${list(paths.lighthouse ?? [])}`,
    `lightmind = ${list(paths.lightmind ?? [])}`,
    ``,
  ].join("\n");
}

export function emptyLock(): LockFile {
  return {
    version: 1,
    comment: "test lock",
    packages: {},
  };
}

export function writeRepo(options: {
  paths?: {
    global?: string[];
    lighthouse?: string[];
    lightmind?: string[];
  };
  lock?: LockFile;
  firstParty?: string[];
}): string {
  const root = tempDir("kstack-repo-");
  mkdirSync(join(root, "global"), { recursive: true });
  mkdirSync(join(root, "lighthouse"), { recursive: true });
  mkdirSync(join(root, "lightmind"), { recursive: true });
  writeFileSync(join(root, "kstack.toml"), writeToml(options.paths ?? {}));
  writeFileSync(join(root, "lock.json"), serializeLock(options.lock ?? emptyLock()));
  for (const name of options.firstParty ?? []) {
    writeSkill(join(root, "global"), name, "first-party");
  }
  return root;
}
