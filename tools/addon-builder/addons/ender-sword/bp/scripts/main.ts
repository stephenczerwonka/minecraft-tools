import {
  EntityEquippableComponent,
  EntityInventoryComponent,
  EquipmentSlot,
  ItemStack,
  world,
  type Player,
} from "@minecraft/server";

const SWORD_ID = "ender:ender_sword";

function isHolding(player: Player, itemId: string): boolean {
  const eq = player.getComponent(EntityEquippableComponent.componentId) as
    | EntityEquippableComponent
    | undefined;
  return eq?.getEquipment(EquipmentSlot.Mainhand)?.typeId === itemId;
}

function giveItem(player: Player, itemId: string, amount = 1): void {
  const inv = player.getComponent(EntityInventoryComponent.componentId) as
    | EntityInventoryComponent
    | undefined;
  inv?.container?.addItem(new ItemStack(itemId, amount));
}

function equipVoidArmor(player: Player): void {
  const eq = player.getComponent(EntityEquippableComponent.componentId) as
    | EntityEquippableComponent
    | undefined;
  if (!eq) return;
  eq.setEquipment(EquipmentSlot.Head,  new ItemStack("minecraft:netherite_helmet"));
  eq.setEquipment(EquipmentSlot.Chest, new ItemStack("minecraft:netherite_chestplate"));
  eq.setEquipment(EquipmentSlot.Legs,  new ItemStack("minecraft:netherite_leggings"));
  eq.setEquipment(EquipmentSlot.Feet,  new ItemStack("minecraft:netherite_boots"));
}

world.afterEvents.entityHitEntity.subscribe((event) => {
  const { damagingEntity, hitEntity } = event;
  if (damagingEntity.typeId !== "minecraft:player") return;
  const player = damagingEntity as Player;
  if (!isHolding(player, SWORD_ID)) return;

  hitEntity.kill();
  giveItem(player, "minecraft:ender_dragon_spawn_egg");
  equipVoidArmor(player);
});
