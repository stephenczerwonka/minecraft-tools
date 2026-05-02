# UI Layer — Spec

Status: **draft / not implemented**. This document is a design target. No UI
code exists in the repo yet; everything below is a plan for what to build.

## Goal

Wrap the existing CLI tools (`addon-builder`, `world-compressor`) in a single
local UI so non-CLI users can:

1. Run the **World Compressor** (explode / repack / verify a world).
2. Use the **Addon Builder** to author a new addon by picking a sub-mode
   (item, weapon, block, entity, …), filling out a form, and previewing the
   result before building a `.mcaddon`.

Out of scope for v1: cloud sync, multi-user editing, marketplace publishing,
authoring full behavior packs by hand inside the UI (people who need that drop
to the filesystem layout that already exists).

---

## Architecture

```
tools/
  ui/                       # NEW — added by this spec
    src/
      main.ts               # entry: launches the local server + opens browser
      server/               # Bun.serve — wraps existing tool APIs
        routes/
          compressor.ts     # POST /api/compressor/{explode,repack,verify}
          addons.ts         # GET/POST /api/addons, /api/addons/:slug, /build
          preview.ts        # POST /api/preview/sprite — returns PNG bytes
      web/                  # browser bundle (built with Bun.build)
        index.html
        app.tsx             # React or Preact, TBD
        modes/
          compressor/       # World Compressor screens
          addons/           # Addon Builder shell + sub-modes
        components/
          PreviewCanvas.tsx
          ColorPicker.tsx
          FormField.tsx
  addon-builder/            # existing — exposes a programmatic API (see below)
  world-compressor/         # existing — exposes a programmatic API (see below)
```

**Process model.** A single `bun run ui` starts a local HTTP server on
`127.0.0.1:<random-port>`, opens the default browser to it, and shuts down on
window close. No Electron, no system tray. The server is the only thing that
touches the filesystem; the browser talks to it over JSON + multipart.

**Why a local web app, not Electron / Tauri.** We already have Bun. A static
bundle + `Bun.serve` is ~zero new dependencies. If we later want a packaged
desktop app, Tauri can wrap the same web build without rewriting the UI.

**Framework choice.** React 18 is the safe default given component density
(forms, color pickers, canvas previews). Preact is a fine drop-in if we want
a smaller bundle. Decide before first commit; not load-bearing.

---

## Top-level UI

A two-pane shell:

- Left rail: **Mode switcher** with two entries:
  - World Compressor
  - Addon Builder
- Main pane: the active mode.

No global settings page in v1. Paths are entered per-action.

---

## Mode 1 — World Compressor

Wraps the three subcommands in `tools/world-compressor/src/mca-tool.ts`.

### Screens

1. **Explode**
   - Input: source world directory (folder picker → resolves to absolute path).
   - Input: destination directory.
   - Action: `POST /api/compressor/explode`.
   - Live log streamed from the server (Server-Sent Events).
   - On finish: show chunk count, total bytes, manifest path.

2. **Verify**
   - Input: exploded directory.
   - Action: `POST /api/compressor/verify`.
   - Output: pass/fail summary + list of any mismatched chunks.

3. **Repack**
   - Input: exploded directory + destination world directory.
   - Action: `POST /api/compressor/repack`.
   - Output: written region count, destination path.

### What this needs from the existing tool

`tools/world-compressor/src/mca-tool.ts` is currently a CLI script with a
`main()` at the bottom. To call it in-process we need to:

- Refactor it so `explode`, `repack`, `verify` are exported async functions
  that take `{src, dst, onLog}` and return a result object.
- Keep the existing CLI entrypoint working by delegating to the same
  functions.

**Not implemented.** This refactor is part of the build plan, not done.

---

## Mode 2 — Addon Builder

Two-step flow:

1. **Pick or create an addon.** A list view shows addons currently in
   `tools/addon-builder/addons/*`. "New addon" launches the sub-mode picker.
2. **Edit / preview / build.** Sub-mode-specific editor on the left, live
   preview on the right, "Build .mcaddon" button at the bottom.

### Sub-modes

Each sub-mode corresponds to a kind of content you can ship in a Bedrock
addon. v1 ships **Item** and **Weapon** because the existing
`dragon-fire-sword` already exercises that path. The others are scaffolded
in the UI but mark themselves as "coming soon" until the addon-builder side
lands.

| Sub-mode    | v1 status      | Notes                                           |
| ----------- | -------------- | ----------------------------------------------- |
| Item        | implemented    | Generic item: identifier, display name, icon.   |
| Weapon      | implemented    | Sword-style item with damage + on-hit script.   |
| Block       | stub / planned | Needs block JSON template + texture preview.    |
| Entity      | stub / planned | Needs entity behavior + geometry preview.       |
| Recipe      | stub / planned | Crafting / smelting; depends on Item existing.  |
| Loot table  | stub / planned | UI is a tree editor; low priority.              |
| Biome / Dim | not planned v1 | Out of scope.                                   |

The sub-mode picker shows all of them; planned ones are disabled with a
"not yet implemented" tooltip linking to this spec section.

### Item sub-mode

Form fields:

- **Identifier** (`namespace:name`, validated).
- **Display name**.
- **Category** (`equipment` | `items` | `nature` | `construction`).
- **Stack size** (1–64).
- **Icon source**:
  - `preset` — pick a sprite preset + tweak parameters (see Preview).
  - `upload` — upload a 16×16 or 32×32 PNG.

