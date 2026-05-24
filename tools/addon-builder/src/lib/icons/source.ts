/**
 * IconSource — discriminated union that extends the existing SpriteConfig path
 * to also support AI-generated and file-based icons.
 *
 * build.ts widens AddonConfig.rp.sprites values from SpriteConfig to
 * SpriteConfig | IconSource. normalizeSource() wraps the legacy SpriteConfig
 * so dragon-fire-sword keeps working without any changes.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { renderSprite, type SpriteConfig } from "../textures/sprite.ts";
import type { WeaponKind } from "./prompt.ts";
import { computeHash, cacheGet } from "./cache.ts";
import { IconCacheMissError } from "./provider.ts";

export type IconSource =
  | { kind: "procedural"; config: SpriteConfig }
  | { kind: "ai"; prompt: string; weapon: WeaponKind; provider?: string; seed?: number }
  | { kind: "file"; path: string };

/** Wraps a plain SpriteConfig (existing presets) as a procedural source. */
export function normalizeSource(value: SpriteConfig | IconSource): IconSource {
  if ("kind" in value) return value;
  return { kind: "procedural", config: value };
}

export interface ResolveContext {
  /** Absolute path to the addon directory (for resolving file sources). */
  addonDir: string;
}

/**
 * Resolves an IconSource to PNG bytes.
 * For "ai" sources this only reads from cache — never calls the provider.
 * On a cache miss it throws IconCacheMissError with an actionable message.
 */
export async function resolveIconSource(source: IconSource, ctx: ResolveContext): Promise<Uint8Array> {
  switch (source.kind) {
    case "procedural":
      return renderSprite(source.config);

    case "file": {
      const abs = resolve(ctx.addonDir, source.path);
      if (!existsSync(abs)) throw new Error(`Icon file not found: ${abs}`);
      return new Uint8Array(await readFile(abs));
    }

    case "ai": {
      const sha = computeHash({
        prompt: source.prompt,
        weapon: source.weapon,
        provider: source.provider ?? "stub",
        seed: source.seed,
      });
      const cached = await cacheGet(sha);
      if (!cached) throw new IconCacheMissError(`${source.weapon}:${source.prompt}`);
      return cached;
    }
  }
}
