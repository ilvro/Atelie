/**
 * Folha de amostras da C4: cada receita de envelhecimento e cada silhueta sobre o mesmo papel e o mesmo
 * texto. Serve para conferir a calibragem a olho.   node scripts/colecao/amostra-envelhecimento.js
 * Saída: docs/referencias/colecao-envelhecimento.png
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { createApp } from '../../server/app.js';
import { buildHandoutFromSpec } from './templates.js';
import { AGING_PRESETS, aging, silhouette, SILHOUETTES, paper } from './kit.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const page = { width: 620, height: 877 };

function sample(slug, title, extra) {
  const text = {
    kind: 'text', name: 'Texto', x: 50, y: 70, width: 520, height: 700,
    text: { content: 'Relatório de ocorrência\n\nNa noite de 14 de março o vigia relatou ruídos vindos do porão do Solar dos Pinhais. A porta estava trancada por dentro e a chave, sobre a mesa.', font: { family: 'Courier Prime', library: null, weight: 400, italic: false }, size: 22, color: '#1b1b1b', lineHeight: 1.3 },
  };
  return buildHandoutFromSpec({ slug, name: title, category: 'Amostra', page: { ...page, background: '#00000000' }, layers: [paper('casa-papel-oficio-creme-novo', page), ...extra, text], fields: [] });
}

const samples = [
  ...Object.keys(AGING_PRESETS).map(k => [`receita-${k}`, k, aging(k, { seed: 4, page })]),
  ...SILHOUETTES.map(k => [`silhueta-${k}`, k, [silhouette(k, { seed: 4, page })]]),
];

const app = await createApp();
const server = app.listen(0);
await new Promise(r => server.once('listening', r));
const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox'] });
try {
  const tab = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await tab.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);
  await tab.waitForFunction(() => !!window.__atelie?.renderHandout);
  const cells = [];
  for (const [slug, label, layers] of samples) {
    const doc = sample(slug, label, layers);
    const url = await tab.evaluate(async d => (await window.__atelie.renderHandout(d, { scale: 0.5, light: 'normal' })).canvas.toDataURL('image/png'), doc);
    cells.push({ label, png: Buffer.from(url.split(',')[1], 'base64') });
  }
  const W = 310, H = 440, cols = 4, rows = Math.ceil(cells.length / cols);
  const comps = [];
  for (const [i, c] of cells.entries()) {
    comps.push({ input: await sharp(c.png).resize(W - 10, H - 30, { fit: 'inside' }).toBuffer(), left: (i % cols) * W + 5, top: Math.floor(i / cols) * H + 5 });
    comps.push({ input: Buffer.from(`<svg width="${W}" height="24"><text x="8" y="17" font-family="sans-serif" font-size="14" fill="#eee">${c.label}</text></svg>`), left: (i % cols) * W, top: Math.floor(i / cols) * H + H - 26 });
  }
  const out = path.join(root, 'docs/referencias/colecao-envelhecimento.png');
  await sharp({ create: { width: cols * W, height: rows * H, channels: 3, background: '#3a3a3a' } }).composite(comps).png().toFile(out);
  console.log(out);
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
}
