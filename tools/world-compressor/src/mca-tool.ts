#!/usr/bin/env bun
/**
 * mca-tool — explode, repack, and verify Minecraft worlds for snapshot
 * archival. Designed to make `.mca` region files dedupe well across
 * snapshots when fed to 7z / zstd / zpaq.
 *
 * Subcommands:
 *   explode <src_world> <dst_dir>      .mca → per-chunk .nbt + manifest + ts sidecar
 *   repack  <src_dir>   <dst_world>    inverse of explode (playable .mca)
 *   verify  <exploded_dir>             re-hash chunks against manifest
 *
 * Lossless guarantees:
 *   - NBT (game-state) bytes round-trip exactly. Verifiable via manifest.
 *   - Region timestamp tables preserved via sidecar (_timestamps.bin).
 *   - Per-chunk compression type preserved in filename (.cN.nbt).
 *
 * NOT preserved (and you don't need them):
 *   - Exact .mca byte layout. Re-deflating at zlib level 6 produces
 *     functionally-identical but not bit-identical .mca files. Hash on
 *     the NBT, not the .mca.
 *
 * Usage:
 *   bun mca-tool.ts explode  ./snapshots/world-2026-01  ./exploded/world-2026-01
 *   bun mca-tool.ts verify   ./exploded/world-2026-01
 *   bun mca-tool.ts repack   ./exploded/world-2026-01  ./restored/world-2026-01
 */
