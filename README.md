# minecraft-tools

Factory for Minecraft Bedrock `.mcaddon` files. Toolchain: **Bun + TypeScript**.

## Quick start

```sh
bun install
bun run build     # outputs dist/*.mcaddon
```

Double-click a file in `dist/` to install it into Minecraft Bedrock, or drop the
unzipped `.mcpack` contents into `com.mojang/development_behavior_packs/` and
`com.mojang/development_resource_packs/` for live iteration.

## Layout

- `src/` — the build tool (bundles scripts, generates manifests, zips packs)
- `addons/<name>/` — one directory per addon
  - `addon.config.ts` — metadata + UUIDs
  - `bp/` — behavior pack sources (items, scripts, recipes…)
  - `rp/` — resource pack sources (textures, models, sounds…)

`manifest.json` for each pack is generated at build time from `addon.config.ts`
and is not committed.

## Addons

### dragon-fire-sword

Adds `dragon:fire_sword` — the Dragon Fire Sword. Hitting any undead mob
(zombie, husk, drowned, zombie_villager, skeleton, stray, wither_skeleton) with
this sword ignites it for 5 seconds.

Obtain in-game with:
```
/give @s dragon:fire_sword
```
Or find it in the creative inventory under **Equipment**.

> The shipped texture is a 16×16 placeholder. Replace
> `addons/dragon-fire-sword/rp/textures/items/dragon_fire_sword.png` with real
> art before publishing.
