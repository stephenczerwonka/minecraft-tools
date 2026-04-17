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
  },
  scriptModuleDependencies: [
    { module_name: "@minecraft/server", version: "1.14.0" },
  ],
};
