import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('cut tools e2e: tear the sheet, lasso one layer, hold the lighter, undo, hide, reduced motion', { timeout: 120_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-cut-e2e-'));
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
  await page.evaluate(() => window.__atelie.editor.stage.zoom('fit'));
  await page.waitForTimeout(300);

  const layers = () => page.evaluate(() => window.__atelie.editor.state.handout.layers);
  const screen = (px, py) => page.evaluate(([x, y]) => {
    const r = document.querySelector('.stage-page-wrap').getBoundingClientRect();
    const z = window.__atelie.editor.stage.getZoom();
    return { x: r.left + x * z, y: r.top + y * z };
  }, [px, py]);
  const pixel = (px, py) => page.evaluate(async ([x, y]) => {
    const doc = window.__atelie.editor.state.handout;
    const res = await window.__atelie.renderHandout(doc, { scale: 0.5, at: [[x, y]] });
    return res.pixels[0];
  }, [px, py]);
  const blur = () => page.evaluate(() => document.activeElement?.blur());

  // The three tools are on the bar and each has its key
  for (const tool of ['scissors', 'tear', 'lighter']) assert.equal(await page.locator(`.stage-tool-btn[data-tool="${tool}"]`).count(), 1);

  // --- Tear: drag across the top, then click the part that leaves
  await page.evaluate(() => window.__atelie.editor.state.select(null));
  assert.ok((await pixel(40, 40))[3] > 250, 'the corner is paper before the tear');
  await blur();
  await page.keyboard.press('t');
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.getTool()), 'tear');
  assert.match(await page.textContent('[data-cut-target]'), /a folha/);
  const before = (await layers()).length;
  const a = await screen(60, 260);
  const b = await screen(1180, 280);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.isChoosingCut()), true, 'waits for the choice of the part');
  const top = await screen(600, 80);
  await page.mouse.click(top.x, top.y);
  let ls = await layers();
  assert.equal(ls.length, before + 1);
  const tear = ls.at(-1);
  assert.equal(tear.name, 'Rasgo');
  assert.equal(tear.effect.type, 'cut');
  assert.equal(tear.effect.edge, 'rasgado');
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.isChoosingCut()), false);
  assert.equal((await pixel(40, 40))[3], 0, 'the top corner is transparent after the tear');
  assert.ok((await pixel(600, 900))[3] > 250, 'the rest of the sheet stays');
  assert.ok(await page.evaluate(() => document.querySelector('.stage-page-wrap').classList.contains('has-cut')), 'the shadow follows the cut shape');

  // Undo takes the tear back; hiding the layer shows the paper again too
  await page.evaluate(() => window.__atelie.editor.state.undo());
  assert.equal((await layers()).length, before);
  assert.ok((await pixel(40, 40))[3] > 250);
  await page.evaluate(() => window.__atelie.editor.state.redo());
  assert.equal((await pixel(40, 40))[3], 0);
  await page.evaluate(() => {
    const ed = window.__atelie.editor;
    const layer = ed.state.handout.layers.at(-1);
    ed.state.edit({ ...ed.state.handout, layers: ed.state.handout.layers.map(l => (l.id === layer.id ? { ...l, visible: false } : l)) }, { label: 'Ocultar' });
  });
  assert.ok((await pixel(40, 40))[3] > 250, 'hiding the cut layer gives the paper back, nothing is lost');
  await page.evaluate(() => window.__atelie.editor.state.undo());

  // --- Lasso on a selected layer: only that layer is cut, the paper below stays
  await page.evaluate(() => {
    const ed = window.__atelie.editor;
    // Start again from a clean document with a red box on the paper
    const doc = ed.createHandout({ name: 'Lasso', preset: 'a4' });
    const red = { id: 'foto', name: 'Foto', kind: 'shape', visible: true, locked: false, x: 300, y: 400, width: 600, height: 600, rotation: 0, opacity: 1, blend: 'normal', light: 'both', shape: { type: 'rect', fill: '#cc0000', stroke: null, strokeWidth: 0, radius: 0, dash: [] } };
    ed.loadHandout({ ...doc, layers: [...doc.layers, red] }, { skipDraftCheck: true });
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__atelie.editor.stage.zoom('fit'); window.__atelie.editor.state.select('foto'); });
  await page.waitForTimeout(200);
  assert.ok((await pixel(320, 420))[0] > 150 && (await pixel(320, 420))[1] < 60, 'red before the lasso');
  await blur();
  await page.keyboard.press('x');
  assert.match(await page.textContent('[data-cut-target]'), /Foto/, 'the strip names the layer it will cut');
  const lasso = [[450, 550], [750, 550], [750, 850], [450, 850], [450, 560]];
  const pts = [];
  for (const [x, y] of lasso) pts.push(await screen(x, y));
  await page.keyboard.down('Alt');
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Alt');
  const cut = (await layers()).at(-1);
  assert.equal(cut.effect.type, 'cut');
  assert.equal(cut.clip, true, 'the cut is clipped to the layer it cut');
  assert.equal(cut.effect.remove.length, 2, 'box contour plus lasso');
  assert.equal(cut.x, 300, 'same box as the cut layer');
  // The lasso keeps what is inside it and cuts away what is outside, but only on this layer
  const kept = await pixel(600, 700);
  assert.ok(kept[0] > 150 && kept[1] < 60, `inside the lasso the red stays, got ${kept}`);
  const gone = await pixel(320, 420);
  assert.ok(!(gone[0] > 150 && gone[1] < 60), `outside the lasso the red is cut away, got ${gone}`);
  assert.ok(gone[3] > 250, 'the paper below the red is still there');

  // --- Lighter: holding longer makes a bigger hole
  await page.evaluate(() => window.__atelie.editor.state.select(null));
  await blur();
  await page.keyboard.press('q');
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.getTool()), 'lighter');
  const hold = async (point, ms) => {
    const p = await screen(point[0], point[1]);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.waitForTimeout(ms);
    await page.mouse.up();
    return (await layers()).at(-1);
  };
  const quick = await hold([200, 1300], 200);
  const slow = await hold([800, 1300], 1100);
  const radius = layer => Math.max(...layer.effect.holes.flat().map(p => p[2]));
  assert.equal(quick.name, 'Queimado');
  assert.equal(quick.blend, 'multiply');
  assert.ok(radius(slow) > radius(quick) + 15, `the fire spreads while held: ${radius(quick)} → ${radius(slow)}`);
  assert.ok((await pixel(800, 1300))[3] === 0, 'a hole in the paper where the flame stayed');

  // --- Reduced motion: no flame glow, the cut is applied the same
  await page.evaluate(() => document.body.classList.add('reduce-motion'));
  const p = await screen(500, 1500);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.stage-flame-glow').count(), 0, 'no glow with reduced motion');
  await page.mouse.up();
  assert.equal((await layers()).at(-1).name, 'Queimado');

  // Esc leaves the tool
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.getTool()), 'select');
  assert.deepEqual(errors, []);
});
