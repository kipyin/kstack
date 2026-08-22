import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadConfig } from "./config.js";
import { loadLock } from "./lock.js";
import { defaultMacCheckout, findFileUp, resolvePath } from "./paths.js";
import type { RepoContext } from "./types.js";

export type LocateOptions = {
  repo?: string;
  config?: string;
};

function configFromHint(hint: string): string {
  const resolved = resolvePath(hint);
  if (resolved.endsWith(".toml")) {
    return resolved;
  }
  return join(resolved, "kstack.toml");
}

export function locateRepo(options: LocateOptions): RepoContext {
  const envRepo = process.env.KSTACK_REPO;
  const envConfig = process.env.KSTACK_CONFIG;

  let configPath: string | null = null;
  if (options.config !== undefined) {
    configPath = configFromHint(options.config);
  } else if (options.repo !== undefined) {
    configPath = join(resolvePath(options.repo), "kstack.toml");
  } else if (envConfig !== undefined && envConfig.length > 0) {
    configPath = configFromHint(envConfig);
  } else if (envRepo !== undefined && envRepo.length > 0) {
    configPath = join(resolvePath(envRepo), "kstack.toml");
  } else {
    configPath = findFileUp(process.cwd(), "kstack.toml");
    if (configPath === null) {
      const mac = defaultMacCheckout();
      const macConfig = join(mac, "kstack.toml");
      if (existsSync(macConfig)) {
        configPath = macConfig;
      }
    }
  }

  if (configPath === null || !existsSync(configPath)) {
    throw new Error(
      "could not find kstack.toml. Run from the skills repo, or pass --repo / --config (or KSTACK_REPO / KSTACK_CONFIG).",
    );
  }

  const repoRoot = dirname(configPath);
  const lockPath = join(repoRoot, "lock.json");
  if (!existsSync(lockPath)) {
    throw new Error(`missing lock.json next to ${configPath}`);
  }

  return {
    repoRoot,
    configPath,
    lockPath,
    config: loadConfig(configPath),
    lock: loadLock(lockPath),
  };
}
