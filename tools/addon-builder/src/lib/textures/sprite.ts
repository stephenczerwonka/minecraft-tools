/**
 * Deterministic weapon sprite renderer.
 *
 * Layers are painted in order (later layers overwrite earlier ones).
 * Each layer is a geometric primitive with a gradient along its primary axis
 * and an optional glow fringe.
 *
 * Coordinates are in pixels at the target canvas `size` (typically 16 or 32).
 */

export type RGBA = readonly [r: number, g: number, b: number, a: number];

export interface ColorStop {
  /** 0 = start of the layer's primary axis, 1 = end. */
  t: number;
  color: RGBA;
}

// ---------------------------------------------------------------------------
// Layer types
// ---------------------------------------------------------------------------

export interface LineLayer {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Half-width in pixels. 0.5 = 1px wide centre line. */
  thickness: number;
  gradient: ColorStop[];
  /** Optional outer glow: semi-transparent pixels outside the solid edge. */
  glow?: { radius: number; color: RGBA };
}

export interface RectLayer {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  /** Gradient runs top→bottom (t=0 top, t=1 bottom). */
  gradient: ColorStop[];
}

export type Layer = LineLayer | RectLayer;

export interface SpriteConfig {
  /** Canvas side length in pixels (must be square). */
  size: number;
  layers: Layer[];
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

function lerpColor(a: RGBA, b: RGBA, t: number): RGBA {
  const c = 1 - t;
  return [
    Math.round(a[0] * c + b[0] * t),
    Math.round(a[1] * c + b[1] * t),
    Math.round(a[2] * c + b[2] * t),
    Math.round(a[3] * c + b[3] * t),
  ];
}

function sampleGradient(stops: ColorStop[], t: number): RGBA {
  if (stops.length === 0) return [0, 0, 0, 0];
  if (stops.length === 1) return stops[0]!.color;
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    if (clamped <= b.t) {
      const local = (clamped - a.t) / (b.t - a.t);
      return lerpColor(a.color, b.color, local);
    }
  }
  return stops[stops.length - 1]!.color;
}

function blendOver(dst: RGBA, src: RGBA): RGBA {
  const sa = src[3] / 255;
  const da = dst[3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA === 0) return [0, 0, 0, 0];
  return [
    Math.round((src[0] * sa + dst[0] * da * (1 - sa)) / outA),
    Math.round((src[1] * sa + dst[1] * da * (1 - sa)) / outA),
    Math.round((src[2] * sa + dst[2] * da * (1 - sa)) / outA),
    Math.round(outA * 255),
  ];
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

interface SegmentHit {
  dist: number;
  /** 0 = segment start, 1 = segment end. */
  t: number;
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): SegmentHit {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const d = Math.hypot(px - x1, py - y1);
    return { dist: d, t: 0 };
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  return { dist: Math.hypot(px - nx, py - ny), t };
}

function pointInRect(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
  return px >= x && px < x + w && py >= y && py < y + h;
}

// ---------------------------------------------------------------------------
// Rasteriser
// ---------------------------------------------------------------------------

function paintLayer(pixels: RGBA[], size: number, layer: Layer): void {
  if (layer.type === "line") {
    const { x1, y1, x2, y2, thickness, gradient, glow } = layer;
    const maxDist = thickness + (glow?.radius ?? 0) + 1;
    // Bounding box scan (with padding)
    const minX = Math.max(0, Math.floor(Math.min(x1, x2) - maxDist));
    const maxX = Math.min(size - 1, Math.ceil(Math.max(x1, x2) + maxDist));
    const minY = Math.max(0, Math.floor(Math.min(y1, y2) - maxDist));
    const maxY = Math.min(size - 1, Math.ceil(Math.max(y1, y2) + maxDist));

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const { dist, t } = distToSegment(px + 0.5, py + 0.5, x1, y1, x2, y2);
        const idx = py * size + px;

        if (dist <= thickness) {
          pixels[idx] = sampleGradient(gradient, t);
        } else if (glow && dist <= thickness + glow.radius) {
          const fade = 1 - (dist - thickness) / glow.radius;
          const glowColor: RGBA = [
            glow.color[0],
            glow.color[1],
            glow.color[2],
            Math.round(glow.color[3] * fade),
          ];
          pixels[idx] = blendOver(pixels[idx]!, glowColor);
        }
      }
    }
    return;
  }

  if (layer.type === "rect") {
    const { x, y, w, h, gradient } = layer;
    for (let py = y; py < y + h && py < size; py++) {
      const t = h > 1 ? (py - y) / (h - 1) : 0;
      const color = sampleGradient(gradient, t);
      for (let px = x; px < x + w && px < size; px++) {
        if (pointInRect(px, py, x, y, w, h)) {
          pixels[py * size + px] = color;
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// PNG encoder (pure TS, no deps)
// ---------------------------------------------------------------------------

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(tag: string, data: Uint8Array): Uint8Array {
  const tagBytes = new TextEncoder().encode(tag);
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(tagBytes, 4);
  out.set(data, 8);
  const crcBuf = new Uint8Array(4 + data.length);
  crcBuf.set(tagBytes);
  crcBuf.set(data, 4);
  view.setUint32(8 + data.length, crc32(crcBuf));
  return out;
}

function deflate(data: Uint8Array): Uint8Array {
  // Use Node's built-in zlib via Bun's compatibility layer.
  const { deflateSync } = require("node:zlib") as typeof import("node:zlib");
  return deflateSync(data, { level: 9 });
}

function concat(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

export function encodePng(pixels: RGBA[], size: number): Uint8Array {
  // IHDR
  const ihdr = new Uint8Array(13);
  const iv = new DataView(ihdr.buffer);
  iv.setUint32(0, size); iv.setUint32(4, size);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  // ihdr[10..12] = 0 (deflate, adaptive, non-interlaced)

  // Raw scanlines: 1 filter byte + 4 bytes/pixel
  const raw = new Uint8Array(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixels[y * size + x] ?? [0, 0, 0, 0];
      const off = y * (1 + size * 4) + 1 + x * 4;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = a;
    }
  }

  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  return concat(
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflate(raw)),
    pngChunk("IEND", new Uint8Array(0)),
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function renderSprite(config: SpriteConfig): Uint8Array {
  const { size, layers } = config;
  const pixels: RGBA[] = new Array(size * size).fill([0, 0, 0, 0] as RGBA);
  for (const layer of layers) {
    paintLayer(pixels, size, layer);
  }
  return encodePng(pixels, size);
}
