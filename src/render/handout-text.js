import { wrapText } from '../domain/wrap.js';

/**
 * Minimal text renderer for Etapa 4. Replaced and expanded in Etapa 5.
 */
export function drawTextLayer(ctx, layer, scale = 1) {
  const txt = layer.text;
  if (!txt || !txt.content) return;

  const w = layer.width * scale;
  const h = layer.height * scale;
  const fontSize = (txt.size || 16) * scale;
  const lineHeight = txt.lineHeight || 1.25;
  const family = txt.font?.family || 'IM Fell English';
  const weight = txt.font?.weight || 400;
  const italic = txt.font?.italic ? 'italic ' : '';

  ctx.save();
  ctx.font = `${italic}${weight} ${fontSize}px "${family}", serif`;
  ctx.fillStyle = txt.color || '#1d1b24';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  let lines = [];
  if (txt.box === 'area') {
    const measure = str => ctx.measureText(str).width;
    const res = wrapText(txt.content, measure, w);
    lines = res.lines;
  } else {
    lines = String(txt.content).split('\n');
  }

  const startX = -w / 2;
  const startY = -h / 2;
  const stepY = fontSize * lineHeight;

  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * stepY;
    if (y + fontSize > h / 2 && txt.fit === 'overflow') {
      // In minimal mode, keep drawing or clipping
    }
    ctx.fillText(lines[i], startX, y);
  }

  ctx.restore();
}

