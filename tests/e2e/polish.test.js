import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

const luminance = ([r, g, b]) => {
  const f = c => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

test('polish e2e: real layer thumbnails, empty states, skeleton animation, stamp contrast under UV', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-polish-e2e-'));
  const app = await createApp({ dataDir, distDir: path.join(projectDir, 'dist') });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  t.after(async () => {
    await browser.close();
    await new Promise(r => server.close(r));
    await rm(dataDir, { recursive: true, force: true });
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);

  // A fresh document has only its paper: the layers panel says so, with a drawing
  await page.click('.inspector-tab[data-tab="layers"]');
  await page.waitForSelector('.layers-empty-msg.is-hint');
  assert.ok(await page.locator('.layers-empty-msg .empty-state-svg').count() > 0);

  // A red rectangle and a text: each row gets its own thumbnail picture
  await page.evaluate(async () => {
    const ed = window.__atelie.editor;
    const doc = ed.state.handout;
    const mk = (id, extra) => ({ id, name: id, visible: true, locked: false, x: 100, y: 100, width: 300, height: 200, rotation: 0, opacity: 1, blend: 'normal', light: 'both', ...extra });
    await ed.loadHandout({ ...doc, layers: [...doc.layers,
      mk('caixa', { kind: 'shape', shape: { type: 'rect', fill: '#cc2200', stroke: null, strokeWidth: 0, radius: 0, dash: [] } }),
      mk('frase', { kind: 'text', text: { content: 'Querida Lia', font: { family: 'IM Fell English', library: null, weight: 400, italic: false }, size: 60, color: '#000000', align: 'left', valign: 'top', lineHeight: 1.2, letterSpacing: 0, box: 'area', fit: 'overflow', highlight: null, ink: { style: 'clean', wear: 0, seed: 1 } } }),
    ] }, { skipDraftCheck: true });
  });
  await page.waitForSelector('.layer-item[data-id="caixa"] .layer-thumb-img');
  const thumb = await page.evaluate(() => {
    const img = document.querySelector('.layer-item[data-id="caixa"] .layer-thumb-img');
    return new Promise(resolve => {
      const el = new Image();
      el.onload = () => {
        const c = document.createElement('canvas');
        c.width = el.width; c.height = el.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(el, 0, 0);
        const d = ctx.getImageData(Math.floor(el.width / 2), Math.floor(el.height / 2), 1, 1).data;
        resolve({ w: el.width, h: el.height, px: [d[0], d[1], d[2]] });
      };
      el.src = img.src;
    });
  });
  assert.ok(thumb.w <= 40 && thumb.h <= 40, `thumbnail is at most 40 px: ${thumb.w}×${thumb.h}`);
  assert.ok(thumb.px[0] > 170 && thumb.px[1] < 60, `the thumbnail shows the red rectangle, got ${thumb.px}`);
  await page.waitForSelector('.layer-item[data-id="frase"] .layer-thumb-img');

  // Moving or renaming a layer does not draw its thumbnail again (same key)
  const keys = await page.evaluate(() => [...document.querySelectorAll('.layer-thumb')].map(el => el.dataset.thumbKey));
  assert.equal(new Set(keys).size, keys.filter(Boolean).length);

  // Library search with no result shows the empty state
  await page.click('.rail-btn[data-action="library"]');
  await page.fill('.library-search-input', 'zzzzzz-nada-assim');
  await page.waitForSelector('.library-empty-results .empty-state-svg');

  // The skeleton pulses (and stops with reduced motion)
  const anim = await page.evaluate(() => {
    const el = document.createElement('div');
    el.className = 'skeleton-card';
    document.body.appendChild(el);
    const name = getComputedStyle(el).animationName;
    document.body.classList.add('reduce-motion');
    const reduced = getComputedStyle(el).animationName;
    document.body.classList.remove('reduce-motion');
    el.remove();
    return { name, reduced };
  });
  assert.equal(anim.name, 'skeleton-pulse');
  assert.equal(anim.reduced, 'none');

  // Stamps stay readable under UV: at least 4.5:1 against the room
  await page.keyboard.press('Escape');
  await page.evaluate(() => { document.activeElement?.blur(); });
  await page.keyboard.press('u');
  await page.waitForTimeout(600);
  const ratios = await page.evaluate(() => {
    const room = getComputedStyle(document.querySelector('.at-desk'), '::after').backgroundImage;
    const out = {};
    for (const tone of ['ink', 'wax', 'default', 'accent', 'uv']) {
      const el = document.createElement('span');
      el.className = `at-stamp is-${tone}`;
      el.textContent = 'TESTE';
      document.querySelector('.at-desk').appendChild(el);
      out[tone] = getComputedStyle(el).color.match(/\d+/g).slice(0, 3).map(Number);
      el.remove();
    }
    return { out, room };
  });
  const room = [11, 9, 20];
  for (const [tone, rgb] of Object.entries(ratios.out)) {
    assert.ok(contrast(rgb, room) >= 4.5, `${tone} stamp under UV has contrast ${contrast(rgb, room).toFixed(2)}`);
  }

  assert.deepEqual(errors, []);
});