import { readdir, readFile, writeFile, mkdir, stat, copyFile } from "node:fs/promises";
import { join, relative, dirname, basename } from "node:path";
import { deflateSync, inflateSync, gzipSync, gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";

const SECTOR = 4096;
const MANIFEST_NAME = ".mca-manifest.json";
const TS_SIDECAR = "_timestamps.bin";
const NBT_RE = /^(\d+)\.(\d+)\.c(\d+)\.nbt$/;

type ChunkRecord = { sha256: string; ctype: number };
type Manifest = {
  version: 1;
  createdAt: string;
  chunks: Record<string, ChunkRecord>;
};

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function decompressChunk(data: Buffer, ctype: number): Buffer {
  if (ctype === 1) return gunzipSync(data);
  if (ctype === 2) return inflateSync(data);
  if (ctype === 3) return Buffer.from(data);
  throw new Error(`chunk compression type ${ctype} not supported (LZ4 needs an extra package)`);
}

function compressChunk(data: Buffer, ctype: number): Buffer {
  if (ctype === 1) return gzipSync(data);
  if (ctype === 2) return deflateSync(data);
  if (ctype === 3) return data;
  throw new Error(`chunk compression type ${ctype} not supported`);
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

// ---------- explode ----------

async function explodeRegion(
  mcaPath: string,
  outDir: string,
  manifest: Manifest,
  manifestRoot: string,
): Promise<number> {
  await mkdir(outDir, { recursive: true });
  const buf = await readFile(mcaPath);
  if (buf.length < 2 * SECTOR) return 0;

  await writeFile(join(outDir, TS_SIDECAR), buf.subarray(SECTOR, 2 * SECTOR));

  let count = 0;
  for (let i = 0; i < 1024; i++) {
    const entry = buf.readUInt32BE(i * 4);
    const offSec = entry >>> 8;
    const lenSec = entry & 0xff;
    if (offSec === 0 || lenSec === 0) continue;

    const start = offSec * SECTOR;
    if (start + 5 > buf.length) continue;
    const clen = buf.readUInt32BE(start);
    if (clen === 0) continue;
    const ctype = buf.readUInt8(start + 4);
    const payload = buf.subarray(start + 5, start + 4 + clen);

    let nbt: Buffer;
    try {
      nbt = decompressChunk(Buffer.from(payload), ctype);
    } catch (e) {
      console.warn(`  warn: ${basename(mcaPath)} chunk ${i}: ${(e as Error).message}`);
      continue;
    }

    const cx = i & 31, cz = (i >> 5) & 31;
    const outPath = join(outDir, `${cx}.${cz}.c${ctype}.nbt`);
    await writeFile(outPath, nbt);

    const rel = relative(manifestRoot, outPath).replaceAll("\\", "/");
    manifest.chunks[rel] = { sha256: sha256(nbt), ctype };
    count++;
  }
  return count;
}

async function cmdExplode(src: string, dst: string) {
  if (!(await stat(src)).isDirectory()) throw new Error(`not a directory: ${src}`);

  await mkdir(dst, { recursive: true });
  const manifest: Manifest = { version: 1, createdAt: new Date().toISOString(), chunks: {} };
  let regions = 0, chunks = 0;

  for await (const path of walk(src)) {
    const rel = relative(src, path);
    const target = join(dst, rel);

    if (path.endsWith(".mca")) {
      const regionDir = target.slice(0, -".mca".length);
      chunks += await explodeRegion(path, regionDir, manifest, dst);
      regions++;
      if (regions % 25 === 0) console.log(`  ${regions} regions, ${chunks} chunks…`);
    } else {
      await mkdir(dirname(target), { recursive: true });
      await copyFile(path, target);
    }
  }

  await writeFile(join(dst, MANIFEST_NAME), JSON.stringify(manifest, null, 2));
  console.log(`explode done: ${regions} regions, ${chunks} chunks → ${dst}`);
}

// ---------- repack ----------

async function repackRegion(regionDir: string, outMcaPath: string): Promise<number> {
  const files = await readdir(regionDir);
  type Packed = { idx: number; sectors: number; data: Buffer };
  const packed: Packed[] = [];

  for (const f of files) {
    const m = NBT_RE.exec(f);
    if (!m) continue;
    const cx = +m[1]!, cz = +m[2]!, ctype = +m[3]!;
    if (cx < 0 || cx > 31 || cz < 0 || cz > 31) continue;

    const nbt = await readFile(join(regionDir, f));
    const compressed = compressChunk(nbt, ctype);
    const recordLen = 4 + 1 + compressed.length;
    const sectors = Math.ceil(recordLen / SECTOR);
    if (sectors > 0xff) throw new Error(`chunk ${cx},${cz} too large after recompress (${sectors} sectors)`);

    const data = Buffer.alloc(sectors * SECTOR);
    data.writeUInt32BE(1 + compressed.length, 0);
    data.writeUInt8(ctype, 4);
    compressed.copy(data, 5);
    packed.push({ idx: cz * 32 + cx, sectors, data });
  }
  if (packed.length === 0) return 0;

  const locTable = Buffer.alloc(SECTOR);
  let cursor = 2;
  for (const p of packed) {
    locTable.writeUInt32BE((cursor << 8) | p.sectors, p.idx * 4);
    cursor += p.sectors;
  }

  let tsTable = Buffer.alloc(SECTOR);
  try {
    const sidecar = await readFile(join(regionDir, TS_SIDECAR));
    if (sidecar.length === SECTOR) tsTable = sidecar;
  } catch { /* missing sidecar — zeros are fine */ }

  await mkdir(dirname(outMcaPath), { recursive: true });
  await writeFile(outMcaPath, Buffer.concat([locTable, tsTable, ...packed.map(p => p.data)]));
  return packed.length;
}

async function isRegionDir(dir: string): Promise<boolean> {
  try {
    return (await readdir(dir)).some(f => NBT_RE.test(f));
  } catch { return false; }
}

async function repackTree(srcDir: string, srcRoot: string, dstRoot: string): Promise<{ regions: number; chunks: number }> {
  if (await isRegionDir(srcDir)) {
    const rel = relative(srcRoot, srcDir);
    const outMca = join(dstRoot, rel + ".mca");
    const c = await repackRegion(srcDir, outMca);
    return { regions: 1, chunks: c };
  }

  let regions = 0, chunks = 0;
  for (const e of await readdir(srcDir, { withFileTypes: true })) {
    if (e.name === MANIFEST_NAME) continue;
    const p = join(srcDir, e.name);
    if (e.isDirectory()) {
      const sub = await repackTree(p, srcRoot, dstRoot);
      regions += sub.regions; chunks += sub.chunks;
    } else {
      const target = join(dstRoot, relative(srcRoot, p));
      await mkdir(dirname(target), { recursive: true });
      await copyFile(p, target);
    }
  }
  return { regions, chunks };
}

async function cmdRepack(src: string, dst: string) {
  const { regions, chunks } = await repackTree(src, src, dst);
  console.log(`repack done: ${regions} regions, ${chunks} chunks → ${dst}`);
}

// ---------- verify ----------

async function cmdVerify(explodedDir: string) {
  const manifest = JSON.parse(await readFile(join(explodedDir, MANIFEST_NAME), "utf8")) as Manifest;
  const total = Object.keys(manifest.chunks).length;
  let ok = 0;
  const missing: string[] = [];
  const mismatch: string[] = [];

  for (const [rel, { sha256: expected }] of Object.entries(manifest.chunks)) {
    let buf: Buffer;
    try { buf = await readFile(join(explodedDir, rel)); }
    catch { missing.push(rel); continue; }
    if (sha256(buf) === expected) ok++; else mismatch.push(rel);
  }

  console.log(`verify: ${ok}/${total} ok, ${missing.length} missing, ${mismatch.length} mismatched`);
  if (missing.length) console.log("  first missing:", missing.slice(0, 3));
  if (mismatch.length) console.log("  first mismatched:", mismatch.slice(0, 3));
  if (missing.length || mismatch.length) process.exit(1);
}

// ---------- cli ----------

function usage(): never {
  console.error("usage: mca-tool <explode|repack|verify> ...");
  console.error("  explode <src_world>     <dst_dir>");
  console.error("  repack  <src_exploded>  <dst_world>");
  console.error("  verify  <exploded_dir>");
  process.exit(1);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "explode" && args.length === 2) await cmdExplode(args[0]!, args[1]!);
else if (cmd === "repack" && args.length === 2) await cmdRepack(args[0]!, args[1]!);
else if (cmd === "verify" && args.length === 1) await cmdVerify(args[0]!);
else usage();
