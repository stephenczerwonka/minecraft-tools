/**
 * AI icon pipeline: raw PNG bytes from a provider → clean 16×16 RGBA PNG.
 *
 * Stages:
 *   1. decodePng        → RGBA[]
 *   2. removeBackground → RGBA[]
 *   3. autoCropCenter   → RGBA[] (square, centred, margin)
 *   4. lanczos3         → 64×64 RGBA[]
 *   5. boxAverage4x4    → 16×16 RGBA[]
 *   6. medianCut        → quantized 16×16 RGBA[]
 *   7. optional snap    → snapped to curated palette
 *   8. encodePng        → Uint8Array
 */

import { decodePng } from "../textures/png.ts";
import type { RGBA } from "../textures/png.ts";
import { removeBackground } from "../textures/bgRemove.ts";
import { lanczos3, boxAverage4x4 } from "../textures/resample.ts";
import { medianCut, snapToPalette } from "../textures/quantize.ts";
import { MINECRAFT_PALETTE } from "../textures/palette.ts";
import { renderSprite } from "../textures/sprite.ts";

// re-use the private encodePng from sprite.ts by re-exporting via png.ts
// We call renderSprite with 0 layers to get an empty canvas then… actually
// we need encodePng directly. Let's inline a tiny shim that reaches it.
// sprite.ts does not export encodePng, so we extract it here.
// (The plan calls for extracting it; we do a minimal extraction by duplicating
// the 30-line encoder. The sprite.ts API stays unchanged.)

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(tag: string, data: Uint8Array): Uint8Array {
  const tagBytes = new TextEncoder().encode(tag);
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(tagBytes, 4); out.set(data, 8);
  const crcBuf = new Uint8Array(4 + data.length);
  crcBuf.set(tagBytes); crcBuf.set(data, 4);
  view.setUint32(8 + data.length, crc32(crcBuf));
  return out;
}

function concat(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

function encodePng(pixels: RGBA[], size: number): Uint8Array {
  const { deflateSync } = require("node:zlib") as typeof import("node:zlib");
  const ihdr = new Uint8Array(13);
  const iv = new DataView(ihdr.buffer);
  iv.setUint32(0, size); iv.setUint32(4, size);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = new Uint8Array(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixels[y * size + x] ?? [0, 0, 0, 0];
      const off = y * (1 + size * 4) + 1 + x * 4;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = a;
    }
  }
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  return concat(sig, pngChunk("IHDR", ihdr), pngChunk("IDAT", deflateSync(raw, { level: 9 })), pngChunk("IEND", new Uint8Array(0)));
}

// ---------------------------------------------------------------------------
// Auto-crop + center
// ---------------------------------------------------------------------------

function autoCropCenter(pixels: RGBA[], width: number, height: number): { pixels: RGBA[]; size: number } {
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((pixels[y * width + x]?.[3] ?? 0) > 16) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
  }
  if (minX > maxX) return { pixels: [{ 0: 0, 1: 0, 2: 0, 3: 0 } as unknown as RGBA], size: 1 };

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const side = Math.max(cw, ch);
  const margin = Math.ceil(0.06 * side);
  const canvas = side + margin * 2;

  const out: RGBA[] = new Array(canvas * canvas).fill([0, 0, 0, 0] as RGBA);
  const ox = margin + Math.floor((side - cw) / 2);
  const oy = margin + Math.floor((side - ch) / 2);

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      out[(oy + y) * canvas + (ox + x)] = pixels[(minY + y) * width + (minX + x)]!;
    }
  }
  return { pixels: out, size: canvas };
}

// ---------------------------------------------------------------------------
// Main pipeline function
// ---------------------------------------------------------------------------

export interface PipelineOpts {
  colors?: number;   // palette size (default 12)
  snap?: boolean;    // snap to MINECRAFT_PALETTE
}

export async function pixelizeWeaponIcon(
  rawPng: Uint8Array,
  opts: PipelineOpts = {},
): Promise<Uint8Array> {
  const { width, height, pixels } = decodePng(rawPng);
  const noBackground = removeBackground(pixels, width, height);
  const { pixels: cropped, size: croppedSize } = autoCropCenter(noBackground, width, height);
  const at64 = lanczos3(cropped, croppedSize, 64);
  const at16 = boxAverage4x4(at64, 64, 16);
  let { pixels: quantized } = medianCut(at16, opts.colors ?? 12);
  if (opts.snap) quantized = snapToPalette(quantized, MINECRAFT_PALETTE);
  return encodePng(quantized, 16);
}
