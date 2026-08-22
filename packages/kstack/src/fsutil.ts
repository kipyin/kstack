import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

export const SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  ".DS_Store",
]);

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export function isSymlink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

export function exists(path: string): boolean {
  return existsSync(path);
}

export function readText(path: string): string {
  return readFileSync(path, "utf8");
}

export function listSkillDirs(root: string): string[] {
  if (!isDir(root)) {
    return [];
  }
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

export function isInsideRoot(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function copyTree(from: string, to: string, srcRoot: string): void {
  ensureDir(to);
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(entry.name)) {
      continue;
    }
    const fromPath = join(from, entry.name);
    const toPath = join(to, entry.name);
    if (entry.isSymbolicLink()) {
      let target: string;
      try {
        target = realpathSync(fromPath);
      } catch {
        continue;
      }
      if (!isInsideRoot(srcRoot, target)) {
        continue;
      }
      let st;
      try {
        st = statSync(target);
      } catch {
        continue;
      }
      if (st.isFile()) {
        copyFileSync(target, toPath);
      }
      continue;
    }
    if (entry.isDirectory()) {
      copyTree(fromPath, toPath, srcRoot);
      continue;
    }
    if (entry.isFile()) {
      copyFileSync(fromPath, toPath);
    }
  }
}

export function copyDirReplace(
  src: string,
  dest: string,
  containRoot = src,
): void {
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
  }
  ensureDir(join(dest, ".."));
  copyTree(src, dest, containRoot);
}

export function walkFiles(
  root: string,
  visit: (absPath: string, relPath: string) => void,
): void {
  const walk = (dir: string, rel: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIR_NAMES.has(entry.name)) {
        continue;
      }
      const abs = join(dir, entry.name);
      const nextRel = rel ? join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) {
        walk(abs, nextRel);
        continue;
      }
      if (entry.isFile() || entry.isSymbolicLink()) {
        visit(abs, nextRel);
      }
    }
  };
  walk(root, "");
}
