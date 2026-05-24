import { diamondMaceModel } from "../../src/lib/textures/models.ts";

export default {
  slug: "diamond-mace",
  name: "Diamond Mace",
  description: "A diamond-forged mace that one-hit kills any mob and summons the fearsome Mutant Herobrine.",
  version: [1, 0, 0] as [number, number, number],
  minEngineVersion: [1, 21, 0] as [number, number, number],
  bp: {
    headerUuid: "f6a7b8c9-d0e1-2345-fab1-456789012345",
    dataUuid:   "a7b8c9d0-e1f2-3456-ab12-567890123456",
    scriptUuid: "b8c9d0e1-f2a3-4567-bc23-678901234567",
    scriptEntry: "scripts/main.ts",
  },
  rp: {
    headerUuid: "c9d0e1f2-a3b4-5678-cd34-789012345678",
    dataUuid:   "d0e1f2a3-b4c5-6789-de45-890123456789",
    sprites: {
      "textures/items/diamond_mace.png": diamondMaceModel(),
    },
  },
  scriptModuleDependencies: [
    { module_name: "@minecraft/server", version: "1.14.0" },
  ],
};
