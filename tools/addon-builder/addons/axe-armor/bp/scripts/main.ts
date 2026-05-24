import {
  EntityEquippableComponent,
  EquipmentSlot,
  system,
  world,
  type Player,
} from "@minecraft/server";

const ARMOR_ID = "axe:axe_armor";
// Reapply every 3 seconds (60 ticks); duration slightly longer so it never lapses.
const CHECK_INTERVAL = 60;
const EFFECT_DURATION = 80;

function isWearingAxeArmor(player: Player): boolean {
  const eq = player.getComponent(EntityEquippableComponent.componentId) as
    | EntityEquippableComponent
    | undefined;
  return eq?.getEquipment(EquipmentSlot.Chest)?.typeId === ARMOR_ID;
}

function applyEffects(player: Player): void {
  // Speed V — blazing fast running
  player.addEffect("minecraft:speed",        EFFECT_DURATION, { amplifier: 4, showParticles: false });
  // Jump Boost X — reaches ridiculous heights
  player.addEffect("minecraft:jump_boost",   EFFECT_DURATION, { amplifier: 9, showParticles: false });
  // Slow Falling — glide back down instead of plummeting
  player.addEffect("minecraft:slow_falling", EFFECT_DURATION, { amplifier: 0, showParticles: false });
}

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    if (isWearingAxeArmor(player)) {
      applyEffects(player);
    }
  }
}, CHECK_INTERVAL);
