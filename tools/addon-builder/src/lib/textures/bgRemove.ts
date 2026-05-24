/**
 * Background removal via edge-color sampling + Euclidean threshold-to-alpha.
 *
 * Samples the 4-pixel-wide border to find the dominant background color,
 * then feathers pixels that are close to it to alpha=0.
 */

import type { RGBA } from "./png.ts";

const THRESH = 36;    // sRGB Euclidean distance — within this → fully transparent
const FEATHER = 12;   // gradient zone just outside THRESH

function dist(a: RGBA, b: RGBA): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 +
    (a[1] - b[1]) ** 2 +
    (a[2] - b[2]) ** 2,
  );
}

function edgeMean(pixels: RGBA[], width: number, height: number): RGBA {
  const border = 4;
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < border || x >= width - border || y < border || y >= height - border) {
        const p = pixels[y * width + x]!;
        if (p[3] < 16) continue; // skip already-transparent pixels
        r += p[0]; g += p[1]; b += p[2]; n++;
      }
    }
  }
  if (n === 0) return [0, 0, 0, 0];
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n), 255];
}

export function removeBackground(
  pixels: RGBA[],
  width: number,
  height: number,
  opts?: { thresh?: number; feather?: number },
): RGBA[] {
  const thresh = opts?.thresh ?? THRESH;
  const feather = opts?.feather ?? FEATHER;
  const bg = edgeMean(pixels, width, height);

  return pixels.map((p) => {
    if (p[3] < 16) return [0, 0, 0, 0]; // already transparent
    const d = dist(p, bg);
    if (d <= thresh) return [0, 0, 0, 0];
    if (d <= thresh + feather) {
      const alpha = Math.round(255 * (d - thresh) / feather);
      return [p[0], p[1], p[2], alpha];
    }
    return p;
  });
}
