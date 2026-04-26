# minecraft-tools

A small monorepo of Minecraft tooling. Toolchain: **Bun + TypeScript**.

```sh
bun install
```

## Layout

```
tools/
  addon-builder/      # builds .mcaddon files for Bedrock
    src/              # the build tool
    addons/<name>/    # one directory per addon
  world-compressor/   # explode/repack/verify .mca regions for snapshot archival
    src/
```

Each tool is self-contained under `tools/<name>/`. There are no shared packages
yet; if real reuse appears, factor it into a top-level `packages/` directory.

---

## addon-builder

Factory for Minecraft Bedrock `.mcaddon` files.

```sh
bun run build     # outputs dist/*.mcaddon
```

Double-click a file in `dist/` to install it into Minecraft Bedrock, or drop the
unzipped `.mcpack` contents into `com.mojang/development_behavior_packs/` and
`com.mojang/development_resource_packs/` for live iteration.

### Addon layout

- `tools/addon-builder/addons/<name>/`
  - `addon.config.ts` — metadata + UUIDs
  - `bp/` — behavior pack sources (items, scripts, recipes…)
  - `rp/` — resource pack sources (textures, models, sounds…)

`manifest.json` for each pack is generated at build time from `addon.config.ts`
and is not committed.

### Addons

#### dragon-fire-sword

Adds `dragon:fire_sword` — the Dragon Fire Sword. Hitting any undead mob
(zombie, husk, drowned, zombie_villager, skeleton, stray, wither_skeleton) with
this sword ignites it for 5 seconds.

Obtain in-game with:
```
/give @s dragon:fire_sword
```
Or find it in the creative inventory under **Equipment**.

> The shipped texture is a 16×16 placeholder. Replace
> `tools/addon-builder/addons/dragon-fire-sword/rp/textures/items/dragon_fire_sword.png`
> with real art before publishing.

---

## world-compressor

Explode/repack/verify `.mca` region files so that snapshot archives dedupe well
when fed to 7z / zstd / zpaq. NBT bytes round-trip exactly; exact `.mca` byte
layout does not (re-deflating produces functionally-identical files).

```sh
bun run mca explode  ./snapshots/world-2026-01  ./exploded/world-2026-01
bun run mca verify   ./exploded/world-2026-01
bun run mca repack   ./exploded/world-2026-01  ./restored/world-2026-01
```

See `tools/world-compressor/src/mca-tool.ts` for the full interface and the
preserved/not-preserved invariants.
