/**
 * Isometric 3D box renderer.
 *
 * Items are described as a list of axis-aligned boxes in model space.
 * The renderer projects them using a standard 2:1 pixel-art isometric
 * projection and rasterises three visible faces per box:
 *   • top   — y+ face (lightest)
 *   • right — x+ face (medium)
 *   • left  — z− face (darkest / front-left in screen)
 *
 * Projection (scale s, canvas origin [ox, oy]):
 *   px = (mx − mz) × s          + ox
 *   py = (mx + mz) × (s/2) − my × s  + oy
 *
 * At s=2, an 8×8×8 model exactly fills a 32×32 canvas when origin=[16,16].
 */

import { encodePng, type RGBA } from "./sprite.ts";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface IsoBox {
  x: number; y: number; z: number;   // min corner in model space
  w: number; h: number; d: number;   // width (x), height (y), depth (z)
  top:   RGBA;   // y+ face colour
  right: RGBA;   // x+ face colour
  left:  RGBA;   // z− face colour
}

export interface IsoModel {
  readonly kind: "iso";
  /** Canvas side length in pixels. */
  size: number;
  /** Pixels per model unit (integer preferred; 2 is standard for 32 px canvas). */
  scale: number;
  /** Screen coordinate where model origin (0,0,0) is placed. */
  origin: readonly [number, number];
  boxes: readonly IsoBox[];
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

function project(
  mx: number, my: number, mz: number,
  scale: number,
  origin: readonly [number, number],
): readonly [number, number] {
  return [
    (mx - mz) * scale + origin[0],
    (mx + mz) * (scale / 2) - my * scale + origin[1],
  ];
}

// ---------------------------------------------------------------------------
// Face rasteriser
// ---------------------------------------------------------------------------

/**
 * Paint a parallelogram face defined by a start corner and two edge axes.
 * Steps through model space at sub-pixel resolution to guarantee full coverage.
 */
function paintFace(
  pixels: RGBA[],
  size: number,
  scale: number,
  origin: readonly [number, number],
  p0: readonly [number, number, number],
  axis1: readonly [number, number, number],
  len1: number,
  axis2: readonly [number, number, number],
  len2: number,
  color: RGBA,
): void {
  // Step size chosen so we never skip a screen pixel.
  // Each model unit moves ≤ scale screen pixels horizontally;
  // stepping at 0.5/scale keeps the hop < 1 px.
  const step = Math.max(0.05, 0.5 / scale);

  for (let t1 = 0; t1 <= len1 + step * 0.5; t1 += step) {
    for (let t2 = 0; t2 <= len2 + step * 0.5; t2 += step) {
      const ct1 = Math.min(t1, len1);
      const ct2 = Math.min(t2, len2);
      const mx = p0[0] + axis1[0] * ct1 + axis2[0] * ct2;
      const my = p0[1] + axis1[1] * ct1 + axis2[1] * ct2;
      const mz = p0[2] + axis1[2] * ct1 + axis2[2] * ct2;
      const [px, py] = project(mx, my, mz, scale, origin);
      const ix = Math.round(px);
      const iy = Math.round(py);
      if (ix >= 0 && ix < size && iy >= 0 && iy < size) {
        pixels[iy * size + ix] = color;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public renderer
// ---------------------------------------------------------------------------

export function renderIso(model: IsoModel): Uint8Array {
  const { size, scale, origin, boxes } = model;
  const pixels: RGBA[] = new Array<RGBA>(size * size).fill([0, 0, 0, 0]);

  // Painter's algorithm: camera is at (+∞, +∞, −∞), so depth ∝ (mz − mx).
  // Draw high-depth (far) boxes first so close ones overwrite them.
  const sorted = [...boxes].sort((a, b) => {
    const da = (a.z + a.d / 2) - (a.x + a.w / 2);
    const db = (b.z + b.d / 2) - (b.x + b.w / 2);
    return db - da; // descending: farther first
  });

  for (const box of sorted) {
    const { x, y, z, w, h, d, top, right, left } = box;

    // Top face (y+ plane): axes → +x, +z
    paintFace(pixels, size, scale, origin,
      [x, y + h, z],
      [1, 0, 0], w,
      [0, 0, 1], d,
      top,
    );

    // Right face (x+ plane): axes → +z, +y
    paintFace(pixels, size, scale, origin,
      [x + w, y, z],
      [0, 0, 1], d,
      [0, 1, 0], h,
      right,
    );

    // Left / front face (z− plane): axes → +x, +y
    paintFace(pixels, size, scale, origin,
      [x, y, z],
      [1, 0, 0], w,
      [0, 1, 0], h,
      left,
    );
  }

  return encodePng(pixels, size);
}
