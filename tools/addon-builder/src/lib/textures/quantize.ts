/**
 * Palette quantization via median-cut.
 *
 * Reduces to N representative colors. Fully transparent pixels are kept
 * transparent. Alpha is binarized to 0 or 255 after quantization (Minecraft
 * items use 1-bit alpha).
 */

import type { RGBA } from "./png.ts";

interface Bucket {
  pixels: RGBA[];
}

function range(pixels: RGBA[], ch: 0 | 1 | 2): number {
  let lo = 255, hi = 0;
  for (const p of pixels) { lo = Math.min(lo, p[ch]); hi = Math.max(hi, p[ch]); }
  return hi - lo;
}

function split(bucket: Bucket): [Bucket, Bucket] {
  const { pixels } = bucket;
  const rr = range(pixels, 0);
  const rg = range(pixels, 1);
  const rb = range(pixels, 2);
  const ch: 0 | 1 | 2 = rr >= rg && rr >= rb ? 0 : rg >= rb ? 1 : 2;
  const sorted = [...pixels].sort((a, b) => a[ch] - b[ch]);
  const mid = Math.floor(sorted.length / 2);
  return [{ pixels: sorted.slice(0, mid) }, { pixels: sorted.slice(mid) }];
}

function mean(pixels: RGBA[]): RGBA {
  let r = 0, g = 0, b = 0;
  for (const p of pixels) { r += p[0]; g += p[1]; b += p[2]; }
  const n = pixels.length;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n), 255];
}

function nearest(color: RGBA, palette: RGBA[]): RGBA {
  let best = palette[0]!;
  let bestD = Infinity;
  for (const c of palette) {
    const d = (color[0] - c[0]) ** 2 + (color[1] - c[1]) ** 2 + (color[2] - c[2]) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

export function medianCut(pixels: RGBA[], maxColors = 12): { pixels: RGBA[]; palette: RGBA[] } {
  const opaque = pixels.filter((p) => p[3] >= 16);

  if (opaque.length === 0) {
    return { pixels: pixels.map(() => [0, 0, 0, 0] as const), palette: [] };
  }

  let buckets: Bucket[] = [{ pixels: opaque }];
  while (buckets.length < maxColors) {
    const largest = buckets.reduce((a, b) => a.pixels.length >= b.pixels.length ? a : b);
    if (largest.pixels.length < 2) break;
    const idx = buckets.indexOf(largest);
    const [a, b] = split(largest);
    buckets.splice(idx, 1, a, b);
  }

  const palette = buckets.map((bk) => mean(bk.pixels));

  const quantized = pixels.map((p) => {
    if (p[3] < 16) return [0, 0, 0, 0] as const;
    const rep = nearest(p, palette);
    return [rep[0], rep[1], rep[2], p[3] >= 128 ? 255 : 0] as const;
  });

  return { pixels: quantized, palette };
}

export function snapToPalette(pixels: RGBA[], palette: RGBA[]): RGBA[] {
  return pixels.map((p) => {
    if (p[3] < 16) return [0, 0, 0, 0];
    const rep = nearest(p, palette);
    return [rep[0], rep[1], rep[2], p[3]];
  });
}
