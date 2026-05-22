import { minigun } from "../../src/lib/textures/presets.ts";

export default {
  slug: "fire-minigun",
  name: "Fire Minigun",
  description: "Adds the Fire Minigun — right-click for a rapid-fire burst of fireballs.",
  version: [1, 0, 0] as [number, number, number],
  minEngineVersion: [1, 21, 0] as [number, number, number],
  bp: {
    headerUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    dataUuid:   "b1c2d3e4-f5a6-8901-bcde-f12345678901",
    scriptUuid: "c1d2e3f4-a5b6-9012-cdef-123456789012",
    scriptEntry: "scripts/main.ts",
  },
  rp: {
    headerUuid: "d1e2f3a4-b5c6-0123-defa-234567890123",
    dataUuid:   "e1f2a3b4-c5d6-1234-efab-345678901234",
    sprites: {
      "textures/items/fire_minigun.png": minigun({
        barrelColor:     [90,  85,  80, 255],  // dark steel
        barrelHighlight: [220, 160,  80, 255],  // hot orange-gold
        bodyColor:       [60,  55,  50, 255],  // dark housing
        gripColor:       [35,  30,  25, 255],  // near-black grip
        glow:            [255, 100,   0, 160],  // orange fire glow
        size: 16,
      }),
    },
  },
  scriptModuleDependencies: [
    { module_name: "@minecraft/server", version: "1.14.0" },
  ],
};
