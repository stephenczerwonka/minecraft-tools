import {
  EntityEquippableComponent,
  EquipmentSlot,
  world,
  type Player,
} from "@minecraft/server";

const SWORD_TYPE_ID = "dragon:fire_sword";
const FIRE_SECONDS = 5;

const UNDEAD_TYPE_IDS = new Set([
  "minecraft:zombie",
  "minecraft:husk",
  "minecraft:drowned",
  "minecraft:zombie_villager",
  "minecraft:zombie_villager_v2",
  "minecraft:skeleton",
  "minecraft:stray",
  "minecraft:wither_skeleton",
]);

function isHoldingFireSword(player: Player): boolean {
  const equippable = player.getComponent(EntityEquippableComponent.componentId) as
    | EntityEquippableComponent
    | undefined;
  const mainhand = equippable?.getEquipment(EquipmentSlot.Mainhand);
  return mainhand?.typeId === SWORD_TYPE_ID;
}

world.afterEvents.entityHitEntity.subscribe((event) => {
  const { damagingEntity, hitEntity } = event;
  if (damagingEntity.typeId !== "minecraft:player") return;
  if (!UNDEAD_TYPE_IDS.has(hitEntity.typeId)) return;
  if (!isHoldingFireSword(damagingEntity as Player)) return;

  hitEntity.setOnFire(FIRE_SECONDS, true);
});
