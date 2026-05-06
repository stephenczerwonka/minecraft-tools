/**
 * Build all addons under ./addons into .mcaddon files in ./dist.
 *
 * For each addon directory that contains addon.config.ts:
 *   1. Load the config (UUIDs, metadata).
 *   2. Generate BP + RP manifest.json in-memory.
 *   3. Bundle bp/<scriptEntry> → scripts/main.js via Bun.build.
 *   4. Zip bp/ and rp/ into two .mcpack buffers.
 *   5. Zip the two .mcpack buffers into dist/<slug>.mcaddon.
 */

import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { zipDirectory, zipFiles, writeOutput, type ExtraFile } from "./lib/pack.ts";
import { renderSprite, type SpriteConfig } from "./lib/textures/sprite.ts";
import { renderIso, type IsoModel } from "./lib/textures/isometric.ts";

type SpriteDef = SpriteConfig | IsoModel;

function renderDef(def: SpriteDef): Uint8Array {
  return "kind" in def && def.kind === "iso" ? renderIso(def) : renderSprite(def as SpriteConfig);
}

type Triple = readonly [number, number, number];

interface ModuleDep {
  module_name: string;
  version: string;
}

interface AddonConfig {
  slug: string;
  name: string;
  description: string;
  version: Triple;
  minEngineVersion: Triple;
  bp: {
    headerUuid: string;
    dataUuid: string;
    scriptUuid: string;
    /** Relative to bp/, e.g. "scripts/main.ts". Bundled to "scripts/main.js". */
    scriptEntry: string;
  };
  rp: {
    headerUuid: string;
    dataUuid: string;
    /** Optional: RP-relative path → sprite or iso model. PNG generated at build time. */
    sprites?: Record<string, SpriteDef>;
  };
  scriptModuleDependencies: ModuleDep[];
}

interface Manifest {
  format_version: 2;
  header: {
    name: string;
    description: string;
    uuid: string;
    version: Triple;
    min_engine_version: Triple;
  };
  modules: Array<
    | { type: "data" | "resources"; uuid: string; version: Triple }
    | {
        type: "script";
        language: "javascript";
        entry: string;
        uuid: string;
        version: Triple;
      }
  >;
  dependencies: Array<ModuleDep | { uuid: string; version: Triple }>;
}

function buildBpManifest(c: AddonConfig): Manifest {
  return {
    format_version: 2,
    header: {
      name: `${c.name} BP`,
      description: c.description,
      uuid: c.bp.headerUuid,
      version: c.version,
      min_engine_version: c.minEngineVersion,
    },
    modules: [
      { type: "data", uuid: c.bp.dataUuid, version: c.version },
      {
        type: "script",
        language: "javascript",
        entry: "scripts/main.js",
        uuid: c.bp.scriptUuid,
        version: c.version,
      },
    ],
    dependencies: [
      ...c.scriptModuleDependencies,
      { uuid: c.rp.headerUuid, version: c.version },
    ],
  };
}

function buildRpManifest(c: AddonConfig): Manifest {
  return {
    format_version: 2,
    header: {
      name: `${c.name} RP`,
      description: c.description,
      uuid: c.rp.headerUuid,
      version: c.version,
      min_engine_version: c.minEngineVersion,
    },
    modules: [{ type: "resources", uuid: c.rp.dataUuid, version: c.version }],
    dependencies: [{ uuid: c.bp.headerUuid, version: c.version }],
  };
}

async function bundleScript(addonDir: string, scriptEntry: string): Promise<string> {
  const entry = join(addonDir, "bp", scriptEntry);
  const result = await Bun.build({
    entrypoints: [entry],
    target: "browser",
    format: "esm",
    minify: false,
    external: ["@minecraft/server", "@minecraft/server-ui"],
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error(`Failed to bundle ${entry}`);
  }
  const out = result.outputs[0];
  if (!out) throw new Error(`No bundle output for ${entry}`);
  return out.text();
}

async function loadConfig(addonDir: string): Promise<AddonConfig> {
  const configPath = join(addonDir, "addon.config.ts");
  const mod = (await import(pathToFileURL(configPath).href)) as { default: AddonConfig };
  return mod.default;
}

async function writeStaging(
  stageDir: string,
  extras: ExtraFile[],
): Promise<void> {
  await Promise.all(
    extras.map(async ({ path, data }) => {
      const dest = join(stageDir, path);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, typeof data === "string" ? data : Buffer.from(data));
    }),
  );
}

async function buildAddon(addonDir: string, distDir: string): Promise<string> {
  const config = await loadConfig(addonDir);
  const bpManifest = buildBpManifest(config);
  const rpManifest = buildRpManifest(config);
  const bundledScript = await bundleScript(addonDir, config.bp.scriptEntry);

  const bpExtras: ExtraFile[] = [
    { path: "manifest.json", data: JSON.stringify(bpManifest, null, 2) },
    { path: "scripts/main.js", data: bundledScript },
  ];
  const rpExtras: ExtraFile[] = [
    { path: "manifest.json", data: JSON.stringify(rpManifest, null, 2) },
    ...Object.entries(config.rp.sprites ?? {}).map(([path, def]) => ({
      path,
      data: renderDef(def),
    })),
  ];

  // Write generated files to a staging tree so they're easy to inspect on disk.
  const stageDir = join(distDir, config.slug);
  await Promise.all([
    writeStaging(join(stageDir, "bp"), bpExtras),
    writeStaging(join(stageDir, "rp"), rpExtras),
  ]);

  // Skip TS script sources when zipping the BP — we ship the bundled JS instead.
  const bpBuffer = await zipDirectory(join(addonDir, "bp"), bpExtras, (p) =>
    p.startsWith("scripts/") && p.endsWith(".ts"),
  );
  const rpBuffer = await zipDirectory(join(addonDir, "rp"), rpExtras);

  const mcaddonBuffer = await zipFiles([
    { path: `${config.slug}_bp.mcpack`, data: bpBuffer },
    { path: `${config.slug}_rp.mcpack`, data: rpBuffer },
  ]);

  const outPath = join(distDir, `${config.slug}.mcaddon`);
  await writeOutput(outPath, mcaddonBuffer);
  return outPath;
}

async function main(): Promise<void> {
  const repoRoot = resolve(import.meta.dir, "..");
  const addonsDir = join(repoRoot, "addons");
  const distDir = join(repoRoot, "dist");

  const entries = await readdir(addonsDir, { withFileTypes: true });
  const addonDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => join(addonsDir, e.name))
    .filter((d) => existsSync(join(d, "addon.config.ts")));

  if (addonDirs.length === 0) {
    console.log("No addons found under ./addons");
    return;
  }

  for (const dir of addonDirs) {
    const out = await buildAddon(dir, distDir);
    console.log(`  built ${out}`);
  }
}

await main();
