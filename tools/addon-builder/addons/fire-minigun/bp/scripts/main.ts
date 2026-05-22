import {
  EntityEquippableComponent,
  EquipmentSlot,
  ItemDurabilityComponent,
  system,
  world,
  type Player,
  type Vector3,
} from "@minecraft/server";

const MINIGUN_TYPE_ID = "minigun:fire_minigun";
const FIREBALL_ENTITY = "minecraft:small_fireball";

// 10 shots/sec: one shot every 2 ticks
const TICKS_PER_SHOT = 2;
// Each right-click fires a 3-second burst (30 shots)
const SHOTS_PER_BURST = 30;
// Projectile speed in blocks/tick
const SHOT_SPEED = 1.8;
// Cone spread half-angle (radians equivalent per axis)
const SPREAD = 0.06;

// Map from player name → remaining shots in the current burst
const activeFirings = new Map<string, number>();

function getEquippable(player: Player): EntityEquippableComponent | undefined {
  return player.getComponent(EntityEquippableComponent.componentId) as
    | EntityEquippableComponent
    | undefined;
}

function isHoldingMinigun(player: Player): boolean {
  return getEquippable(player)
    ?.getEquipment(EquipmentSlot.Mainhand)
    ?.typeId === MINIGUN_TYPE_ID;
}

function damageMinigun(player: Player): void {
  const eq = getEquippable(player);
  if (!eq) return;
  const item = eq.getEquipment(EquipmentSlot.Mainhand);
  if (!item || item.typeId !== MINIGUN_TYPE_ID) return;

  const dur = item.getComponent(ItemDurabilityComponent.componentId) as
    | ItemDurabilityComponent
    | undefined;
  if (!dur) return;

  dur.damage += 1;

  if (dur.damage >= dur.maxDurability) {
    eq.setEquipment(EquipmentSlot.Mainhand, undefined);
    player.sendMessage("§6Your Fire Minigun has overheated and melted!");
  } else {
    eq.setEquipment(EquipmentSlot.Mainhand, item);
  }
}

function fireShot(player: Player): void {
  const dir = player.getViewDirection();
  const head = player.getHeadLocation();

  // Spawn 1.5 blocks ahead of the player's eyes so the ball clears the hitbox
  const spawnPos: Vector3 = {
    x: head.x + dir.x * 1.5,
    y: head.y + dir.y * 1.5,
    z: head.z + dir.z * 1.5,
  };

  const jitter = () => (Math.random() - 0.5) * SPREAD * 2;

  try {
    const fireball = player.dimension.spawnEntity(FIREBALL_ENTITY, spawnPos);
    fireball.applyImpulse({
      x: (dir.x + jitter()) * SHOT_SPEED,
      y: (dir.y + jitter()) * SHOT_SPEED,
      z: (dir.z + jitter()) * SHOT_SPEED,
    });
    damageMinigun(player);
  } catch {
    // Ignore failures (e.g. spawn location out of bounds)
  }
}

// Each right-click starts a fresh burst
world.afterEvents.itemUse.subscribe((event) => {
  if (event.itemStack.typeId !== MINIGUN_TYPE_ID) return;
  activeFirings.set(event.source.name, SHOTS_PER_BURST);
});

// Rapid-fire ticker — runs every TICKS_PER_SHOT game ticks
system.runInterval(() => {
  for (const [name, remaining] of activeFirings) {
    if (remaining <= 0) {
      activeFirings.delete(name);
      continue;
    }

    const player = world.getPlayers({ name })[0];
    if (!player || !isHoldingMinigun(player)) {
      activeFirings.delete(name);
      continue;
    }

    fireShot(player);
    activeFirings.set(name, remaining - 1);
  }
}, TICKS_PER_SHOT);
