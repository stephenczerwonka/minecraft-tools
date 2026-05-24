/**
 * Content-addressed icon cache.
 *
 * Cache dir: tools/addon-builder/.cache/icons/
 * Each entry is a <sha>.png + <sha>.json sidecar.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const CACHE_DIR = join(import.meta.dir, "../../../../.cache/icons");

export interface CacheMeta {
  prompt: string;
  weapon: string;
  provider: string;
  seed?: number;
  createdAt: string;
}

export function computeHash(meta: Omit<CacheMeta, "createdAt">): string {
  const key = JSON.stringify({ prompt: meta.prompt, weapon: meta.weapon, provider: meta.provider, seed: meta.seed });
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export function cachePngPath(sha: string): string {
  return join(CACHE_DIR, `${sha}.png`);
}

export async function cacheGet(sha: string): Promise<Uint8Array | null> {
  const p = cachePngPath(sha);
  if (!existsSync(p)) return null;
  return new Uint8Array(await readFile(p));
}

export async function cachePut(sha: string, pngBytes: Uint8Array, meta: CacheMeta): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cachePngPath(sha), pngBytes);
  await writeFile(join(CACHE_DIR, `${sha}.json`), JSON.stringify(meta, null, 2));
}
