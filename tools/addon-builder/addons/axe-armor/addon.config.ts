import { axeArmorModel } from "../../src/lib/textures/models.ts";

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
      "textures/items/axe_armor.png": axeArmorModel(),
    },
  },
  scriptModuleDependencies: [
    { module_name: "@minecraft/server", version: "1.14.0" },
  ],
};
