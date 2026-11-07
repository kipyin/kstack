import { parse } from "smol-toml";
import { TIERS, type KstackConfig, type LinkPaths, type Tier } from "./types.js";
import { isTier } from "./types.js";
import { readText } from "./fsutil.js";

type RawConfig = {
  paths?: unknown;
};

function asStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
  return value;
}

export function parseConfigToml(text: string): KstackConfig {
  const raw = parse(text) as RawConfig;

  const paths = {} as LinkPaths;
  for (const tier of TIERS) {
    paths[tier] = [];
  }

  if (raw.paths !== undefined) {
    if (raw.paths === null || typeof raw.paths !== "object") {
      throw new Error("[paths] must be a table");
    }
    for (const [key, value] of Object.entries(raw.paths)) {
      if (!isTier(key)) {
        throw new Error(`unknown paths key '${key}'`);
      }
      paths[key] = asStringArray(value, `paths.${key}`);
    }
  }

  return { paths };
}

export function loadConfig(path: string): KstackConfig {
  return parseConfigToml(readText(path));
}

export function pathsForTier(config: KstackConfig, tier: Tier): string[] {
  return config.paths[tier];
}
