/**
 * Geometry and Affine transformation helpers for PSD import (Etapa 23)
 * Pure functions to project smart objects, transform corners, and position text boxes in document space.
 */

/**
 * Converts smart object corners [x0,y0, x1,y1, x2,y2, x3,y3] to an affine matrix { a, b, c, d, e, f }.
 * If the quadrilateral is not a parallelogram (tolerance 0.5 px), returns { perspective: true }.
 * @param {number[]} corners
 * @param {number} width
 * @param {number} height
 * @returns {{ a: number, b: number, c: number, d: number, e: number, f: number } | { perspective: true }}
 */
export function cornersToAffine(corners, width, height) {
  if (!Array.isArray(corners) || corners.length < 8 || !width || !height) {
    return { perspective: true };
  }

  const [x0, y0, x1, y1, x2, y2, x3, y3] = corners;

  // Check if opposite vectors match (parallelogram test with 0.5 px tolerance)
  const vTopX = x1 - x0;
  const vTopY = y1 - y0;
  const vBotX = x2 - x3;
  const vBotY = y2 - y3;

  const vLeftX = x3 - x0;
  const vLeftY = y3 - y0;
  const vRightX = x2 - x1;
  const vRightY = y2 - y1;

  const isParallel =
    Math.abs(vTopX - vBotX) <= 0.5 &&
    Math.abs(vTopY - vBotY) <= 0.5 &&
    Math.abs(vLeftX - vRightX) <= 0.5 &&
    Math.abs(vLeftY - vRightY) <= 0.5;

  if (!isParallel) {
    return { perspective: true };
  }

  const a = (x1 - x0) / width;
  const b = (y1 - y0) / width;
  const c = (x3 - x0) / height;
  const d = (y3 - y0) / height;
  const e = x0;
  const f = y0;

  return { a, b, c, d, e, f };
}

/**
 * Applies an affine transformation matrix to point (x, y).
 * @param {{ a: number, b: number, c: number, d: number, e: number, f: number }} m
 * @param {number} x
 * @param {number} y
 * @returns {{ x: number, y: number }}
 */
export function applyAffine(m, x, y) {
  if (!m || m.perspective) return { x, y };
  return {
    x: m.a * x + m.c * y + m.e,
    y: m.b * x + m.d * y + m.f,
  };
}

/**
 * Multiplies two affine matrices m1 o m2.
 */
export function composeAffine(m1, m2) {
  if (!m1 || m1.perspective) return m2;
  if (!m2 || m2.perspective) return m1;

  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

/**
 * Computes bounding box and orientation of a text layer in document space.
 * @param {object} text
 * @param {{ a: number, b: number, c: number, d: number, e: number, f: number } | null} outer
 * @returns {{ x: number, y: number, width: number, height: number, rotation: number, scale: number }}
 */
export function textBoxInDocument(text, outer = null) {
  const shape = text.shape || text.shapeType || 'box';
  const size = text.size || text.style?.fontSize || 12;

  let l = 0;
  let t = 0;
  let r = 0;
  let b = 0;

  if (shape === 'box') {
    const box = text.box || text.boxBounds || [0, 0, 100, 20];
    l = box[0];
    t = box[1];
    r = box[2];
    b = box[3];
  } else {
    // 'point' text: estimated width based on longest line
    const content = text.content || text.text || '';
    const lines = content.split(/\r\n|\r|\n/);
    const maxLineLen = Math.max(...lines.map(line => line.length), 1);
    const estimatedWidth = maxLineLen * size * 0.55;
    l = 0;
    t = -size;
    r = estimatedWidth;
    b = size * 0.3;
  }

  const localWidth = Math.max(0, r - l);
  const localHeight = Math.max(0, b - t);

  const mArray = text.matrix || text.transform || [1, 0, 0, 1, 0, 0];
  const textMatrix = {
    a: mArray[0],
    b: mArray[1],
    c: mArray[2],
    d: mArray[3],
    e: mArray[4],
    f: mArray[5],
  };

  const finalMatrix = outer && !outer.perspective ? composeAffine(outer, textMatrix) : textMatrix;

  const pos = applyAffine(finalMatrix, l, t);
  const rotation = Math.atan2(finalMatrix.b, finalMatrix.a) * (180 / Math.PI);
  const scale = Math.sqrt(finalMatrix.a * finalMatrix.a + finalMatrix.b * finalMatrix.b);

  const width = localWidth * scale;
  const height = localHeight * scale;

  return {
    x: Math.round(pos.x * 10) / 10,
    y: Math.round(pos.y * 10) / 10,
    width: Math.round(width * 10) / 10,
    height: Math.round(height * 10) / 10,
    rotation: Math.round(rotation * 10) / 10,
    scale,
  };
}

