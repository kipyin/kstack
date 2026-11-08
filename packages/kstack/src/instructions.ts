import { existsSync, lstatSync, mkdirSync, realpathSync, renameSync, statSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { exists, isSymlink } from "./fsutil.js";
import { resolvePath } from "./paths.js";
import type { RepoContext } from "./types.js";

export type InstructionLink = {
  source: string;
  dest: string;
};

export type InstructionLinkHealth = "ok" | "missing" | "conflict";

export function instructionLinks(ctx: RepoContext): InstructionLink[] {
  const source = join(ctx.repoRoot, "global", "AGENTS.md");
  return ctx.config.instructionPaths.map((path) => ({ source, dest: resolvePath(path) }));
}

export function inspectInstructionLink({ source, dest }: InstructionLink): InstructionLinkHealth {
  let info;
  try {
    info = lstatSync(dest);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "missing";
    throw error;
  }
  if (info.isSymbolicLink()) {
    try {
      if (realpathSync(dest) === realpathSync(source)) return "ok";
    } catch {
      // A dangling link is an existing user-owned entry and must be preserved.
    }
  }
  return "conflict";
}

export function linkInstructions(
  ctx: RepoContext,
  backupExisting: boolean,
  dryRun = false,
): void {
  const links = instructionLinks(ctx);
  if (links.length === 0) return;
  const source = join(ctx.repoRoot, "global", "AGENTS.md");
  if (!existsSync(source) || !statSync(source).isFile()) {
    throw new Error(`missing shared instruction file: ${source}`);
  }
  const resolvedSource = realpathSync(source);

  const destinations = new Set<string>();
  const conflicts: string[] = [];
  for (const link of links) {
    if (resolve(link.dest) === resolve(source) ||
      (existsSync(link.dest) && realpathSync(link.dest) === resolvedSource && !isSymlink(link.dest))) {
      throw new Error(`instruction destination is the shared source: ${link.dest}`);
    }
    if (destinations.has(link.dest)) {
      throw new Error(`duplicate instruction destination: ${link.dest}`);
    }
    destinations.add(link.dest);
    const health = inspectInstructionLink(link);
    if (health === "conflict") {
      if (lstatSync(link.dest).isDirectory()) {
        throw new Error(`instruction destination is a directory: ${link.dest}`);
      }
      conflicts.push(link.dest);
      if (backupExisting && (exists(`${link.dest}.kstack-backup`) || isSymlink(`${link.dest}.kstack-backup`))) {
        throw new Error(`instruction backup already exists: ${link.dest}.kstack-backup`);
      }
    }
  }
  if (backupExisting) {
    for (const dest of conflicts) {
      if (destinations.has(`${dest}.kstack-backup`)) {
        throw new Error(`instruction backup is another destination: ${dest}.kstack-backup`);
      }
    }
  }
  if (conflicts.length > 0 && !backupExisting && !dryRun) {
    throw new Error(
      `existing instruction files or links were preserved: ${conflicts.join(", ")}. ` +
        "Review their contents, then rerun kstack link --backup-instructions to save them before linking.",
    );
  }

  if (dryRun) {
    for (const link of links) {
      const health = inspectInstructionLink(link);
      const action = health === "ok" ? "unchanged" : health === "missing" ? "create" : "conflict (requires --backup-instructions)";
      console.log(`${action} ${link.dest} -> ${source}`);
    }
    return;
  }

  for (const link of links) {
    const health = inspectInstructionLink(link);
    if (health === "ok") continue;
    mkdirSync(dirname(link.dest), { recursive: true });
    if (health === "conflict") {
      const backup = `${link.dest}.kstack-backup`;
      renameSync(link.dest, backup);
      console.log(`backed up ${link.dest} -> ${backup}`);
    }
    symlinkSync(source, link.dest);
    console.log(`linked instructions ${link.dest} -> ${source}`);
  }
}
