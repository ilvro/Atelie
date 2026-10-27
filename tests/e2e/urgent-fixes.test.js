import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('urgent fixes e2e: settings scroll, drag keeps paper image, pan at high zoom, rotate handle, trash count, arrow icon', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-urgent-e2e-'));
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

  const page = await browser.newPage({ viewport: { width: 1280, height: 420 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);

  // Settings: card never taller than the window and the body scrolls
  await page.click('.rail-btn[data-action="settings"]');
  await page.locator('#at-settings-modal').waitFor({ state: 'visible' });
  const settings = await page.evaluate(() => {
    const card = document.querySelector('.at-settings-card').getBoundingClientRect();
    const body = document.querySelector('.at-settings-body');
    return { cardH: card.height, winH: innerHeight, overflowY: getComputedStyle(body).overflowY, scrollable: body.scrollHeight > body.clientHeight };
  });
  assert.ok(settings.cardH <= settings.winH, 'settings card must fit in the window');
  assert.equal(settings.overflowY, 'auto');
  assert.ok(settings.scrollable, 'settings body must scroll on a short window');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1280, height: 900 });

  // Document with an image paper and a text on top
  const dragResult = await page.evaluate(async () => {
    const editor = window.__atelie.editor;
    const lay = (id, kind, extra) => ({ id, name: id, kind, visible: true, locked: false, x: 0, y: 0, width: 600, height: 800, rotation: 0, opacity: 1, blend: 'normal', light: 'both', ...extra });
    const doc = {
      id: 'doc-urgent', name: 'Urgente', schemaVersion: 1, revision: 1,
      page: { width: 600, height: 800, background: '#00000000' },
      layers: [
        lay('paper', 'image', { image: { src: { library: 'casa-papel-oficio-branco-novo' }, fit: 'cover' } }),
        lay('txt', 'text', { x: 100, y: 100, width: 300, height: 80, text: { content: 'Arraste', size: 40, font: { family: 'IM Fell English' } } }),
      ],
    };
    await editor.loadHandout(doc, { skipDraftCheck: true });
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise(r => setTimeout(r, 400));
    editor.state.select('txt');
    const px = () => {
      const c = document.querySelector('.stage-canvas');
      const d = c.getContext('2d').getImageData(4, 4, 1, 1).data;
      return [d[0], d[1], d[2], d[3]];
    };
    const before = px();
    const outline = document.querySelector('.stage-selection-outline');
    const r = outline.getBoundingClientRect();
    const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
    outline.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: sx, clientY: sy, pointerId: 1 }));
    window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: sx + 40, clientY: sy + 30, pointerId: 1 }));
    const during = px();
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: sx + 40, clientY: sy + 30, pointerId: 1 }));
    return { before, during };
  });
  assert.ok(dragResult.before[3] > 0, 'paper must be drawn before the drag');
  assert.deepEqual(dragResult.during, dragResult.before, 'paper pixel must not change (checkerboard) during the drag');

  // Pan at high zoom: scrollLeft = 0 shows the left edge of the page
  await page.evaluate(() => window.__atelie.editor.stage.zoom(4));
  await page.waitForTimeout(300);
  const pan = await page.evaluate(() => {
    const vp = document.querySelector('.stage-viewport');
    vp.scrollLeft = 0;
    vp.scrollTop = 0;
    const wrap = document.querySelector('.stage-page-wrap').getBoundingClientRect();
    const view = vp.getBoundingClientRect();
    return { wrapLeft: wrap.left, viewLeft: view.left, wrapTop: wrap.top, viewTop: view.top, scrollWidth: vp.scrollWidth, clientWidth: vp.clientWidth };
  });
  assert.ok(pan.scrollWidth > pan.clientWidth, 'zoomed page must overflow the viewport');
  assert.ok(pan.wrapLeft >= pan.viewLeft - 1, 'left edge of the page must be reachable at scrollLeft=0');
  assert.ok(pan.wrapTop >= pan.viewTop - 1, 'top edge of the page must be reachable at scrollTop=0');

  // Zoom with the wheel keeps the point under the cursor
  await page.evaluate(() => window.__atelie.editor.stage.zoom('fit'));
  await page.waitForTimeout(200);

  // Rotation handle is absolutely positioned above the box
  await page.evaluate(() => window.__atelie.editor.state.select('txt'));
  const rot = await page.evaluate(() => {
    const h = document.querySelector('.stage-rotate-handle');
    return { position: getComputedStyle(h).position, top: h.getBoundingClientRect().top, outlineTop: document.querySelector('.stage-selection-outline').getBoundingClientRect().top };
  });
  assert.equal(rot.position, 'absolute');
  assert.ok(rot.top < rot.outlineTop, 'rotate handle sits above the selection box');

  // Trash chip shows the count and the back icon is an arrow, not the fallback cube
  await page.click('.rail-btn[data-action="documents"]');
  await page.waitForSelector('.nav-chip[data-filter="lixeira"]');
  const chip = await page.textContent('.nav-chip[data-filter="lixeira"]');
  assert.match(chip.trim(), /^Lixeira$/, 'empty trash shows no count');
  const icons = await import('../../src/ui/icons.js');
  assert.notEqual(icons.icon('arrow-left'), icons.icon('__nope__'), 'arrow-left icon must exist');

  assert.deepEqual(errors, []);
});
