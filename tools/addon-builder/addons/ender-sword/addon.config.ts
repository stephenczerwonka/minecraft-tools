import { enderSwordModel } from "../../src/lib/textures/models.ts";

export default {
  slug: "ender-sword",
  name: "Ender Sword",
  description: "A massive sword forged from ender pearls — one-hit kills mobs, summons an ender dragon egg, and equips void armor.",
  version: [1, 0, 0] as [number, number, number],
  minEngineVersion: [1, 21, 0] as [number, number, number],
  bp: {
    headerUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    dataUuid:   "b2c3d4e5-f607-8901-bcde-f12345678901",
    scriptUuid: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    scriptEntry: "scripts/main.ts",
  },
  rp: {
    headerUuid: "d4e5f6a7-b8c9-0123-defa-234567890123",
    dataUuid:   "e5f6a7b8-c9d0-1234-efab-345678901234",
    sprites: {
      "textures/items/ender_sword.png": enderSwordModel(),
    },
  },
  scriptModuleDependencies: [
    { module_name: "@minecraft/server", version: "1.14.0" },
  ],
};
