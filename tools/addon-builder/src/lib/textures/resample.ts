/**
 * Image resampling utilities.
 *
 * Two-stage downscale pipeline:
 *   lanczos3(src, 64)  →  64×64 (shape-preserving, operates in premultiplied alpha)
 *   boxAverage4x4(64×64) →  16×16 (blocky pixel snap)
 *
 * nearestUpscale is for preview generation (4× zoom).
 */

import type { RGBA } from "./png.ts";

// ---------------------------------------------------------------------------
// Lanczos-3 kernel
// ---------------------------------------------------------------------------

function sinc(x: number): number {
  if (x === 0) return 1;
  const px = Math.PI * x;
  return Math.sin(px) / px;
}

function lanczos(x: number, a = 3): number {
  if (x === 0) return 1;
  if (Math.abs(x) >= a) return 0;
  return sinc(x) * sinc(x / a);
}

function buildKernels(srcSize: number, dstSize: number, a = 3): { center: number; weights: number[] }[] {
  const scale = srcSize / dstSize;
  const radius = Math.ceil(a * scale);
  return Array.from({ length: dstSize }, (_, oi) => {
    const center = (oi + 0.5) * scale - 0.5;
    const lo = Math.floor(center - radius);
    const hi = Math.floor(center + radius);
    const weights: number[] = [];
    let sum = 0;
    for (let si = lo; si <= hi; si++) {
      const w = lanczos((si - center) / scale);
      weights.push(w);
      sum += w;
    }
    for (let i = 0; i < weights.length; i++) weights[i]! /= sum;
    return { center: lo, weights };
  });
}

// ---------------------------------------------------------------------------
// Premultiplied helpers
// ---------------------------------------------------------------------------

type PremulRow = Float32Array; // interleaved R G B A, premultiplied

function premultiply(pixels: RGBA[], w: number, h: number): Float32Array {
  const out = new Float32Array(w * h * 4);
  for (let i = 0; i < pixels.length; i++) {
    const [r, g, b, a] = pixels[i]!;
    const fa = a / 255;
    out[i * 4 + 0] = r * fa;
    out[i * 4 + 1] = g * fa;
    out[i * 4 + 2] = b * fa;
    out[i * 4 + 3] = a;
  }
  return out;
}

function unpremultiply(buf: Float32Array, count: number): RGBA[] {
  const out: RGBA[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const a = buf[i * 4 + 3]!;
    const fa = a > 0 ? 255 / a : 0;
    out[i] = [
      Math.round(Math.max(0, Math.min(255, buf[i * 4 + 0]! * fa))),
      Math.round(Math.max(0, Math.min(255, buf[i * 4 + 1]! * fa))),
      Math.round(Math.max(0, Math.min(255, buf[i * 4 + 2]! * fa))),
      Math.round(Math.max(0, Math.min(255, a))),
    ];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Lanczos-3 separable resample (square input/output assumed)
// ---------------------------------------------------------------------------

export function lanczos3(pixels: RGBA[], srcSize: number, dstSize: number): RGBA[] {
  const kernels = buildKernels(srcSize, dstSize);
  const pm = premultiply(pixels, srcSize, srcSize);

  // Horizontal pass: srcSize×srcSize → dstSize×srcSize
  const hBuf = new Float32Array(dstSize * srcSize * 4);
  for (let y = 0; y < srcSize; y++) {
    for (let ox = 0; ox < dstSize; ox++) {
      const { center, weights } = kernels[ox]!;
      let r = 0, g = 0, b = 0, a = 0;
      for (let ki = 0; ki < weights.length; ki++) {
        const sx = Math.max(0, Math.min(srcSize - 1, center + ki));
        const base = (y * srcSize + sx) * 4;
        const w = weights[ki]!;
        r += pm[base + 0]! * w;
        g += pm[base + 1]! * w;
        b += pm[base + 2]! * w;
        a += pm[base + 3]! * w;
      }
      const base = (y * dstSize + ox) * 4;
      hBuf[base + 0] = r; hBuf[base + 1] = g; hBuf[base + 2] = b; hBuf[base + 3] = a;
    }
  }

  // Vertical pass: dstSize×srcSize → dstSize×dstSize
  const vBuf = new Float32Array(dstSize * dstSize * 4);
  for (let oy = 0; oy < dstSize; oy++) {
    const { center, weights } = kernels[oy]!;
    for (let ox = 0; ox < dstSize; ox++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let ki = 0; ki < weights.length; ki++) {
        const sy = Math.max(0, Math.min(srcSize - 1, center + ki));
        const base = (sy * dstSize + ox) * 4;
        const w = weights[ki]!;
        r += hBuf[base + 0]! * w;
        g += hBuf[base + 1]! * w;
        b += hBuf[base + 2]! * w;
        a += hBuf[base + 3]! * w;
      }
      const base = (oy * dstSize + ox) * 4;
      vBuf[base + 0] = r; vBuf[base + 1] = g; vBuf[base + 2] = b; vBuf[base + 3] = a;
    }
  }

  return unpremultiply(vBuf, dstSize * dstSize);
}

// ---------------------------------------------------------------------------
// 4×4 box average (64×64 → 16×16)
// ---------------------------------------------------------------------------

export function boxAverage4x4(pixels: RGBA[], srcSize = 64, dstSize = 16): RGBA[] {
  const factor = srcSize / dstSize;
  const out: RGBA[] = new Array(dstSize * dstSize);
  for (let oy = 0; oy < dstSize; oy++) {
    for (let ox = 0; ox < dstSize; ox++) {
      let r = 0, g = 0, b = 0, a = 0;
      const count = factor * factor;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const sx = ox * factor + dx;
          const sy = oy * factor + dy;
          // premultiplied average
          const p = pixels[sy * srcSize + sx]!;
          const fa = p[3] / 255;
          r += p[0] * fa; g += p[1] * fa; b += p[2] * fa; a += p[3];
        }
      }
      a /= count;
      const fa = a > 0 ? 255 / a : 0;
      out[oy * dstSize + ox] = [
        Math.round(Math.max(0, Math.min(255, r / count * fa))),
        Math.round(Math.max(0, Math.min(255, g / count * fa))),
        Math.round(Math.max(0, Math.min(255, b / count * fa))),
        Math.round(Math.max(0, Math.min(255, a))),
      ];
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Nearest-neighbor upscale (for 4× preview)
// ---------------------------------------------------------------------------

export function nearestUpscale(pixels: RGBA[], srcSize: number, factor: number): RGBA[] {
  const dstSize = srcSize * factor;
  const out: RGBA[] = new Array(dstSize * dstSize);
  for (let oy = 0; oy < dstSize; oy++) {
    for (let ox = 0; ox < dstSize; ox++) {
      out[oy * dstSize + ox] = pixels[Math.floor(oy / factor) * srcSize + Math.floor(ox / factor)]!;
    }
  }
  return out;
}
