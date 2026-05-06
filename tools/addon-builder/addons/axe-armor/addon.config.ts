import type { SpriteConfig } from "../../src/lib/textures/sprite.ts";

// Three overlapping axes in steel-blue, packed across a dark chest-plate background.
const axeArmorIcon: SpriteConfig = {
  size: 16,
  layers: [
    // Dark steel plate background
    {
      type: "rect",
      x: 1, y: 2, w: 14, h: 12,
      gradient: [
        { t: 0, color: [45, 45, 75, 255] },
        { t: 1, color: [25, 25, 50, 255] },
      ],
    },
    // Axe 1 — top-left, angled right
    {
      type: "line",
      x1: 1, y1: 1, x2: 6, y2: 5, thickness: 2.5,
      gradient: [
        { t: 0, color: [80, 210, 255, 255] },
        { t: 1, color: [30, 120, 200, 255] },
      ],
    },
    { type: "line", x1: 6, y1: 5, x2: 8, y2: 9, thickness: 0.6,
      gradient: [{ t: 0, color: [90, 55, 20, 255] }, { t: 1, color: [90, 55, 20, 255] }] },
    // Axe 2 — center, pointing down-right
    {
      type: "line",
      x1: 5, y1: 4, x2: 11, y2: 8, thickness: 2.5,
      gradient: [
        { t: 0, color: [80, 210, 255, 255] },
        { t: 1, color: [30, 120, 200, 255] },
      ],
    },
    { type: "line", x1: 8, y1: 9, x2: 12, y2: 13, thickness: 0.6,
      gradient: [{ t: 0, color: [90, 55, 20, 255] }, { t: 1, color: [90, 55, 20, 255] }] },
    // Axe 3 — bottom-right, angled left
    {
      type: "line",
      x1: 9, y1: 8, x2: 15, y2: 12, thickness: 2.5,
      gradient: [
        { t: 0, color: [80, 210, 255, 255] },
        { t: 1, color: [30, 120, 200, 255] },
      ],
    },
    { type: "line", x1: 12, y1: 12, x2: 15, y2: 15, thickness: 0.6,
      gradient: [{ t: 0, color: [90, 55, 20, 255] }, { t: 1, color: [90, 55, 20, 255] }] },
    // Magic glow stripe — hints at fly/speed enchantment
    {
      type: "line",
      x1: 8, y1: 1, x2: 8, y2: 15, thickness: 0.4,
      gradient: [
        { t: 0, color: [140, 255, 180, 70] },
        { t: 1, color: [140, 255, 180, 70] },
      ],
      glow: { radius: 3.5, color: [120, 255, 160, 90] },
    },
  ],
};

export default {
  slug: "axe-armor",
  name: "Axe Armor",
  description: "A chestplate bristling with axes that grants blazing speed and near-flight.",
  version: [1, 0, 0] as [number, number, number],
  minEngineVersion: [1, 21, 0] as [number, number, number],
  bp: {
    headerUuid: "e1f2a3b4-c5d6-7890-ef56-901234567890",
    dataUuid:   "f2a3b4c5-d6e7-8901-fa67-012345678901",
    scriptUuid: "a3b4c5d6-e7f8-9012-ab78-123456789012",
    scriptEntry: "scripts/main.ts",
  },
  rp: {
    headerUuid: "b4c5d6e7-f8a9-0123-bc89-234567890123",
    dataUuid:   "c5d6e7f8-a9b0-1234-cd90-345678901234",
    sprites: {
      "textures/items/axe_armor.png": axeArmorIcon,
    },
  },
  scriptModuleDependencies: [
    { module_name: "@minecraft/server", version: "1.14.0" },
  ],
};
