import { canvasOperation } from '../domain/handouts.js';
import { cssFilter, applyAdjustPixels } from '../domain/handout-pixels.js';
import { drawTextLayer } from './handout-text.js';

export const visibleIn = (layer, light) => layer.visible && (layer.light === 'both' || layer.light === light);

/**
 * Groups layers into clipping groups based on visibility in the given light.
 * The first visible layer is always a base even if layer.clip is true.
 */
export function clipGroups(layers, light = 'normal') {
  const visible = layers.filter(l => visibleIn(l, light));
  const groups = [];
  let currentGroup = null;

  for (const layer of visible) {
    if (!currentGroup || !layer.clip) {
      currentGroup = { base: layer, clipped: [] };
      groups.push(currentGroup);
    } else {
      currentGroup.clipped.push(layer);
    }
  }
  return groups;
}

/**
 * Returns center coordinates, rotation in radians, and flip factors for a layer.
 */
export function layerMatrix(layer, scale = 1) {
  const w = layer.width * scale;
  const h = layer.height * scale;
  const cx = layer.x * scale + w / 2;
  const cy = layer.y * scale + h / 2;
  const rotation = ((layer.rotation || 0) * Math.PI) / 180;
  const flipX = layer.kind === 'image' && layer.image?.flipX ? -1 : 1;
  const flipY = layer.kind === 'image' && layer.image?.flipY ? -1 : 1;

  return {
    translate: [cx, cy],
    rotation,
    flip: [flipX, flipY],
  };
}

/**
 * Computes source and destination rectangles for drawImage inside a centered box (-w/2..w/2, -h/2..h/2).
 */
export function fitRect(imageWidth, imageHeight, box, fit = 'stretch', crop = null) {
  let sx = 0;
  let sy = 0;
  let sw = imageWidth;
  let sh = imageHeight;

  if (crop && typeof crop === 'object') {
    const cx = Math.max(0, Math.min(1, crop.x || 0));
    const cy = Math.max(0, Math.min(1, crop.y || 0));
    const cw = Math.max(0, Math.min(1 - cx, crop.width || 1));
    const ch = Math.max(0, Math.min(1 - cy, crop.height || 1));
    sx = cx * imageWidth;
    sy = cy * imageHeight;
    sw = cw * imageWidth;
    sh = ch * imageHeight;
  }

  const bw = box.width;
  const bh = box.height;

  if (fit === 'stretch' || sw === 0 || sh === 0) {
    return {
      sx,
      sy,
      sw,
      sh,
      dx: -bw / 2,
      dy: -bh / 2,
      dw: bw,
      dh: bh,
    };
  }

  if (fit === 'contain') {
    const s = Math.min(bw / sw, bh / sh);
    const dw = sw * s;
    const dh = sh * s;
    return {
      sx,
      sy,
      sw,
      sh,
      dx: -dw / 2,
      dy: -dh / 2,
      dw,
      dh,
    };
  }

  if (fit === 'cover') {
    const boxAspect = bw / bh;
    const srcAspect = sw / sh;

    if (srcAspect > boxAspect) {
      // Source is wider than box: crop excess width centered
      const neededW = sh * boxAspect;
      const excess = sw - neededW;
      return {
        sx: sx + excess / 2,
        sy,
        sw: neededW,
        sh,
        dx: -bw / 2,
        dy: -bh / 2,
        dw: bw,
        dh: bh,
      };
    } else {
      // Source is taller than box: crop excess height centered
      const neededH = sw / boxAspect;
      const excess = sh - neededH;
      return {
        sx,
        sy: sy + excess / 2,
        sw,
        sh: neededH,
        dx: -bw / 2,
        dy: -bh / 2,
        dw: bw,
        dh: bh,
      };
    }
  }

  return { sx, sy, sw, sh, dx: -bw / 2, dy: -bh / 2, dw: bw, dh: bh };
}

function createPageCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

