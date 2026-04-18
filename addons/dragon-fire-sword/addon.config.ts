import { sword } from "../../src/lib/textures/presets.ts";

export default {
  slug: "dragon-fire-sword",
  name: "Dragon Fire Sword",
  description: "Adds the Dragon Fire Sword — ignites undead on hit.",
  version: [1, 0, 0] as [number, number, number],
  minEngineVersion: [1, 21, 0] as [number, number, number],
  bp: {
    headerUuid: "30633c4a-d7e1-44c4-b5ae-634fc84d1085",
    dataUuid: "b06ba46c-a78f-4cc3-a9cd-6c1ce1187df7",
    scriptUuid: "b7ee65e6-6b7e-4cdc-9e91-9d630576d27e",
    scriptEntry: "scripts/main.ts",
  },
  rp: {
    headerUuid: "56bcbb4c-bd62-4dab-9a49-2c12fcaa7624",
    dataUuid: "f0fd9600-db6c-4181-a822-4b0efddb0bc6",
    /** Map of RP-relative texture paths → SpriteConfig. Generated at build time. */
    sprites: {
      "textures/items/dragon_fire_sword.png": sword({
        bladeTip:  [255, 240,  80, 255],  // bright yellow tip
        bladeBase: [200,  40,  10, 255],  // deep red base
        guard:     [120,  80,  30, 255],  // dark gold guard
        handle:    [ 80,  45,  15, 255],  // brown handle
        pommel:    [150, 100,  40, 255],
        glow:      [255, 120,  40, 140],  // orange fire glow
        size: 16,
      }),
    },
  },
  scriptModuleDependencies: [
    { module_name: "@minecraft/server", version: "1.14.0" },
  ],
};
