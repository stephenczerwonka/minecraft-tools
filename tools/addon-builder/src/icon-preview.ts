/**
 * bun run icon:preview <addon-slug>
 *
 * Renders every icon in the addon at 4× zoom (64×64 nearest-neighbor) and
 * writes preview PNGs to dist/preview/<slug>/.
 * Works for procedural, file, and cached AI sources.
 */

import { resolve, join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { renderSprite, type SpriteConfig } from "./lib/textures/sprite.ts";
import { nearestUpscale } from "./lib/textures/resample.ts";
import { decodePng } from "./lib/textures/png.ts";
import { normalizeSource, resolveIconSource, type IconSource } from "./lib/icons/source.ts";

const SCALE = 4;

function encodePngFromPixels(pixels: ReturnType<typeof decodePng>["pixels"], size: number): Uint8Array {
  // Re-encode via the same path used in pipeline.ts (inline encodePng copy)
  const { deflateSync } = require("node:zlib") as typeof import("node:zlib");
  function crc32(buf: Uint8Array): number {
    let crc = 0xffffffff;
    for (const byte of buf) { crc ^= byte; for (let j = 0; j < 8; j++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1; }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function chunk(tag: string, data: Uint8Array): Uint8Array {
    const tb = new TextEncoder().encode(tag);
    const out = new Uint8Array(12 + data.length);
    const v = new DataView(out.buffer);
    v.setUint32(0, data.length); out.set(tb, 4); out.set(data, 8);
    const cb = new Uint8Array(4 + data.length); cb.set(tb); cb.set(data, 4);
    v.setUint32(8 + data.length, crc32(cb));
    return out;
  }
  function cc(...ch: Uint8Array[]): Uint8Array {
    const t = ch.reduce((n, c) => n + c.length, 0);
    const o = new Uint8Array(t); let off = 0;
    for (const c of ch) { o.set(c, off); off += c.length; }
    return o;
  }
  const ihdr = new Uint8Array(13);
  const iv = new DataView(ihdr.buffer);
  iv.setUint32(0, size); iv.setUint32(4, size);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = new Uint8Array(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixels[y * size + x] ?? [0, 0, 0, 0];
      const o = y * (1 + size * 4) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  return cc(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", new Uint8Array(0)));
}

async function main(): Promise<void> {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: bun run icon:preview <addon-slug>");
    process.exit(1);
  }

  const repoRoot = resolve(import.meta.dir, "..");
  const addonDir = join(repoRoot, "addons", slug);
  if (!existsSync(addonDir)) {
    console.error(`Addon not found: ${addonDir}`);
    process.exit(1);
  }

  const configPath = join(addonDir, "addon.config.ts");
  const mod = (await import(pathToFileURL(configPath).href)) as {
    default: { rp: { sprites?: Record<string, SpriteConfig | IconSource> } };
  };
  const sprites = mod.default.rp.sprites ?? {};

  const previewDir = join(repoRoot, "dist", "preview", slug);
  await mkdir(previewDir, { recursive: true });

  for (const [texPath, value] of Object.entries(sprites)) {
    const source = normalizeSource(value);
    const key = texPath.replace(/\//g, "_").replace(/\.png$/, "");

    let icon16: Uint8Array;
    try {
      icon16 = await resolveIconSource(source, { addonDir });
    } catch (err) {
      console.warn(`  [skip] ${texPath}: ${(err as Error).message}`);
      continue;
    }

    const { pixels, width } = decodePng(icon16);
    const preview = nearestUpscale(pixels, width, SCALE);
    const previewPng = encodePngFromPixels(preview, width * SCALE);
    const outPath = join(previewDir, `${key}_preview.png`);
    await writeFile(outPath, previewPng);
    console.log(`  ${outPath}`);
  }

  console.log(`  Done. Open dist/preview/${slug}/ to review icons.`);
}

await main();
