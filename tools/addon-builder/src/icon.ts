/**
 * bun run icon <addon-slug> <icon-key> --prompt "..." --weapon <kind>
 *              [--provider openai|replicate|stub]
 *              [--seed <number>]
 *              [--colors <number>]
 *              [--snap]
 *              [--force]
 *
 * Runs the full AI icon pipeline and writes the 16×16 PNG to both:
 *   addons/<slug>/rp/textures/items/<key>.png   (committed artifact)
 *   .cache/icons/<sha>.png                       (content-addressed cache)
 */

import { resolve, join, dirname, basename } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { getProvider } from "./lib/icons/providers/index.ts";
import { buildPrompt, buildNegativePrompt, type WeaponKind } from "./lib/icons/prompt.ts";
import { computeHash, cacheGet, cachePut } from "./lib/icons/cache.ts";
import { pixelizeWeaponIcon } from "./lib/icons/pipeline.ts";
import { IconProviderError } from "./lib/icons/provider.ts";

const WEAPON_KINDS: WeaponKind[] = [
  "sword", "axe", "pickaxe", "dagger", "bow", "hammer", "spear", "staff", "minigun",
];

function parseArgs(argv: string[]): {
  slug: string;
  iconKey: string;
  prompt: string;
  weapon: WeaponKind;
  provider: string;
  seed?: number;
  colors: number;
  snap: boolean;
  force: boolean;
} {
  const args = argv.slice(2); // skip "bun" and script path
  const [slug, iconKey] = args;
  if (!slug || !iconKey) {
    console.error("Usage: bun run icon <addon-slug> <icon-key> --prompt \"...\" --weapon <kind>");
    process.exit(1);
  }

  function flag(name: string): string | undefined {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
  }
  function has(name: string): boolean {
    return args.includes(`--${name}`);
  }

  const prompt = flag("prompt") ?? "";
  const weaponRaw = flag("weapon");
  if (!weaponRaw || !WEAPON_KINDS.includes(weaponRaw as WeaponKind)) {
    console.error(`--weapon must be one of: ${WEAPON_KINDS.join(", ")}`);
    process.exit(1);
  }
  const weapon = weaponRaw as WeaponKind;
  const provider = flag("provider") ?? "stub";
  const seedRaw = flag("seed");
  const seed = seedRaw !== undefined ? parseInt(seedRaw, 10) : undefined;
  const colors = parseInt(flag("colors") ?? "12", 10);
  const snap = has("snap");
  const force = has("force");

  return { slug, iconKey, prompt, weapon, provider, seed, colors, snap, force };
}

async function main(): Promise<void> {
  const { slug, iconKey, prompt, weapon, provider: providerId, seed, colors, snap, force } =
    parseArgs(process.argv);

  const repoRoot = resolve(import.meta.dir, "..");
  const addonDir = join(repoRoot, "addons", slug);
  if (!existsSync(addonDir)) {
    console.error(`Addon not found: ${addonDir}`);
    process.exit(1);
  }

  const sha = computeHash({ prompt, weapon, provider: providerId, seed });
  console.log(`  hash: ${sha}`);

  if (!force) {
    const cached = await cacheGet(sha);
    if (cached) {
      console.log("  already cached — skipping generation (use --force to regenerate)");
      // Still write the addon copy in case it's missing
      const addonIconPath = join(addonDir, "rp", "textures", "items", `${iconKey}.png`);
      await mkdir(dirname(addonIconPath), { recursive: true });
      await writeFile(addonIconPath, cached);
      console.log(`  wrote ${addonIconPath}`);
      return;
    }
  }

  const provider = getProvider(providerId);
  const fullPrompt = buildPrompt(weapon, prompt);
  const negativePrompt = buildNegativePrompt();
  console.log(`  provider: ${provider.id}`);
  console.log(`  prompt: ${fullPrompt}`);

  const t0 = Date.now();
  const rawPng = await provider.generate(fullPrompt, { size: 1024, seed, negativePrompt });
  console.log(`  generated in ${Date.now() - t0}ms (${rawPng.length} bytes)`);

  const t1 = Date.now();
  const icon16 = await pixelizeWeaponIcon(rawPng, { colors, snap });
  console.log(`  pixelized in ${Date.now() - t1}ms → 16×16 PNG (${icon16.length} bytes)`);

  await cachePut(sha, icon16, {
    prompt: fullPrompt,
    weapon,
    provider: providerId,
    seed,
    createdAt: new Date().toISOString(),
  });

  const addonIconPath = join(addonDir, "rp", "textures", "items", `${iconKey}.png`);
  await mkdir(dirname(addonIconPath), { recursive: true });
  await writeFile(addonIconPath, icon16);

  console.log(`  wrote ${addonIconPath}`);
  console.log(`  cached at .cache/icons/${sha}.png`);
}

main().catch((err) => {
  if (err instanceof IconProviderError) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
