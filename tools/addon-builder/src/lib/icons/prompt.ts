export type WeaponKind =
  | "sword"
  | "axe"
  | "pickaxe"
  | "dagger"
  | "bow"
  | "hammer"
  | "spear"
  | "staff"
  | "minigun";

const BASE =
  "16x16 pixel art, transparent background, centered, no shadow, " +
  "minecraft item icon, vibrant colors, sharp pixel edges, 8-bit aesthetic, " +
  "isometric 45-degree weapon angle, single object, no border, no text";

const WEAPON_CLAUSE: Record<WeaponKind, string> = {
  sword:
    "long straight double-edged sword, blade pointing upper-right, crossguard and wrapped hilt visible",
  axe:
    "single-bladed battle axe, broad curved blade on left, long wooden handle running down-right",
  pickaxe:
    "mining pickaxe, horizontal head with two opposing points, diagonal wooden handle",
  dagger:
    "short stubby dagger, blade pointing upper-right, simple guard, leather-wrapped grip",
  bow:
    "recurve bow drawn vertically, string visible, arrow nocked, wood grain texture",
  hammer:
    "heavy war hammer, large blocky rectangular head, thick wooden haft running down-right",
  spear:
    "long thin spear, leaf-shaped blade pointing upper-right, slim wooden shaft, no shield",
  staff:
    "wizard staff, gnarled wooden shaft, glowing crystal or orb at the top",
  minigun:
    "rotary minigun, six rotating barrels, ammo belt, mechanical body, sci-fi gunmetal finish",
};

export function buildPrompt(weapon: WeaponKind, userPrompt: string): string {
  return `${BASE}, ${WEAPON_CLAUSE[weapon]}. ${userPrompt.trim()}`;
}

export function buildNegativePrompt(): string {
  return (
    "blurry, smooth gradients, antialiased, photorealistic, 3d render, " +
    "text, watermark, multiple objects, hands, character, background scenery"
  );
}
