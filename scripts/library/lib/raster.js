/**
 * Raster & Buffer Utilities for PSD Composition (Etapa 24)
 * Provides Float32Array RGBA buffers (0–1 non-premultiplied), format conversions,
 * Sharp-based Lanczos3 downscaling, sub-region extraction, and PNG output.
 */
import sharp from 'sharp';

/**
 * Creates an empty Float32Array RGBA buffer initialized to zeros.
 * @param {number} width
 * @param {number} height
 * @returns {{ width: number, height: number, data: Float32Array }}
 */
export function createBuffer(width, height) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  return {
    width: w,
    height: h,
    data: new Float32Array(w * h * 4),
  };
}

/**
 * Clones a Float32Array RGBA buffer.
 */
export function cloneBuffer(buf) {
  return {
    width: buf.width,
    height: buf.height,
    data: new Float32Array(buf.data),
  };
}

/**
 * Converts ImageData or Uint8/Uint8Clamped RGBA buffer (0–255) to Float32Array RGBA (0–1).
 * @param {{ width: number, height: number, data: Uint8Array | Uint8ClampedArray }} imageData
 * @returns {{ width: number, height: number, data: Float32Array }}
 */
export function fromImageData(imageData) {
  const { width, height, data } = imageData;
  const out = createBuffer(width, height);
  const outData = out.data;
  const len = width * height * 4;
  const maxVal = data instanceof Uint16Array ? 65535 : 255;

  for (let i = 0; i < len; i += 4) {
    outData[i] = data[i] / maxVal;
    outData[i + 1] = data[i + 1] / maxVal;
    outData[i + 2] = data[i + 2] / maxVal;
    outData[i + 3] = data[i + 3] / maxVal;
  }

  return out;
}

/**
 * Converts Float32Array RGBA buffer (0–1) to Uint8ClampedArray (0–255).
 * @param {{ width: number, height: number, data: Float32Array }} buffer
 * @returns {Uint8ClampedArray}
 */
export function toUint8ClampedArray(buffer) {
  const { width, height, data } = buffer;
  const len = width * height * 4;
  const out = new Uint8ClampedArray(len);

  for (let i = 0; i < len; i += 4) {
    out[i] = Math.round(Math.max(0, Math.min(1, data[i])) * 255);
    out[i + 1] = Math.round(Math.max(0, Math.min(1, data[i + 1])) * 255);
    out[i + 2] = Math.round(Math.max(0, Math.min(1, data[i + 2])) * 255);
    out[i + 3] = Math.round(Math.max(0, Math.min(1, data[i + 3])) * 255);
  }

  return out;
}

/**
 * Resizes an RGBA buffer using Sharp (Lanczos3 downscaling).
 * Sharp automatically pre-multiplies alpha during resizing to avoid dark fringing.
 * @param {{ width: number, height: number, data: Float32Array }} buffer
 * @param {number} targetWidth
 * @param {number} targetHeight
 * @returns {Promise<{ width: number, height: number, data: Float32Array }>}
 */
export async function resizeBuffer(buffer, targetWidth, targetHeight) {
  const tw = Math.max(1, Math.round(targetWidth));
  const th = Math.max(1, Math.round(targetHeight));

  if (buffer.width === tw && buffer.height === th) {
    return cloneBuffer(buffer);
  }

  const u8Data = toUint8ClampedArray(buffer);
  const rawBytes = await sharp(u8Data, {
    raw: { width: buffer.width, height: buffer.height, channels: 4 },
  })
    .resize(tw, th, { kernel: 'lanczos3' })
    .raw()
    .toBuffer();

  return fromImageData({ width: tw, height: th, data: rawBytes });
}

/**
 * Resizes a 1-channel mask buffer (Float32Array 0–1) using Sharp.
 * @param {{ width: number, height: number, data: Float32Array }} mask
 * @param {number} targetWidth
 * @param {number} targetHeight
 * @returns {Promise<{ width: number, height: number, data: Float32Array }>}
 */
export async function resizeMask(mask, targetWidth, targetHeight) {
  const tw = Math.max(1, Math.round(targetWidth));
  const th = Math.max(1, Math.round(targetHeight));

  if (mask.width === tw && mask.height === th) {
    return { width: tw, height: th, data: new Float32Array(mask.data) };
  }

  const len = mask.width * mask.height;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8[i] = Math.round(Math.max(0, Math.min(1, mask.data[i])) * 255);
  }

  const rawBytes = await sharp(u8, {
    raw: { width: mask.width, height: mask.height, channels: 1 },
  })
    .resize(tw, th, { kernel: 'lanczos3' })
    .raw()
    .toBuffer();

  const outData = new Float32Array(tw * th);
  for (let i = 0; i < outData.length; i++) {
    outData[i] = rawBytes[i] / 255;
  }

  return { width: tw, height: th, data: outData };
}

/**
 * Encodes an RGBA buffer as PNG bytes.
 * @param {{ width: number, height: number, data: Float32Array }} buffer
 * @returns {Promise<Buffer>}
 */
export async function bufferToPng(buffer) {
  const u8 = toUint8ClampedArray(buffer);
  return sharp(u8, {
    raw: { width: buffer.width, height: buffer.height, channels: 4 },
  })
    .png()
    .toBuffer();
}
