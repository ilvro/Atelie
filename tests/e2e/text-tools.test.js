import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('text tools e2e: mini-bar text controls, corner rotation, double-click text, Alt+click stack', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-texttools-e2e-'));
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

  // A text layer with a known look
  await page.evaluate(async () => {
    const ed = window.__atelie.editor;
    const doc = ed.createHandout({ name: 'Texto', preset: 'a4' });
    const txt = {
      id: 't1', name: 'Texto 1', kind: 'text', visible: true, locked: false, x: 200, y: 300, width: 600, height: 200,
      rotation: 0, opacity: 1, blend: 'normal', light: 'both',
      text: { content: 'Querida Lia', font: { family: 'IM Fell English', library: null, weight: 400, italic: false }, size: 40, color: '#1d1b24', align: 'left', valign: 'top', lineHeight: 1.25, letterSpacing: 0, box: 'area', fit: 'overflow', highlight: null, ink: { style: 'clean', wear: 0, seed: 1 } },
    };
    await ed.loadHandout({ ...doc, layers: [...doc.layers, txt] }, { skipDraftCheck: true });
    ed.state.select('t1');
  });
  await page.waitForSelector('.stage-selection-bar .sel-bar-text-row', { state: 'visible' });

  const layer = () => page.evaluate(() => window.__atelie.editor.state.handout.layers.find(l => l.id === 't1'));

  // Size, bold, italic, align, colour, highlight — all go through the history
  await page.fill('.sel-bar-size', '64');
  assert.equal((await layer()).text.size, 64);
  await page.click('.sel-bar-text-row [data-text="bold"]');
  assert.equal((await layer()).text.font.weight, 700);
  assert.equal((await layer()).text.font.family, 'IM Fell English', 'bold keeps the family');
  await page.click('.sel-bar-text-row [data-text="italic"]');
  assert.equal((await layer()).text.font.italic, true);
  await page.click('.sel-bar-text-row [data-text="align"][data-value="center"]');
  assert.equal((await layer()).text.align, 'center');
  await page.locator('.sel-bar-text-row [data-text="color"]').evaluate(el => { el.value = '#aa2200'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.equal((await layer()).text.color, '#aa2200');
  await page.locator('.sel-bar-text-row [data-text="highlight"]').evaluate(el => { el.value = '#ffee00'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.equal((await layer()).text.highlight.color, '#ffee00');
  assert.ok(await page.evaluate(() => window.__atelie.editor.state.canUndo));

  // Highlight shows up on the canvas behind the text (a yellow pixel inside the box)
  await page.evaluate(() => window.__atelie.editor.stage.zoom(1));
  await page.waitForTimeout(400);
  const yellow = await page.evaluate(async () => {
    const doc = window.__atelie.editor.state.handout;
    const res = await window.__atelie.renderHandout(doc, { scale: 1, at: [[440, 330], [460, 335], [480, 330], [520, 335], [540, 330], [500, 372], [420, 340]] });
    return res.pixels;
  });
  assert.ok(yellow.some(([r, g, b]) => r > 200 && g > 180 && b < 120), 'highlight band is painted');

  // "Mais…" opens the properties tab
  await page.click('.sel-bar-more');
  assert.ok(await page.evaluate(() => document.querySelector('.inspector-tab[data-tab="properties"]').classList.contains('active')));

  // Corner rotation: dragging from the nw zone swept a quarter turn changes the rotation by ~90°
  const rot = await page.evaluate(async () => {
    const outline = document.querySelector('.stage-selection-outline');
    const zone = outline.querySelector('.stage-rotate-zone[data-corner="se"]');
    const o = outline.getBoundingClientRect();
    const cx = o.left + o.width / 2, cy = o.top + o.height / 2;
    const z = zone.getBoundingClientRect();
    const sx = z.left + z.width / 2, sy = z.top + z.height / 2;
    const r = Math.hypot(sx - cx, sy - cy);
    const a0 = Math.atan2(sy - cy, sx - cx);
    const fire = (type, x, y, target = zone) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y, pointerId: 1 }));
    fire('pointerdown', sx, sy);
    const a1 = a0 + Math.PI / 2;
    window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: cx + r * Math.cos(a1), clientY: cy + r * Math.sin(a1), pointerId: 1 }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: cx + r * Math.cos(a1), clientY: cy + r * Math.sin(a1), pointerId: 1 }));
    return window.__atelie.editor.state.handout.layers.find(l => l.id === 't1').rotation;
  });
  assert.ok(Math.abs(rot - 90) < 2, `rotation ≈ 90°, got ${rot}`);
  assert.ok(await page.evaluate(() => getComputedStyle(document.querySelector('.stage-rotate-zone')).cursor.includes('svg')), 'rotation zone has its own cursor');

  // Double click on an empty part of the page creates a text with the same look as the last one
  await page.evaluate(() => { window.__atelie.editor.state.select(null); window.__atelie.editor.stage.zoom('fit'); });
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => window.__atelie.editor.state.handout.layers.length);
  const pt = await page.evaluate(() => {
    const r = document.querySelector('.stage-page-wrap').getBoundingClientRect();
    return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.85 };
  });
  await page.mouse.dblclick(pt.x, pt.y);
  await page.waitForFunction(n => window.__atelie.editor.state.handout.layers.length === n + 1, before);
  const created = await page.evaluate(() => {
    const ls = window.__atelie.editor.state.handout.layers;
    const l = ls[ls.length - 1];
    return { kind: l.kind, color: l.text.color, size: l.text.size, family: l.text.font.family, weight: l.text.font.weight, editing: !!document.querySelector('.stage-inline-text-editor') && getComputedStyle(document.querySelector('.stage-inline-text-editor')).display !== 'none' };
  });
  assert.equal(created.kind, 'text');
  assert.equal(created.color, '#aa2200');
  assert.equal(created.size, 64);
  assert.equal(created.weight, 700);
  assert.equal(created.editing, true, 'the new text opens for editing');
  await page.keyboard.press('Escape');

  // Alt+click walks down the stack under the cursor
  const stack = await page.evaluate(() => {
    const ed = window.__atelie.editor;
    const mk = (id, y) => ({ id, name: id, kind: 'shape', visible: true, locked: false, x: 100, y, width: 300, height: 300, rotation: 0, opacity: 1, blend: 'normal', light: 'both', shape: { type: 'rect', fill: '#00aa00', stroke: null, strokeWidth: 0, radius: 0, dash: [] } });
    const doc = ed.state.handout;
    ed.loadHandout({ ...doc, layers: [...doc.layers, mk('under', 1000), mk('over', 1000)] }, { skipDraftCheck: true });
    return null;
  });
  await page.waitForTimeout(300);
  const spot = await page.evaluate(() => {
    const r = document.querySelector('.stage-page-wrap').getBoundingClientRect();
    const z = window.__atelie.editor.stage.getZoom();
    return { x: r.left + 200 * z, y: r.top + 1100 * z };
  });
  await page.keyboard.down('Alt');
  await page.mouse.click(spot.x, spot.y);
  assert.equal(await page.evaluate(() => window.__atelie.editor.state.selection), 'over');
  await page.mouse.click(spot.x, spot.y);
  await page.keyboard.up('Alt');
  assert.equal(await page.evaluate(() => window.__atelie.editor.state.selection), 'under');

  assert.deepEqual(errors, []);
});
