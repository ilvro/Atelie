import { canvasOperation, DEFAULT_PAGE_UV } from '../domain/handouts.js';
import { cssFilter, applyAdjustPixels } from '../domain/handout-pixels.js';
import { drawTextLayer } from './handout-text.js';
import { drawEffect, drawCutMask, getEffectCanvas } from './handout-effects.js';
import { drawPathShape } from './handout-path.js';

export const visibleIn = (layer, light) => layer.visible && (layer.light === 'both' || layer.light === light);

function groupLayers(visible) {
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
 * Groups layers into clipping groups based on visibility in the given light.
 * The first visible layer is always a base even if layer.clip is true.
 */
export function clipGroups(layers, light = 'normal') {
  if (light === 'uv') {
    const both = layers.filter(l => l.visible && l.light === 'both');
    const uv = layers.filter(l => l.visible && l.light === 'uv');
    return [...groupLayers(both), ...groupLayers(uv)];
  }
  const visible = layers.filter(l => visibleIn(l, light));
  return groupLayers(visible);
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

/**
 * What the editor stage shows in an empty photo box: a discreet frame with a hint, never the grey checkerboard.
 * Previews, bakes, exports, the reader and the Tabletop get nothing there (`emptyImage: 'none'`).
 */
export function drawEmptyImagePlaceholder(ctx, w, h, scale) {
  ctx.save();
  ctx.fillStyle = 'rgba(233, 223, 200, 0.08)';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.setLineDash([8 * scale, 6 * scale]);
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  ctx.strokeStyle = 'rgba(233, 223, 200, 0.45)';
  ctx.strokeRect(-w / 2 + ctx.lineWidth, -h / 2 + ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2);
  ctx.setLineDash([]);
  const size = Math.max(10, Math.min(w, h) * 0.12);
  ctx.strokeStyle = 'rgba(233, 223, 200, 0.7)';
  ctx.fillStyle = 'rgba(233, 223, 200, 0.7)';
  ctx.lineWidth = Math.max(1, size * 0.08);
  // photo icon: frame, sun and hill
  ctx.strokeRect(-size / 2, -size * 0.9, size, size * 0.75);
  ctx.beginPath();
  ctx.arc(-size * 0.2, -size * 0.65, size * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-size / 2, -size * 0.2);
  ctx.lineTo(-size * 0.1, -size * 0.5);
  ctx.lineTo(size * 0.15, -size * 0.3);
  ctx.lineTo(size * 0.5, -size * 0.55);
  ctx.stroke();
  ctx.font = `${Math.max(9, size * 0.32)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Solte uma foto aqui', 0, size * 0.1);
  ctx.restore();
}

export function isCutEffect(layer) {
  return layer?.kind === 'effect' && (layer.effect?.type === 'burn' || layer.effect?.type === 'tear' || layer.effect?.type === 'cut');
}

export function applyCutEffect(targetCtx, layer, pw, ph, scale) {
  if (!isCutEffect(layer)) return;
  const amt = Number(layer.effect?.amount ?? 0.5);
  if (amt <= 0) return;

  const w = Math.max(1, Math.round(layer.width * scale));
  const h = Math.max(1, Math.round(layer.height * scale));
  const { translate, rotation, flip } = layerMatrix(layer, scale);

  const boxCanvas = createPageCanvas(w, h);
  const boxCtx = boxCanvas.getContext('2d');
  drawCutMask(boxCtx, w, h, layer.effect, scale);

  const maskCanvas = createPageCanvas(pw, ph);
  const maskCtx = maskCanvas.getContext('2d');
  maskCtx.fillStyle = '#ffffff';
  maskCtx.fillRect(0, 0, pw, ph);

  maskCtx.save();
  maskCtx.translate(translate[0], translate[1]);
  maskCtx.rotate(rotation);
  maskCtx.scale(flip[0], flip[1]);
  maskCtx.clearRect(-w / 2, -h / 2, w, h);
  maskCtx.drawImage(boxCanvas, -w / 2, -h / 2);
  maskCtx.restore();

  targetCtx.save();
  targetCtx.globalCompositeOperation = 'destination-in';
  targetCtx.drawImage(maskCanvas, 0, 0);
  targetCtx.restore();
}

export function drawLayer(ctx, layer, scale, loadedImages = new Map(), missing = [], warnings = [], { emptyImage = 'none' } = {}) {
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

  if (layer.kind === 'effect') {
    const bw = Math.max(1, Math.round(w));
    const bh = Math.max(1, Math.round(h));
    const effCanvas = getEffectCanvas(bw, bh, layer.effect, scale);
    if (effCanvas) {
      ctx.drawImage(effCanvas, -bw / 2, -bh / 2, bw, bh);
    } else {
      const temp = createPageCanvas(bw, bh);
      drawEffect(temp.getContext('2d'), bw, bh, layer.effect, scale);
      ctx.drawImage(temp, -bw / 2, -bh / 2, bw, bh);
    }
  } else if (layer.kind === 'shape') {
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
    } else if (type === 'path') {
      drawPathShape(ctx, layer.shape, w, h, scale);
    }
    ctx.restore();
  } else if (layer.kind === 'image') {
    const key = layer.image?.src
      ? (layer.image.src.library ? `library:${layer.image.src.library}` : layer.image.src.upload ? `upload:${layer.image.src.upload}` : null)
      : null;
    const img = key ? loadedImages.get(key) : null;

    if (img) {
      const filterStr = cssFilter(layer.image.filter, scale);
      const rect = fitRect(img.width, img.height, { width: w, height: h }, layer.image.fit, layer.image.crop);

      if (layer.image.tint && layer.image.tint.amount > 0) {
        const dw = Math.max(1, Math.round(rect.dw));
        const dh = Math.max(1, Math.round(rect.dh));
        const imgCanvas = createPageCanvas(dw, dh);
        const imgCtx = imgCanvas.getContext('2d');

        if (filterStr && 'filter' in imgCtx) {
          imgCtx.filter = filterStr;
        }
        imgCtx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, dw, dh);

        imgCtx.save();
        imgCtx.globalCompositeOperation = 'source-atop';
        imgCtx.globalAlpha = layer.image.tint.amount;
        imgCtx.fillStyle = layer.image.tint.color;
        imgCtx.fillRect(0, 0, dw, dh);
        imgCtx.restore();

        ctx.drawImage(imgCanvas, rect.dx, rect.dy, rect.dw, rect.dh);
      } else {
        ctx.save();
        if (filterStr && 'filter' in ctx) {
          ctx.filter = filterStr;
        }
        ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, rect.dx, rect.dy, rect.dw, rect.dh);
        ctx.restore();
      }
    } else {
      if (layer.image?.src) {
        missing.push(layer.image.src);
      }
      if (emptyImage === 'placeholder') drawEmptyImagePlaceholder(ctx, w, h, scale);
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
 * Synchronous layer rendering onto canvas, assuming images/fonts are already loaded.
 */
export function renderHandoutSync(
  canvas,
  handout,
  { scale = 1, light = 'normal', loadedImages = new Map(), missing = [], warnings = [], emptyImage = 'none' } = {}
) {
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

  let groupCanvas = null;
  let baseCanvas = null;
  let tempCanvas = null;

  function ensureBuffers(groupList) {
    const needsBuffers = groupList.some(g => g.clipped.length > 0 || g.base.kind === 'adjust');
    if (needsBuffers && !groupCanvas) {
      groupCanvas = createPageCanvas(pw, ph);
      baseCanvas = createPageCanvas(pw, ph);
      tempCanvas = createPageCanvas(pw, ph);
    }
  }

  function renderGroupList(groups) {
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
        if (isCutEffect(base)) {
          applyCutEffect(ctx, base, pw, ph, scale);
        }
        ctx.save();
        ctx.globalAlpha = base.opacity;
        ctx.globalCompositeOperation = canvasOperation(base.blend);
        drawLayer(ctx, base, scale, loadedImages, missing, warnings, { emptyImage });
        ctx.restore();
        continue;
      }

      // Layer with clipping group
      groupCtx.setTransform(1, 0, 0, 1, 0, 0);
      groupCtx.clearRect(0, 0, pw, ph);

      baseCtx.setTransform(1, 0, 0, 1, 0, 0);
      baseCtx.clearRect(0, 0, pw, ph);

      // 1. Draw base layer into groupCanvas and baseCanvas
      if (isCutEffect(base)) {
        applyCutEffect(ctx, base, pw, ph, scale);
      }
      drawLayer(groupCtx, base, scale, loadedImages, missing, warnings, { emptyImage });
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
          if (isCutEffect(clippedLayer)) {
            applyCutEffect(groupCtx, clippedLayer, pw, ph, scale);
          }
          drawLayer(tempCtx, clippedLayer, scale, loadedImages, missing, warnings, { emptyImage });

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
  }

  if (light === 'uv') {
    const bothGroups = clipGroups(handout.layers.filter(l => l.visible && l.light === 'both'), 'both');
    const uvGroups = clipGroups(handout.layers.filter(l => l.visible && l.light === 'uv'), 'uv');

    ensureBuffers([...bothGroups, ...uvGroups]);

    // 1. Draw both layers in order (not normal, not uv)
    renderGroupList(bothGroups);

    // 2. Apply darkening: multiply with tint and globalAlpha = strength over entire page
    const { tint = DEFAULT_PAGE_UV.tint, strength = DEFAULT_PAGE_UV.strength } = handout.page?.uv ?? DEFAULT_PAGE_UV;
    if (strength > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = strength;
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, pw, ph);
      ctx.restore();
    }

    // 3. Draw uv layers in document order on top
    renderGroupList(uvGroups);
  } else {
    const groups = clipGroups(handout.layers, light);
    ensureBuffers(groups);
    renderGroupList(groups);
  }

  return {
    canvas,
    missing,
    warnings,
  };
}

/**
 * Draws a handout on canvas, resized to page × scale. Preloads images and fonts in parallel.
 */
export async function renderHandout(
  canvas,
  handout,
  { scale = 1, light = 'normal', loadImage, loadFont = async () => {}, loadedImages = new Map(), emptyImage = 'none' } = {}
) {
  const missing = [];
  const warnings = [];

  // Preload visible images and fonts in parallel. `loadedImages` may come from the
  // caller, which keeps it to redraw synchronously later (e.g. the stage drag cache).
  const requested = new Set();
  const imagePromises = [];
  const fontPromises = [];

  for (const layer of handout.layers) {
    if (!visibleIn(layer, light)) continue;
    if (layer.kind === 'image' && layer.image?.src && loadImage) {
      const src = layer.image.src;
      const key = src.library ? `library:${src.library}` : src.upload ? `upload:${src.upload}` : null;
      if (key && !requested.has(key) && !loadedImages.get(key)) {
        requested.add(key);
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

  return renderHandoutSync(canvas, handout, { scale, light, loadedImages, missing, warnings, emptyImage });
}

