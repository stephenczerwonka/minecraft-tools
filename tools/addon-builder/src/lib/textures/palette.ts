/**
 * Curated Minecraft-style color palette (~32 colors).
 * Used with --snap to ensure icons match the vanilla aesthetic.
 */

import type { RGBA } from "./png.ts";

export const MINECRAFT_PALETTE: RGBA[] = [
  // Iron / stone
  [200, 200, 200, 255],
  [160, 160, 165, 255],
  [120, 120, 125, 255],
  [80,  80,  85,  255],
  // Gold
  [255, 215,  0,  255],
  [220, 180,  0,  255],
  [180, 140,  0,  255],
  // Redstone / ruby-like
  [200,  30,  30, 255],
  [150,  20,  20, 255],
  // Lapis / blue
  [ 30,  80, 200, 255],
  [ 20,  50, 140, 255],
  // Diamond / cyan
  [ 80, 220, 220, 255],
  [ 50, 170, 180, 255],
  // Emerald / green
  [ 20, 180,  60, 255],
  [ 10, 120,  40, 255],
  // Netherite / dark
  [ 55,  45,  55, 255],
  [ 35,  28,  35, 255],
  // Wood / brown
  [140,  90,  40, 255],
  [100,  65,  25, 255],
  [ 70,  44,  15, 255],
  // Leather / tan
  [185, 130,  80, 255],
  [155, 100,  55, 255],
  // Obsidian / purple
  [ 60,  30,  80, 255],
  [ 90,  50, 110, 255],
  // Fire / orange
  [255, 140,  0,  255],
  [220, 100,  0,  255],
  // Ice / light blue
  [180, 220, 255, 255],
  [140, 190, 240, 255],
  // Black / white
  [ 20,  20,  20, 255],
  [240, 240, 240, 255],
  // Enchantment purple
  [100,   0, 200, 255],
  [ 70,   0, 140, 255],
];
