import { createOffscreenCanvas } from './offscreen.js';
import { layoutText, inkJitter, prng } from '../domain/handout-text-layout.js';

function getFontFallback(inkStyle) {
  if (inkStyle === 'typewriter') return '"Courier New", "Liberation Mono", monospace';
  if (inkStyle === 'handwriting') return '"Segoe Print", "Bradley Hand", "Comic Neue", "Comic Sans MS", "URW Chancery L", cursive';
  return 'Georgia, "DejaVu Serif", serif';
}

function getFontString(font, px, inkStyle) {
  const italic = font?.italic ? 'italic ' : '';
  const weight = font?.weight || 400;
  const family = font?.family || 'IM Fell English';
  const fallback = getFontFallback(inkStyle);
  return `${italic}${weight} ${px}px "${family}", ${fallback}`;
}

const textLayoutCache = new Map();
const MAX_TEXT_LAYOUT_CACHE = 256;

export function clearTextLayoutCache() {
  textLayoutCache.clear();
}

/**
 * Renders a text layer with typography layout, alignments, letter-spacing and ink styles.
 * Memorizes computed text line-wrapping layouts by (content, font, box, etc.) so moving
 * a layer avoids recomputing line wraps.
 */
export function drawTextLayer(ctx, layer, scale = 1) {
  const txt = layer.text;
  if (!txt || !txt.content || String(txt.content).trim() === '') {
    return;
  }

  const ink = {
    style: 'clean',
    wear: 0,
    seed: 1,
    ...(txt.ink || {}),
  };

  const fontKey = `${txt.font?.family || 'IM Fell English'}:${txt.font?.weight || 400}:${txt.font?.italic ? 'i' : 'n'}:${ink.style}`;
  const layoutKey = `${txt.content}::${fontKey}::${Math.round(layer.width)}::${Math.round(layer.height)}::${txt.size || 16}::${txt.lineHeight ?? 1.25}::${txt.letterSpacing ?? 0}::${txt.align || 'left'}::${txt.valign || 'top'}::${txt.box || 'area'}::${txt.fit || 'overflow'}`;

  let layout = textLayoutCache.get(layoutKey);
  if (!layout) {
    const measure = (t, px) => {
      ctx.font = getFontString(txt.font, px, ink.style);
      return ctx.measureText(t).width;
    };

    layout = layoutText(txt.content, {
      measure,
      width: layer.width,
      height: layer.height,
      size: txt.size || 16,
      lineHeight: txt.lineHeight ?? 1.25,
      letterSpacing: txt.letterSpacing ?? 0,
      align: txt.align || 'left',
      valign: txt.valign || 'top',
      box: txt.box || 'area',
      fit: txt.fit || 'overflow',
      minSize: (txt.size || 16) * 0.4,
    });

    if (textLayoutCache.size >= MAX_TEXT_LAYOUT_CACHE) {
      const firstKey = textLayoutCache.keys().next().value;
      textLayoutCache.delete(firstKey);
    }
    textLayoutCache.set(layoutKey, layout);
  }

  if (!layout.lines.length) {
    return;
  }

  const w = layer.width * scale;
  const h = layer.height * scale;
  const canvasFontSize = layout.size * scale;
  const isStampWithWear = ink.style === 'stamp' && ink.wear > 0;

  let drawCtx = ctx;
  let tempCanvas = null;
  let startX = -w / 2;
  let startY = -h / 2;

  if (isStampWithWear) {
    const cw = Math.max(1, Math.ceil(w));
    const ch = Math.max(1, Math.ceil(Math.max(h, layout.height * scale)));
    tempCanvas = createOffscreenCanvas(cw, ch);
    if (tempCanvas) {
      drawCtx = tempCanvas.getContext('2d');
      startX = 0;
      startY = 0;
    }
  }

  drawCtx.save();
  if (txt.box === 'area') {
    drawCtx.beginPath();
    drawCtx.rect(startX, startY, w, h);
    drawCtx.clip();
  }
  drawCtx.font = getFontString(txt.font, canvasFontSize, ink.style);

  // Highlight: one band behind each line of text, before the ink.
  if (txt.highlight) {
    const pad = (txt.highlight.padding || 0) * scale;
    drawCtx.save();
    drawCtx.globalAlpha = drawCtx.globalAlpha * (txt.highlight.opacity ?? 0.6);
    drawCtx.fillStyle = txt.highlight.color;
    for (const line of layout.lines) {
      if (!line.text || !line.text.trim()) continue;
      const lineY = startY + line.y * scale;
      const lineW = (line.width ?? 0) * scale;
      drawCtx.fillRect(
        startX + line.x * scale - pad,
        lineY - canvasFontSize * 0.85 - pad,
        lineW + pad * 2,
        canvasFontSize * 1.1 + pad * 2
      );
    }
    drawCtx.restore();
  }

  drawCtx.fillStyle = txt.color || '#1d1b24';
  drawCtx.textBaseline = 'alphabetic';
  drawCtx.textAlign = 'left';

  const isFastPath = ink.style === 'clean' && (txt.letterSpacing || 0) === 0;

  if (isFastPath) {
    for (const line of layout.lines) {
      const lineY = startY + line.y * scale;
      if (txt.align === 'justify' && line.width === layer.width && line.words.length > 1) {
        for (const word of line.words) {
          drawCtx.fillText(word.text, startX + word.x * scale, lineY);
        }
      } else {
        drawCtx.fillText(line.text, startX + line.x * scale, lineY);
      }
    }
  } else {
    let glyphIndex = 0;
    const extraSpace = (canvasFontSize * (txt.letterSpacing || 0)) / 1000;
    const baseAlpha = drawCtx.globalAlpha;

    for (const line of layout.lines) {
      const lineY = startY + line.y * scale;
      for (const word of line.words) {
        let curX = startX + word.x * scale;
        for (const char of word.text) {
          const charW = drawCtx.measureText(char).width;
          if (ink.style === 'clean') {
            drawCtx.fillText(char, curX, lineY);
          } else {
            const jitter = inkJitter(ink.style, {
              seed: ink.seed,
              index: glyphIndex,
              size: canvasFontSize,
              wear: ink.wear,
            });

            drawCtx.save();
            const gx = curX + jitter.dx;
            const gy = lineY + jitter.dy;
            drawCtx.translate(gx, gy);
            if (jitter.rotate) drawCtx.rotate(jitter.rotate);
            if (jitter.scale !== 1) drawCtx.scale(jitter.scale, jitter.scale);
            drawCtx.globalAlpha = baseAlpha * jitter.alpha;
            drawCtx.fillText(char, 0, 0);

            if (jitter.ghost) {
              drawCtx.save();
              drawCtx.globalAlpha = baseAlpha * jitter.ghost.alpha;
              drawCtx.fillText(char, jitter.ghost.dx, jitter.ghost.dy);
              drawCtx.restore();
            }
            drawCtx.restore();
          }
          curX += charW + extraSpace;
          glyphIndex++;
        }
      }
    }
  }

  drawCtx.restore();

  if (tempCanvas) {
    // Stamp erosion with destination-out
    const cw = tempCanvas.width;
    const ch = tempCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.save();
    tempCtx.globalCompositeOperation = 'destination-out';
    tempCtx.fillStyle = '#000000';

    const numDots = Math.round(cw * ch * 0.003 * ink.wear);
    for (let i = 0; i < numDots; i++) {
      const rx = prng(ink.seed, i, 11) * cw;
      const ry = prng(ink.seed, i, 22) * ch;
      const rsize = 1 + Math.floor(prng(ink.seed, i, 33) * 2.5);
      const ralpha = 0.4 + prng(ink.seed, i, 44) * 0.6;
      tempCtx.globalAlpha = ralpha;
      tempCtx.fillRect(rx, ry, rsize, rsize);
    }
    tempCtx.restore();

    ctx.drawImage(tempCanvas, -w / 2, -h / 2);
  }
}
