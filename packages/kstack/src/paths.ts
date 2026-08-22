import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

export function expandUser(path: string): string {
  const home = homedir();
  let out = path.replaceAll("${HOME}", home);
  if (out === "~") {
    return home;
  }
  if (out.startsWith("~/")) {
    return join(home, out.slice(2));
  }
  return out;
}

export function resolvePath(path: string, cwd = process.cwd()): string {
  const expanded = expandUser(path);
  return isAbsolute(expanded) ? resolve(expanded) : resolve(cwd, expanded);
}

export function findFileUp(startDir: string, fileName: string): string | null {
  let dir = resolve(startDir);
  while (true) {
    const candidate = join(dir, fileName);
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

export function defaultMacCheckout(): string {
  return join(homedir(), "Code", "skills");
}
