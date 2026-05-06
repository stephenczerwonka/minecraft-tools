/**
 * Isometric item model definitions.
 *
 * Coordinate system and rendering maths
 * ──────────────────────────────────────
 * All models use scale=2, size=32, origin=[16,16].
 *
 * Projection:
 *   px = (mx − mz) × 2 + 16
 *   py = (mx + mz) × 1 − my × 2 + 16
 *
 * Anchor checks (origin=[16,16], scale=2):
 *   (0,0,0) → screen (16, 16)   centre
 *   (8,0,0) → screen (32, 24)   right edge mid
 *   (0,0,8) → screen  (0, 24)   left  edge mid
 *   (0,8,0) → screen (16,  0)   top   centre
 *   (8,0,8) → screen (16, 32)   bottom centre  ← just on canvas
 *
 * Visible blade / body parts sit in x=2–6, z=2–6 (centred).
 * Guard / shoulders span x=0–8, z=0–8 to fill canvas width.
 *
 * Face shading convention:
 *   top   = brightest (direct light)
 *   right = 75 % of top brightness (side light)
 *   left  = 55 % of top brightness (shadow)
 */

import type { IsoModel } from "./isometric.ts";

// ──────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────────────────────────────────

const ISO_DEFAULTS = { kind: "iso" as const, size: 32, scale: 2, origin: [16, 16] as const };

