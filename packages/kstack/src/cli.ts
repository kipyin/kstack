import { runAdd } from "./commands/add.js";
import { runLink } from "./commands/link.js";
import { runList } from "./commands/list.js";
import { runStatus } from "./commands/status.js";
import { runSync } from "./commands/sync.js";
import { runUpdate } from "./commands/update.js";
import { locateRepo, type LocateOptions } from "./repo.js";
import { assertNever } from "./never.js";

const VERSION = "0.1.0";

const HELP = `kstack ${VERSION} — inventory, link, and vendor Origin skills

Usage:
  kstack [--repo <path>] [--config <path>] <command> [args]

Commands:
  list [dir]                 Inventory a tier (global|lighthouse|lightmind), a path, or all tiers
  status                     Pins, first-party vs lock-owned, symlink health, drift
  link [--force]             Symlink ~/.cursor/skills (and friends) → this repo
  sync [pkg]                 Re-materialize current lock pins (no bump)
  update [pkg|skill]         Bump pin to latest, then write owned folders
  add <source> --scope <tier> [--skill name]...
                             Fetch once, write into a tier, add/update lock entries

Mac: clone to ~/Code/skills, then \`kstack link\`.
Cloud VMs: run ./install.sh [global|lighthouse|lightmind] 

Overrides: --repo, --config, KSTACK_REPO, KSTACK_CONFIG.
`;

type CommandName = "list" | "status" | "link" | "sync" | "update" | "add" | "help" | "version";

type ParsedCli = {
  locate: LocateOptions;
  command: CommandName;
  rest: string[];
  flags: Map<string, string[]>;
};

function isCommand(value: string): value is CommandName {
  return (
    value === "list" ||
    value === "status" ||
    value === "link" ||
    value === "sync" ||
    value === "update" ||
    value === "add" ||
    value === "help" ||
    value === "version"
  );
}

function takeFlagValue(
  argv: string[],
  index: number,
  flag: string,
): { value: string; next: number } {
  const current = argv[index];
  if (current === undefined) {
    throw new Error(`${flag} requires a value`);
  }
  if (current.startsWith("--") && !current.startsWith(`${flag}=`)) {
    throw new Error(`${flag} requires a value`);
  }
  return { value: current, next: index + 1 };
}

export function parseArgv(argv: string[]): ParsedCli {
  const locate: LocateOptions = {};
  const flags = new Map<string, string[]>();
  const rest: string[] = [];
  let command: CommandName | null = null;
  let i = 0;

  const pushFlag = (name: string, value: string): void => {
    const existing = flags.get(name) ?? [];
    existing.push(value);
    flags.set(name, existing);
  };

  while (i < argv.length) {
    const arg = argv[i];
    if (arg === undefined) {
      break;
    }
    if (arg === "--") {
      rest.push(...argv.slice(i + 1));
      break;
    }
    if (arg === "-h" || arg === "--help") {
      command = "help";
      i += 1;
      continue;
    }
    if (arg === "-v" || arg === "--version") {
      command = "version";
      i += 1;
      continue;
    }
    if (arg === "--force") {
      pushFlag("force", "true");
      i += 1;
      continue;
    }
    if (arg === "--repo" || arg.startsWith("--repo=")) {
      const inline = arg.startsWith("--repo=") ? arg.slice("--repo=".length) : null;
      if (inline !== null) {
        locate.repo = inline;
        i += 1;
        continue;
      }
      const taken = takeFlagValue(argv, i + 1, "--repo");
      locate.repo = taken.value;
      i = taken.next;
      continue;
    }
    if (arg === "--config" || arg.startsWith("--config=")) {
      const inline = arg.startsWith("--config=") ? arg.slice("--config=".length) : null;
      if (inline !== null) {
        locate.config = inline;
        i += 1;
        continue;
      }
      const taken = takeFlagValue(argv, i + 1, "--config");
      locate.config = taken.value;
      i = taken.next;
      continue;
    }
    if (arg === "--scope" || arg.startsWith("--scope=")) {
      const inline = arg.startsWith("--scope=") ? arg.slice("--scope=".length) : null;
      if (inline !== null) {
        pushFlag("scope", inline);
        i += 1;
        continue;
      }
      const taken = takeFlagValue(argv, i + 1, "--scope");
      pushFlag("scope", taken.value);
      i = taken.next;
      continue;
    }
    if (arg === "--skill" || arg.startsWith("--skill=")) {
      const inline = arg.startsWith("--skill=") ? arg.slice("--skill=".length) : null;
      if (inline !== null) {
        pushFlag("skill", inline);
        i += 1;
        continue;
      }
      const taken = takeFlagValue(argv, i + 1, "--skill");
      pushFlag("skill", taken.value);
      i = taken.next;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`unknown flag ${arg}`);
    }
    if (command === null) {
      if (!isCommand(arg)) {
        throw new Error(`unknown command '${arg}'`);
      }
      command = arg;
      i += 1;
      continue;
    }
    rest.push(arg);
    i += 1;
  }

  if (command === null) {
    command = "help";
  }

  return { locate, command, rest, flags };
}

function firstFlag(flags: Map<string, string[]>, name: string): string | undefined {
  const values = flags.get(name);
  return values?.[0];
}

export function dispatch(parsed: ParsedCli): number {
  switch (parsed.command) {
    case "help":
      console.log(HELP);
      return 0;
    case "version":
      console.log(VERSION);
      return 0;
    case "list":
    case "status":
    case "link":
    case "sync":
    case "update":
    case "add":
      break;
    default:
      return assertNever(parsed.command);
  }

  const ctx = locateRepo(parsed.locate);
  switch (parsed.command) {
    case "list": {
      runList(ctx, parsed.rest[0]);
      return 0;
    }
    case "status": {
      if (parsed.rest.length > 0) {
        throw new Error("status does not take arguments");
      }
      return runStatus(ctx);
    }
    case "link": {
      if (parsed.rest.length > 0) {
        throw new Error("link does not take arguments");
      }
      runLink(ctx, { force: parsed.flags.has("force") });
      return 0;
    }
    case "sync": {
      if (parsed.rest.length > 1) {
        throw new Error("usage: kstack sync [pkg]");
      }
      runSync(ctx, parsed.rest[0]);
      return 0;
    }
    case "update": {
      if (parsed.rest.length > 1) {
        throw new Error("usage: kstack update [pkg|skill]");
      }
      runUpdate(ctx, parsed.rest[0]);
      return 0;
    }
    case "add": {
      const source = parsed.rest[0];
      if (source === undefined || parsed.rest.length !== 1) {
        throw new Error(
          "usage: kstack add <npx-source> --scope global|lighthouse|lightmind [--skill name]...",
        );
      }
      const scope = firstFlag(parsed.flags, "scope");
      if (scope === undefined) {
        throw new Error("--scope is required (global|lighthouse|lightmind)");
      }
      runAdd(ctx, {
        source,
        scope,
        skills: parsed.flags.get("skill") ?? [],
      });
      return 0;
    }
    default:
      return assertNever(parsed.command);
  }
}

export function run(argv: string[]): number {
  try {
    return dispatch(parseArgv(argv));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`kstack: ${message}`);
    return 1;
  }
}
