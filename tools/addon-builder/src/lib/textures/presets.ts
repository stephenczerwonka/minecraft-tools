/**
 * Weapon sprite presets.
 *
 * Each preset is a function that takes semantic colour/style parameters and
 * returns a SpriteConfig ready to pass to renderSprite().
 *
 * All pixel coordinates are authored at size=16 and scaled proportionally
 * when a different size is requested.
 */

import type { ColorStop, Layer, RGBA, SpriteConfig } from "./sprite.ts";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Scale a 16-px coordinate to the target size. */
function s(v: number, size: number): number {
  return (v / 16) * size;
}

function flat(color: RGBA): ColorStop[] {
  return [{ t: 0, color }, { t: 1, color }];
}

function grad(from: RGBA, to: RGBA): ColorStop[] {
  return [{ t: 0, color: from }, { t: 1, color: to }];
}

// ---------------------------------------------------------------------------
// Sword preset
// ---------------------------------------------------------------------------

export interface SwordParams {
  /** Tip colour (top-right end of blade). */
  bladeTip: RGBA;
  /** Base colour (guard end of blade). */
  bladeBase: RGBA;
  guard: RGBA;
  handle: RGBA;
  pommel?: RGBA;
  /** Outer glow — set alpha=0 to disable. */
  glow?: RGBA;
  size?: number;
}

export function sword(p: SwordParams): SpriteConfig {
  const n = p.size ?? 16;

  // Canonical 16-px geometry (sub-pixel precision)
  // Blade: tip (13.5, 1.5) → base (3.5, 11.5)  [45° diagonal, upper-right to lower-left]
  // Guard: horizontal rect, 5px wide centred at blade base y
  // Handle: short diagonal below guard
  // Pommel: 1px dot at very bottom

  const layers: Layer[] = [];

  // Glow fringe behind blade
  if (p.glow && p.glow[3] > 0) {
    layers.push({
      type: "line",
      x1: s(13.5, n), y1: s(1.5, n),
      x2: s(3.5, n),  y2: s(11.5, n),
      thickness: s(0.5, n),
      gradient: grad(p.bladeTip, p.bladeBase),
      glow: { radius: s(1.5, n), color: p.glow },
    });
  }

  // Blade
  layers.push({
    type: "line",
    x1: s(13.5, n), y1: s(1.5, n),
    x2: s(3.5, n),  y2: s(11.5, n),
    thickness: s(0.5, n),
    gradient: grad(p.bladeTip, p.bladeBase),
  });

  // Guard
  layers.push({
    type: "rect",
    x: Math.round(s(1, n)),
    y: Math.round(s(11, n)),
    w: Math.round(s(5, n)),
    h: Math.round(s(1, n)) || 1,
    gradient: flat(p.guard),
  });

  // Handle
  layers.push({
    type: "line",
    x1: s(3.5, n), y1: s(12.5, n),
    x2: s(1.5, n), y2: s(14.5, n),
    thickness: s(0.5, n),
    gradient: flat(p.handle),
  });

  // Pommel
  const pommelColor = p.pommel ?? p.guard;
  layers.push({
    type: "rect",
    x: Math.round(s(0.5, n)),
    y: Math.round(s(14.5, n)),
    w: Math.round(s(1.5, n)) || 1,
    h: Math.round(s(1.5, n)) || 1,
    gradient: flat(pommelColor),
  });

  return { size: n, layers };
}

// ---------------------------------------------------------------------------
// Axe preset
// ---------------------------------------------------------------------------

export interface AxeParams {
  bladeEdge: RGBA;    // sharp cutting edge colour
  bladeBody: RGBA;    // main body of the axe head
  handle: RGBA;
  glow?: RGBA;
  size?: number;
}

export function axe(p: AxeParams): SpriteConfig {
  const n = p.size ?? 16;
  const layers: Layer[] = [];

  if (p.glow && p.glow[3] > 0) {
    // Glow around the axe head
    layers.push({
      type: "line",
      x1: s(3.5, n), y1: s(0.5, n),
      x2: s(9.5, n), y2: s(6.5, n),
      thickness: s(3, n),
      gradient: grad(p.bladeEdge, p.bladeBody),
      glow: { radius: s(1.5, n), color: p.glow },
    });
  }

  // Axe head: wide diagonal rectangle (top-left to centre-right)
  layers.push({
    type: "line",
    x1: s(1.5, n), y1: s(1.5, n),
    x2: s(9.5, n), y2: s(6.5, n),
    thickness: s(3, n),
    gradient: grad(p.bladeEdge, p.bladeBody),
  });

  // Cutting edge highlight line
  layers.push({
    type: "line",
    x1: s(0.5, n), y1: s(1.5, n),
    x2: s(0.5, n), y2: s(7.5, n),
    thickness: s(0.5, n),
    gradient: flat(p.bladeEdge),
  });

  // Handle: long diagonal from axe head down to bottom-right
  layers.push({
    type: "line",
    x1: s(9.5, n),  y1: s(6.5, n),
    x2: s(14.5, n), y2: s(14.5, n),
    thickness: s(0.5, n),
    gradient: flat(p.handle),
  });

  return { size: n, layers };
}

