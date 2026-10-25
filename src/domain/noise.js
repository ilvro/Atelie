/**
 * Pure mathematical noise utilities for procedural texture generation:
 * mulberry32, valueNoise2D, fbm, worley2D, domainWarp.
 * 100% deterministic, no Math.random().
 */

export function mulberry32(seed) {
  let s = (Math.floor(seed) || 1) >>> 0;
  return function rand() {
    s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909);
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };
}

/**
 * 2D integer hash producing a deterministic float in [0, 1].
 */
export function hash2D(x, y, seed = 0) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

/**
 * Smooth value noise in 2D with smoothstep interpolation.
 * Returns a function (x, y) => float in [0, 1].
 */
export function valueNoise2D(seed = 0) {
  const s = Math.floor(seed) || 0;
  return function noise(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    // Smoothstep interpolation (3t^2 - 2t^3)
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);

    const n00 = hash2D(xi, yi, s);
    const n10 = hash2D(xi + 1, yi, s);
    const n01 = hash2D(xi, yi + 1, s);
    const n11 = hash2D(xi + 1, yi + 1, s);

    const nx0 = n00 * (1 - u) + n10 * u;
    const nx1 = n01 * (1 - u) + n11 * u;

    const val = nx0 * (1 - v) + nx1 * v;
    return Math.max(0, Math.min(1, val));
  };
}

/**
 * Fractal Brownian Motion combining multiple octaves of noise.
 * Returns float in [0, 1].
 */
export function fbm(noise, x, y, { octaves = 4, lacunarity = 2, gain = 0.5 } = {}) {
  let sum = 0;
  let amplitude = 1;
  let frequency = 1;
  let totalAmp = 0;

  for (let i = 0; i < octaves; i++) {
    sum += amplitude * noise(x * frequency, y * frequency);
    totalAmp += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }

  return Math.max(0, Math.min(1, sum / totalAmp));
}

/**
 * Worley / Cellular noise in 2D (distance to nearest random feature point in 3x3 neighbor cells).
 * Returns a function (x, y) => float distance in [0, 1].
 */
export function worley2D(seed = 0) {
  const s = Math.floor(seed) || 0;
  return function worley(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);

    let minDist = 2.0;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = xi + dx;
        const cy = yi + dy;

        // Jittered feature point in cell
        const px = cx + hash2D(cx, cy, s);
        const py = cy + hash2D(cx + 73, cy + 31, s);

        const dist = Math.hypot(x - px, y - py);
        if (dist < minDist) {
          minDist = dist;
        }
      }
    }

    // Normalizing maximum cell distance (~sqrt(2)) into [0, 1]
    return Math.max(0, Math.min(1, minDist / 1.41421356));
  };
}

/**
 * Domain warping: distorts the coordinates of noise using noise itself.
 * Returns float in [0, 1].
 */
export function domainWarp(noise, x, y, amount = 1) {
  const qx = (noise(x, y) - 0.5) * 2;
  const qy = (noise(x + 5.2, y + 1.3) - 0.5) * 2;
  return noise(x + qx * amount, y + qy * amount);
}