// ──────────────────────────────────────────────────────────────────────────────
// Ender Sword
// ──────────────────────────────────────────────────────────────────────────────
// Layout (vertical sword, blade along y-axis):
//   Blade tip  y=7–8  teal shimmer
//   Blade body y=3–7  teal→purple gradient (3 stacked boxes)
//   Guard      y=2–3  dark purple, wide (x=0–8, z=0–8)
//   Handle     y=0–2  obsidian
//
// Screen extents (approx):
//   Top of blade tip (3,8,3): py = (3+3) − 16 + 16 = 6, px = 16  → (16, 6)
//   Guard near corner (6,2,2): px=(6-2)×2+16=24, py=(6+2)-4+16=20 → (24,20)
//   Guard far corner  (2,2,6): px=(2-6)×2+16= 8, py=(2+6)-4+16=20 → ( 8,20)
//   Handle base far   (5,0,5): py=(5+5)+16=26                      → (16,26)
export function enderSwordModel(): IsoModel {
  return {
    ...ISO_DEFAULTS,
    boxes: [
      // ── Blade tip (bright teal) ──────────────────────────────────────
      { x:3, y:7, z:3, w:2, h:1, d:2,
        top:   [100, 255, 220, 255],
        right: [ 60, 200, 170, 255],
        left:  [ 40, 170, 145, 255] },

      // ── Blade upper (teal→purple) ────────────────────────────────────
      { x:3, y:5, z:3, w:2, h:2, d:2,
        top:   [ 90, 180, 210, 255],
        right: [ 55, 100, 155, 255],
        left:  [ 35,  75, 130, 255] },

      // ── Blade mid (deep purple) ──────────────────────────────────────
      { x:3, y:3, z:3, w:2, h:2, d:2,
        top:   [ 85,  50, 175, 255],
        right: [ 55,  25, 115, 255],
        left:  [ 38,  15,  90, 255] },

      // ── Cross guard (wide, near-black purple) ────────────────────────
      // Spans full model width so it fans out across the canvas.
      { x:0, y:2, z:0, w:8, h:1, d:8,
        top:   [ 55,   0, 110, 255],
        right: [ 35,   0,  75, 255],
        left:  [ 22,   0,  55, 255] },

      // ── Handle / grip ────────────────────────────────────────────────
      { x:3, y:0, z:3, w:2, h:2, d:2,
        top:   [ 28,   0,  65, 255],
        right: [ 18,   0,  44, 255],
        left:  [ 12,   0,  32, 255] },
    ],
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Diamond Mace
// ──────────────────────────────────────────────────────────────────────────────
// Layout:
//   Head  y=3–8  large cubic diamond-blue block
//   Handle y=0–3  dark wood, thin
//
// Screen extents:
//   Top of head (1,8,1): px=(1-1)*2+16=16, py=(1+1)-16+16=2 → (16, 2)  ← near top
//   Head corner (7,3,1): px=(7-1)*2+16=28, py=(7+1)-6+16=18 → (28,18)
//   Handle base (5,0,5): py=(5+5)+16=26 → (16,26)
export function diamondMaceModel(): IsoModel {
  return {
    ...ISO_DEFAULTS,
    boxes: [
      // ── Diamond head (large cubic block) ────────────────────────────
      { x:1, y:3, z:1, w:6, h:5, d:6,
        top:   [ 80, 240, 255, 255],
        right: [ 40, 160, 215, 255],
        left:  [ 22, 120, 190, 255] },

      // ── Facet highlight on top-front edge (a thin bright strip) ─────
      { x:1, y:8, z:1, w:6, h:0.5, d:1,
        top:   [160, 255, 255, 255],
        right: [ 80, 220, 255, 255],
        left:  [ 60, 200, 240, 255] },

      // ── Handle ───────────────────────────────────────────────────────
      { x:3, y:0, z:3, w:2, h:3, d:2,
        top:   [ 80,  50,  20, 255],
        right: [ 60,  35,  12, 255],
        left:  [ 42,  24,   8, 255] },
    ],
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Axe Armor (chestplate)
// ──────────────────────────────────────────────────────────────────────────────
// Layout:
//   Main chest plate  y=0–5  steel blue, spans x=1–7, z=0–2
//   Left  shoulder    y=4–7  narrower, x=0–2, z=0–2
//   Right shoulder    y=4–7  narrower, x=6–8, z=0–2
//   Axe emblem 1      y=1–4  thin gold bar, x=2–3, z=0–1  (left blade)
//   Axe emblem 2      y=1–4  thin gold bar, x=5–6, z=0–1  (right blade)
//   Axe cross 1       y=2    thin gold rect, x=1–4, z=0–1
//   Axe cross 2       y=2    thin gold rect, x=4–7, z=0–1
//
// Screen extents (z kept low so the flat front face fills the view):
//   Chest top-left  (1,5,0): px=(1-0)*2+16=18, py=(1+0)-10+16=7 → (18, 7)
//   Chest bottom far(7,0,2): px=(7-2)*2+16=26, py=(7+2)+16=25  → (26,25)
//   Shoulder top    (0,7,0): px=(0-0)*2+16=16, py=(0+0)-14+16=2 → (16, 2)
export function axeArmorModel(): IsoModel {
  return {
    ...ISO_DEFAULTS,
    boxes: [
      // ── Main chest body ──────────────────────────────────────────────
      { x:1, y:0, z:0, w:6, h:5, d:2,
        top:   [ 55, 135, 220, 255],
        right: [ 32,  90, 180, 255],
        left:  [ 20,  65, 155, 255] },

      // ── Left shoulder pad ────────────────────────────────────────────
      { x:0, y:4, z:0, w:2, h:3, d:2,
        top:   [ 55, 135, 220, 255],
        right: [ 32,  90, 180, 255],
        left:  [ 20,  65, 155, 255] },

      // ── Right shoulder pad ───────────────────────────────────────────
      { x:6, y:4, z:0, w:2, h:3, d:2,
        top:   [ 55, 135, 220, 255],
        right: [ 32,  90, 180, 255],
        left:  [ 20,  65, 155, 255] },

      // ── Left axe emblem — vertical shaft ────────────────────────────
      { x:2, y:1, z:0, w:1, h:3, d:1,
        top:   [255, 210,  55, 255],
        right: [200, 160,  30, 255],
        left:  [170, 135,  20, 255] },

      // ── Left axe emblem — wide head ──────────────────────────────────
      { x:1, y:3, z:0, w:3, h:1, d:1,
        top:   [255, 210,  55, 255],
        right: [200, 160,  30, 255],
        left:  [170, 135,  20, 255] },

      // ── Right axe emblem — vertical shaft ───────────────────────────
      { x:5, y:1, z:0, w:1, h:3, d:1,
        top:   [255, 210,  55, 255],
        right: [200, 160,  30, 255],
        left:  [170, 135,  20, 255] },

      // ── Right axe emblem — wide head ─────────────────────────────────
      { x:4, y:3, z:0, w:3, h:1, d:1,
        top:   [255, 210,  55, 255],
        right: [200, 160,  30, 255],
        left:  [170, 135,  20, 255] },
    ],
  };
}