// ---------------------------------------------------------------------------
// Minigun preset
// ---------------------------------------------------------------------------

export interface MinigunParams {
  /** Main barrel metal colour. */
  barrelColor: RGBA;
  /** Bright highlight / hot-metal edge colour. */
  barrelHighlight: RGBA;
  /** Gun body / housing colour. */
  bodyColor: RGBA;
  /** Grip handle colour. */
  gripColor: RGBA;
  /** Fire glow — set alpha=0 to disable. */
  glow?: RGBA;
  size?: number;
}

export function minigun(p: MinigunParams): SpriteConfig {
  const n = p.size ?? 16;
  const layers: Layer[] = [];

  // Fire glow behind barrel cluster
  if (p.glow && p.glow[3] > 0) {
    layers.push({
      type: "line",
      x1: s(3.0, n), y1: s(11.0, n),
      x2: s(12.0, n), y2: s(3.0, n),
      thickness: s(3.0, n),
      gradient: grad(p.barrelColor, p.barrelHighlight),
      glow: { radius: s(2.0, n), color: p.glow },
    });
  }

  // Upper barrel
  layers.push({
    type: "line",
    x1: s(2.5, n), y1: s(10.5, n),
    x2: s(11.5, n), y2: s(2.5, n),
    thickness: s(0.9, n),
    gradient: grad(p.barrelColor, p.barrelHighlight),
  });

  // Lower barrel (parallel, offset 2px)
  layers.push({
    type: "line",
    x1: s(4.5, n), y1: s(12.5, n),
    x2: s(13.5, n), y2: s(4.5, n),
    thickness: s(0.9, n),
    gradient: grad(p.barrelColor, p.barrelHighlight),
  });

  // Barrel tip end-cap (right side)
  layers.push({
    type: "rect",
    x: Math.round(s(11.5, n)),
    y: Math.round(s(2, n)),
    w: Math.round(s(2.5, n)) || 1,
    h: Math.round(s(4, n)) || 1,
    gradient: flat(p.barrelHighlight),
  });

  // Body housing (connects barrel cluster to grip)
  layers.push({
    type: "rect",
    x: Math.round(s(2, n)),
    y: Math.round(s(10, n)),
    w: Math.round(s(4, n)) || 1,
    h: Math.round(s(3, n)) || 1,
    gradient: flat(p.bodyColor),
  });

  // Grip
  layers.push({
    type: "line",
    x1: s(3.5, n), y1: s(13.0, n),
    x2: s(1.5, n), y2: s(15.0, n),
    thickness: s(0.8, n),
    gradient: flat(p.gripColor),
  });

  return { size: n, layers };
}

// ---------------------------------------------------------------------------
// Pickaxe preset
// ---------------------------------------------------------------------------

export interface PickaxeParams {
  headColor: RGBA;
  handleColor: RGBA;
  glow?: RGBA;
  size?: number;
}

export function pickaxe(p: PickaxeParams): SpriteConfig {
  const n = p.size ?? 16;
  const layers: Layer[] = [];

  if (p.glow && p.glow[3] > 0) {
    layers.push({
      type: "line",
      x1: s(0.5, n), y1: s(3.5, n),
      x2: s(15.5, n), y2: s(3.5, n),
      thickness: s(1, n),
      gradient: flat(p.headColor),
      glow: { radius: s(1.5, n), color: p.glow },
    });
  }

  // Head: horizontal bar across the top
  layers.push({
    type: "line",
    x1: s(0.5, n), y1: s(3.5, n),
    x2: s(15.5, n), y2: s(3.5, n),
    thickness: s(1, n),
    gradient: flat(p.headColor),
  });

  // Left prong (curves down-left from head)
  layers.push({
    type: "line",
    x1: s(1.5, n),  y1: s(4.5, n),
    x2: s(0.5, n),  y2: s(7.5, n),
    thickness: s(0.5, n),
    gradient: flat(p.headColor),
  });

  // Right prong (curves down-right from head)
  layers.push({
    type: "line",
    x1: s(13.5, n), y1: s(4.5, n),
    x2: s(14.5, n), y2: s(7.5, n),
    thickness: s(0.5, n),
    gradient: flat(p.headColor),
  });

  // Handle: diagonal from head centre to bottom-right
  layers.push({
    type: "line",
    x1: s(7.5, n),  y1: s(5.5, n),
    x2: s(13.5, n), y2: s(14.5, n),
    thickness: s(0.5, n),
    gradient: flat(p.handleColor),
  });

  return { size: n, layers };
}
