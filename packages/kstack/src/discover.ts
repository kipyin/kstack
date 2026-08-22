import { basename, dirname, join, relative } from "node:path";
import { readText, walkFiles } from "./fsutil.js";
import { isSkillName } from "./skillname.js";

export type DiscoveredSkill = {
  name: string;
  dir: string;
  skillMd: string;
  depth: number;
};

function frontmatterName(skillMdPath: string): string | null {
  const text = readText(skillMdPath);
  const start = text.indexOf("---");
  if (start !== 0) {
    return null;
  }
  const end = text.indexOf("\n---", 3);
  if (end === -1) {
    return null;
  }
  const block = text.slice(3, end);
  for (const line of block.split("\n")) {
    const match = /^name:\s*(.+?)\s*$/.exec(line);
    if (match?.[1] !== undefined) {
      return match[1].replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

function preferSkill(existing: DiscoveredSkill, next: DiscoveredSkill): boolean {
  const existingIsRepoRoot = existing.depth === 0;
  const nextIsRepoRoot = next.depth === 0;
  if (existingIsRepoRoot !== nextIsRepoRoot) {
    return !nextIsRepoRoot;
  }
  return next.depth < existing.depth;
}

function depthOf(relPath: string): number {
  if (relPath.length === 0) {
    return 0;
  }
  return relPath.split(/[\\/]/).length;
}

export function discoverSkills(root: string): DiscoveredSkill[] {
  const byName = new Map<string, DiscoveredSkill>();
  walkFiles(root, (absPath, relPath) => {
    if (basename(absPath) !== "SKILL.md") {
      return;
    }
    const dir = dirname(absPath);
    const relDir = relative(root, dir);
    const depth = depthOf(relDir);
    const fromMatter = frontmatterName(absPath);
    const name =
      fromMatter ??
      (relDir.length === 0 ? basename(root) : basename(dir));
    if (!isSkillName(name)) {
      return;
    }
    const next: DiscoveredSkill = { name, dir, skillMd: absPath, depth };
    const existing = byName.get(name);
    if (existing === undefined || preferSkill(existing, next)) {
      byName.set(name, next);
    }
  });
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function skillMdPath(skillDir: string): string {
  return join(skillDir, "SKILL.md");
}