Output: writes `bp/items/<name>.json` and `rp/textures/items/<name>.png`,
updates `addon.config.ts` (sprites map + texture list).

### Weapon sub-mode

Extends Item. Adds:

- **Damage**.
- **Durability**.
- **On-hit behavior**: a small set of canned recipes (none / ignite undead /
  lightning / heal self) that codegen a corresponding `bp/scripts/main.ts`
  fragment. Custom scripts are out of scope — drop to the filesystem.

Default icon preset is `sword(...)` from
`tools/addon-builder/src/lib/textures/presets.ts`.

### Preview

The right pane is a **sprite preview**:

- Renders the current sprite config at 4× and 16× zoom (nearest-neighbor).
- Updates live as the user edits color pickers / sliders.
- Implementation: the browser calls
  `POST /api/preview/sprite` with the current `SpriteConfig`; the server
  reuses `renderSprite()` from `tools/addon-builder/src/lib/textures/sprite.ts`
  and returns PNG bytes. We pipe those into an `<img>` via `URL.createObjectURL`.
  - Alternative considered: port `renderSprite` to run in the browser. It's
    pure TS with one `node:zlib` call; swapping to `pako` makes it isomorphic.
    Defer until we feel server-round-trip latency.

For sub-modes that aren't sprite-shaped (block, entity), the preview is a
placeholder card: "3D preview not yet implemented". The plan there is a
small Three.js scene that loads the block/entity geometry + textures, but
that's deferred until block/entity sub-modes exist.

### Build action

"Build .mcaddon" calls `POST /api/addons/:slug/build`, which invokes the
existing `buildAddon()` from `tools/addon-builder/src/build.ts`. Result: a
download link to the produced `.mcaddon` plus the path on disk.

### What this needs from the existing tool

- Export `buildAddon(addonDir, distDir)` from `tools/addon-builder/src/build.ts`
  (currently it's defined but the file ends with a top-level `await main()`).
  Move the script driver into a separate `cli.ts`.
- Add a `scaffoldAddon({slug, kind, fields})` helper that writes the addon
  directory layout the UI needs. Today there's no programmatic scaffolder;
  the existing `dragon-fire-sword` was hand-authored.
- Generalize the on-hit script fragment so the weapon sub-mode can pick
  from a small library instead of writing free-form TS.

**Not implemented.** All three of the above are part of the build plan.

---

## Data flow summary

```
browser ──HTTP──▶ Bun.serve (tools/ui/src/server)
                      │
                      ├─▶ world-compressor: explode/repack/verify   (in-process)
                      ├─▶ addon-builder:    scaffold / build         (in-process)
                      └─▶ addon-builder:    renderSprite for preview (in-process)
```

No external services. No persistent state beyond what the existing tools
already write to disk (the `addons/` directory and `dist/`).

---

## Build plan

Phases are sequenced so each one is shippable on its own.

### Phase 0 — Refactor existing tools to be importable

- `tools/world-compressor`: split CLI from library. Export
  `explode/repack/verify` as functions. Add `onLog` callback.
- `tools/addon-builder`: split CLI from library. Export `buildAddon`. Add
  `scaffoldAddon` (writes a fresh addon directory + `addon.config.ts`).
- No UI yet. Existing `bun run build` and `bun run mca` still work.

### Phase 1 — UI shell + World Compressor

- New `tools/ui/` package.
- Bun server + minimal React shell with the mode switcher.
- World Compressor mode wired end-to-end (explode / verify / repack with
  streamed logs).
- Addon Builder tab exists but only shows the addon list and a "coming soon"
  note.

### Phase 2 — Addon Builder: Item + Weapon sub-modes

- Sub-mode picker.
- Item form + sprite preview + build button.
- Weapon form (extends Item) with the canned on-hit behaviors.
- Round-trip test: scaffold a new weapon in the UI, build it, install in
  Bedrock, confirm it works the same as `dragon-fire-sword`.

### Phase 3 — Block sub-mode + 3D preview

- Block form (identifier, material, textures per face, hardness).
- Three.js preview cube with the chosen face textures.
- This is the first sub-mode that needs a non-sprite preview, so most of the
  3D preview infrastructure lands here.

### Phase 4 — Entity, Recipe, Loot table

- Entity reuses the Phase 3 3D preview (geometry + texture).
- Recipe is form-only; no preview beyond a list of inputs/outputs.
- Loot table is a tree editor; visual preview is a sample-roll button that
  shows what 100 rolls produce.

Each phase past 1 is independently optional — we can ship Phase 2 and stop
if that covers what people actually use.

---

## Open questions

- React vs. Preact vs. Solid. Pick before Phase 1 starts.
- Folder pickers in the browser are awkward (no native picker for
  directories without `webkitdirectory`, which only gives names not paths).
  Likely path: a server-side path-completion endpoint + a typed text field
  with autocomplete, plus a "drop a folder here to read its absolute path"
  fallback. Confirm during Phase 1 prototyping.
- Where the UI runs: localhost-only is the v1 answer. If we ever want to
  host this somewhere shared, auth and sandboxing are non-trivial. Not in
  scope.

---

## Explicitly not implemented yet

Everything in this document. The repo currently contains only the two CLI
tools described in `README.md`. The `tools/ui/` directory does not exist;
neither do the refactors in Phase 0. This spec is the plan; nothing in it
has shipped.