function drawCheckerboard(ctx, w, h, scale) {
  const cellSize = Math.max(8, 16 * scale);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  ctx.clip();
  for (let y = -h / 2; y < h / 2; y += cellSize) {
    for (let x = -w / 2; x < w / 2; x += cellSize) {
      const isEven = (Math.floor((x + w / 2) / cellSize) + Math.floor((y + h / 2) / cellSize)) % 2 === 0;
      ctx.fillStyle = isEven ? '#808080' : '#969696';
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
  ctx.restore();
}

function drawLayer(ctx, layer, scale, loadedImages, missing, warnings) {
  if (layer.kind === 'effect') {
    warnings.push(`effect pendente: ${layer.effect?.type || 'desconhecido'}`);
    return;
  }

  if (layer.kind === 'adjust') {
    // Adjust layers are handled at the canvas/group composition level
    return;
  }

  const { translate, rotation, flip } = layerMatrix(layer, scale);
  const w = layer.width * scale;
  const h = layer.height * scale;

  ctx.save();
  ctx.translate(translate[0], translate[1]);
  ctx.rotate(rotation);
  ctx.scale(flip[0], flip[1]);

  if (layer.kind === 'shape') {
    ctx.save();
    if (layer.shape.dash && layer.shape.dash.length > 0) {
      ctx.setLineDash(layer.shape.dash.map(d => d * scale));
    }
    ctx.lineWidth = (layer.shape.strokeWidth ?? 2) * scale;

    const type = layer.shape.type;
    ctx.beginPath();
    if (type === 'rect') {
      const r = (layer.shape.radius || 0) * scale;
      if (typeof ctx.roundRect === 'function' && r > 0) {
        ctx.roundRect(-w / 2, -h / 2, w, h, r);
      } else {
        ctx.rect(-w / 2, -h / 2, w, h);
      }
      if (layer.shape.fill) {
        ctx.fillStyle = layer.shape.fill;
        ctx.fill();
      }
      if (layer.shape.stroke && (layer.shape.strokeWidth ?? 0) > 0) {
        ctx.strokeStyle = layer.shape.stroke;
        ctx.stroke();
      }
    } else if (type === 'ellipse') {
      ctx.ellipse(0, 0, Math.max(0, w / 2), Math.max(0, h / 2), 0, 0, Math.PI * 2);
      if (layer.shape.fill) {
        ctx.fillStyle = layer.shape.fill;
        ctx.fill();
      }
      if (layer.shape.stroke && (layer.shape.strokeWidth ?? 0) > 0) {
        ctx.strokeStyle = layer.shape.stroke;
        ctx.stroke();
      }
    } else if (type === 'line') {
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(w / 2, 0);
      if (layer.shape.stroke && (layer.shape.strokeWidth ?? 0) > 0) {
        ctx.strokeStyle = layer.shape.stroke;
        ctx.stroke();
      }
    }
    ctx.restore();
  } else if (layer.kind === 'image') {
    const key = layer.image?.src
      ? (layer.image.src.library ? `library:${layer.image.src.library}` : layer.image.src.upload ? `upload:${layer.image.src.upload}` : null)
      : null;
    const img = key ? loadedImages.get(key) : null;

    if (img) {
      const filterStr = cssFilter(layer.image.filter, scale);
      ctx.save();
      if (filterStr && 'filter' in ctx) {
        ctx.filter = filterStr;
      }
      const rect = fitRect(img.width, img.height, { width: w, height: h }, layer.image.fit, layer.image.crop);
      ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, rect.dx, rect.dy, rect.dw, rect.dh);
      ctx.restore();

      if (layer.image.tint && layer.image.tint.amount > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = layer.image.tint.amount;
        ctx.fillStyle = layer.image.tint.color;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      }
    } else {
      if (layer.image?.src) {
        missing.push(layer.image.src);
      }
      drawCheckerboard(ctx, w, h, scale);
    }
  } else if (layer.kind === 'text') {
    drawTextLayer(ctx, layer, scale);
  }

  ctx.restore();
}

function applyAdjustment(sourceCanvas, targetCtx, adjust, scale, opacity = 1) {
  const pw = sourceCanvas.width;
  const ph = sourceCanvas.height;

  targetCtx.save();
  targetCtx.globalAlpha = opacity;
  targetCtx.globalCompositeOperation = 'source-over';

  if (adjust.curve && Array.isArray(adjust.curve) && adjust.curve.length >= 2) {
    const sCtx = sourceCanvas.getContext('2d');
    const imgData = sCtx.getImageData(0, 0, pw, ph);
    applyAdjustPixels(imgData.data, adjust);
    targetCtx.putImageData(imgData, 0, 0);
  } else {
    const filterStr = cssFilter(adjust, scale);
    if (filterStr && 'filter' in targetCtx) {
      targetCtx.filter = filterStr;
    }
    targetCtx.drawImage(sourceCanvas, 0, 0);
  }

  targetCtx.restore();
}

/**
 * Draws a handout on canvas, resized to page × scale.
 */
export async function renderHandout(
  canvas,
  handout,
  { scale = 1, light = 'normal', loadImage, loadFont = async () => {} } = {}
) {
  const missing = [];
  const warnings = [];

  const pw = Math.round(handout.page.width * scale);
  const ph = Math.round(handout.page.height * scale);

  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, pw, ph);

  if (handout.page.background && handout.page.background !== '#00000000') {
    ctx.fillStyle = handout.page.background;
    ctx.fillRect(0, 0, pw, ph);
  }

  // Preload visible images and fonts in parallel
  const loadedImages = new Map();
  const imagePromises = [];
  const fontPromises = [];

  for (const layer of handout.layers) {
    if (!visibleIn(layer, light)) continue;
    if (layer.kind === 'image' && layer.image?.src && loadImage) {
      const src = layer.image.src;
      const key = src.library ? `library:${src.library}` : src.upload ? `upload:${src.upload}` : null;
      if (key && !loadedImages.has(key)) {
        loadedImages.set(key, null);
        imagePromises.push(
          Promise.resolve(loadImage(src)).then(img => {
            if (img) loadedImages.set(key, img);
          })
        );
      }
    }
    if (layer.kind === 'text' && layer.text?.font && loadFont) {
      fontPromises.push(Promise.resolve(loadFont(layer.text.font)));
    }
  }

  await Promise.all([...imagePromises, ...fontPromises]);

  // Composition with clipping groups
  const groups = clipGroups(handout.layers, light);

  let groupCanvas = null;
  let baseCanvas = null;
  let tempCanvas = null;

  const needsBuffers = groups.some(g => g.clipped.length > 0 || g.base.kind === 'adjust');
  if (needsBuffers) {
    groupCanvas = createPageCanvas(pw, ph);
    baseCanvas = createPageCanvas(pw, ph);
    tempCanvas = createPageCanvas(pw, ph);
  }

  const groupCtx = groupCanvas?.getContext('2d');
  const baseCtx = baseCanvas?.getContext('2d');
  const tempCtx = tempCanvas?.getContext('2d');

  for (const group of groups) {
    const { base, clipped } = group;

    // Full-page adjust without clip
    if (base.kind === 'adjust' && clipped.length === 0) {
      tempCtx.setTransform(1, 0, 0, 1, 0, 0);
      tempCtx.clearRect(0, 0, pw, ph);
      tempCtx.drawImage(canvas, 0, 0);

      applyAdjustment(tempCanvas, ctx, base.adjust, scale, base.opacity);
      continue;
    }

    // Simple layer without clipping
    if (clipped.length === 0) {
      ctx.save();
      ctx.globalAlpha = base.opacity;
      ctx.globalCompositeOperation = canvasOperation(base.blend);
      drawLayer(ctx, base, scale, loadedImages, missing, warnings);
      ctx.restore();
      continue;
    }

    // Layer with clipping group
    groupCtx.setTransform(1, 0, 0, 1, 0, 0);
    groupCtx.clearRect(0, 0, pw, ph);

    baseCtx.setTransform(1, 0, 0, 1, 0, 0);
    baseCtx.clearRect(0, 0, pw, ph);

    // 1. Draw base layer into groupCanvas and baseCanvas
    drawLayer(groupCtx, base, scale, loadedImages, missing, warnings);
    baseCtx.drawImage(groupCanvas, 0, 0);

    // 2. Draw each clipped layer
    for (const clippedLayer of clipped) {
      tempCtx.setTransform(1, 0, 0, 1, 0, 0);
      tempCtx.clearRect(0, 0, pw, ph);

      if (clippedLayer.kind === 'adjust') {
        // Adjust clipped: applies to groupCanvas, clipped by baseCanvas alpha
        tempCtx.drawImage(groupCanvas, 0, 0);
        const adjCanvas = createPageCanvas(pw, ph);
        const adjCtx = adjCanvas.getContext('2d');
        applyAdjustment(tempCanvas, adjCtx, clippedLayer.adjust, scale, 1);

        // Mask with base alpha
        adjCtx.globalCompositeOperation = 'destination-in';
        adjCtx.drawImage(baseCanvas, 0, 0);

        // Blend onto group
        groupCtx.save();
        groupCtx.globalAlpha = clippedLayer.opacity;
        groupCtx.globalCompositeOperation = 'source-over';
        groupCtx.drawImage(adjCanvas, 0, 0);
        groupCtx.restore();
      } else {
        drawLayer(tempCtx, clippedLayer, scale, loadedImages, missing, warnings);

        // Clip by base alpha
        tempCtx.save();
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(baseCanvas, 0, 0);
        tempCtx.restore();

        // Blend onto group
        groupCtx.save();
        groupCtx.globalAlpha = clippedLayer.opacity;
        groupCtx.globalCompositeOperation = canvasOperation(clippedLayer.blend);
        groupCtx.drawImage(tempCanvas, 0, 0);
        groupCtx.restore();
      }
    }

    // 3. Composite groupCanvas onto main canvas with base's opacity and blend
    ctx.save();
    ctx.globalAlpha = base.opacity;
    ctx.globalCompositeOperation = canvasOperation(base.blend);
    ctx.drawImage(groupCanvas, 0, 0);
    ctx.restore();
  }

  return {
    canvas,
    missing,
    warnings,
  };
}

