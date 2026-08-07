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
  world-backup/       # nightly timestamped world backups
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

---

## world-backup

On Windows, back up every Java or Bedrock world updated within the last five
days. Point the script at the directory that contains the individual world
folders; a world is recognized by its `level.dat` file.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\world-backup\backup-worlds.ps1 `
  -WorldsDirectory 'C:\Minecraft\worlds' `
  -SaveDirectory 'D:\Minecraft Backups'
```

Each run creates a `.tar.gz` archive and a matching `.sha256` checksum. The
archive is built as a temporary file and moved into place only after `tar`
succeeds. A lock prevents two backups from writing to the same save directory
at once.

Register it with Windows Task Scheduler to run every night at midnight:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\world-backup\install-backup-task.ps1 `
  -WorldsDirectory 'C:\Minecraft\worlds' `
  -SaveDirectory 'D:\Minecraft Backups'
```

The task uses the computer's local timezone and catches up after sleep or a
shutdown. Open **Task Scheduler** and select **Minecraft World Backup** to
inspect, run, or remove it. For a consistent snapshot, close Minecraft or stop
the server before the task runs; copying a world while it is actively being
written can produce an inconsistent backup. Pass `-UpdatedWithinDays N` to
either PowerShell script to change the five-day window.

Linux users can run `backup-world.sh WORLD_DIRECTORY SAVE_DIRECTORY` from a
standard midnight cron entry (`0 0 * * *`).
