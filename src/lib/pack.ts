import JSZip from "jszip";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

async function walk(root: string, sub = ""): Promise<string[]> {
  const entries = await readdir(join(root, sub), { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const rel = join(sub, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(root, rel)));
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out;
}

export interface ExtraFile {
  /** Path inside the archive, forward slashes. */
  path: string;
  data: Buffer | Uint8Array | string;
}

/**
 * Zip a directory tree into a buffer. Extra files are layered on top and win
 * on name collision — useful for injecting a generated manifest.json or a
 * bundled scripts/main.js without writing them to the source tree.
 */
export async function zipDirectory(
  sourceDir: string,
  extras: ExtraFile[] = [],
  skip: (relPath: string) => boolean = () => false,
): Promise<Buffer> {
  const zip = new JSZip();
  const files = await walk(sourceDir);
  for (const rel of files) {
    const archivePath = rel.split(/[\\/]/g).join("/");
    if (skip(archivePath)) continue;
    if (extras.some((e) => e.path === archivePath)) continue;
    const data = await readFile(join(sourceDir, rel));
    zip.file(archivePath, data, { date: new Date(0) });
  }
  for (const extra of extras) {
    zip.file(extra.path, extra.data, { date: new Date(0) });
  }
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/** Zip an in-memory set of files (used to bundle two .mcpack buffers into an .mcaddon). */
export async function zipFiles(files: ExtraFile[]): Promise<Buffer> {
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.path, f.data, { date: new Date(0) });
  }
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export async function writeOutput(path: string, data: Buffer): Promise<void> {
  const dir = path.slice(0, path.lastIndexOf("/"));
  if (dir) await mkdir(dir, { recursive: true });
  await writeFile(path, data);
}

export function relFromRepoRoot(absPath: string): string {
  return relative(process.cwd(), absPath);
}
