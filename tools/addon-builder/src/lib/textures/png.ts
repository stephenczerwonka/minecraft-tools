/**
 * Minimal PNG decoder for color types 2 (RGB) and 6 (RGBA), bit depth 8,
 * non-interlaced. Throws on anything else — AI providers reliably return
 * one of those two types.
 */

import { inflateSync, deflateSync } from "node:zlib";

export type RGBA = readonly [r: number, g: number, b: number, a: number];

// ---------------------------------------------------------------------------
// Decoder
// ---------------------------------------------------------------------------

export interface DecodedPng {
  width: number;
  height: number;
  /** Row-major RGBA pixels, length = width * height. */
  pixels: RGBA[];
}

function u32(buf: Uint8Array, off: number): number {
  return (buf[off]! << 24 | buf[off + 1]! << 16 | buf[off + 2]! << 8 | buf[off + 3]!) >>> 0;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePng(data: Uint8Array): DecodedPng {
  const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (data[i] !== PNG_SIG[i]) throw new Error("Not a valid PNG");
  }

  let off = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let bitDepth = 0;
  const idatChunks: Uint8Array[] = [];

  while (off < data.length) {
    const length = u32(data, off); off += 4;
    const tag = String.fromCharCode(data[off]!, data[off + 1]!, data[off + 2]!, data[off + 3]!);
    off += 4;
    const chunkData = data.subarray(off, off + length); off += length;
    off += 4; // skip CRC

    if (tag === "IHDR") {
      width = u32(chunkData, 0);
      height = u32(chunkData, 4);
      bitDepth = chunkData[8]!;
      colorType = chunkData[9]!;
      const interlace = chunkData[12]!;
      if (bitDepth !== 8) throw new Error(`PNG bit depth ${bitDepth} not supported (need 8)`);
      if (colorType !== 2 && colorType !== 6) throw new Error(`PNG color type ${colorType} not supported (need 2=RGB or 6=RGBA)`);
      if (interlace !== 0) throw new Error("Interlaced PNG not supported");
    } else if (tag === "IDAT") {
      idatChunks.push(chunkData);
    } else if (tag === "IEND") {
      break;
    }
  }

  const bpp = colorType === 6 ? 4 : 3;
  const stride = 1 + width * bpp; // filter byte + row data

  const compressed = new Uint8Array(idatChunks.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  for (const chunk of idatChunks) { compressed.set(chunk, pos); pos += chunk.length; }

  const raw = inflateSync(compressed);

  const pixels: RGBA[] = new Array(width * height);
  const prev = new Uint8Array(width * bpp);

  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    const filter = raw[rowStart]!;
    const row = new Uint8Array(width * bpp);

    for (let x = 0; x < width * bpp; x++) {
      const byte = raw[rowStart + 1 + x]!;
      const a = x >= bpp ? row[x - bpp]! : 0;
      const b = prev[x]!;
      const c = x >= bpp ? prev[x - bpp]! : 0;

      let v: number;
      switch (filter) {
        case 0: v = byte; break;
        case 1: v = (byte + a) & 0xff; break;
        case 2: v = (byte + b) & 0xff; break;
        case 3: v = (byte + Math.floor((a + b) / 2)) & 0xff; break;
        case 4: v = (byte + paethPredictor(a, b, c)) & 0xff; break;
        default: throw new Error(`Unknown PNG filter ${filter}`);
      }
      row[x] = v;
    }

    prev.set(row);
    for (let x = 0; x < width; x++) {
      const i = x * bpp;
      pixels[y * width + x] = colorType === 6
        ? [row[i]!, row[i + 1]!, row[i + 2]!, row[i + 3]!]
        : [row[i]!, row[i + 1]!, row[i + 2]!, 255];
    }
  }

  return { width, height, pixels };
}

