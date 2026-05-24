import {
  EntityEquippableComponent,
  EquipmentSlot,
  world,
  type Player,
} from "@minecraft/server";

const MACE_ID = "diamond:diamond_mace";

function isHolding(player: Player, itemId: string): boolean {
  const eq = player.getComponent(EntityEquippableComponent.componentId) as
    | EntityEquippableComponent
    | undefined;
  return eq?.getEquipment(EquipmentSlot.Mainhand)?.typeId === itemId;
}

world.afterEvents.entityHitEntity.subscribe((event) => {
  const { damagingEntity, hitEntity } = event;
  if (damagingEntity.typeId !== "minecraft:player") return;
  const player = damagingEntity as Player;
  if (!isHolding(player, MACE_ID)) return;

  const spawnLoc = hitEntity.location;
  const dim = hitEntity.dimension;

  hitEntity.kill();

  // Spawn the Mutant Herobrine (a powered wither) at the fallen mob's position
  const herobrine = dim.spawnEntity("minecraft:wither", spawnLoc);
  herobrine.nameTag = "Mutant Herobrine";
});
