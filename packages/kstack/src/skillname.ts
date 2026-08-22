import { isAbsolute, relative, resolve } from "node:path";

export function isSkillName(name: string): boolean {
  if (name.length === 0) {
    return false;
  }
  if (name === "." || name === "..") {
    return false;
  }
  if (name.includes("/") || name.includes("\\") || name.includes("\0")) {
    return false;
  }
  return true;
}

export function assertSkillName(name: string): void {
  if (!isSkillName(name)) {
    throw new Error(
      `invalid skill name '${name}': must be one path segment (not '.', '..', or contain / or \\)`,
    );
  }
}

export function skillDest(tierRoot: string, name: string): string {
  assertSkillName(name);
  const root = resolve(tierRoot);
  const dest = resolve(root, name);
  const rel = relative(root, dest);
  if (rel !== name || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`skill dest '${name}' escapes ${root}`);
  }
  return dest;
}
