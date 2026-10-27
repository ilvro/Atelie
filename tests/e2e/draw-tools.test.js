import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('draw tools e2e: shapes by dragging, brush stroke paints pixels, Shift appends, shortcuts and Esc', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-draw-e2e-'));
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
  const toScreen = (px, py) => page.evaluate(([x, y]) => {
    const r = document.querySelector('.stage-page-wrap').getBoundingClientRect();
    const z = window.__atelie.editor.stage.getZoom();
    return { x: r.left + x * z, y: r.top + y * z };
  }, [px, py]);

  // Tool bar: five tools, select active
  assert.equal(await page.locator('.stage-tool-btn').count(), 5);
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.getTool()), 'select');

  // Options strip appears with a tool; set a red colour and width 8
  await page.keyboard.press('r');
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.getTool()), 'rect');
  await page.waitForSelector('.stage-tool-options', { state: 'visible' });
  await page.locator('[data-option="color"]').evaluate(el => { el.value = '#cc0000'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('[data-option="width"]').fill('8');
  await page.evaluate(() => document.activeElement?.blur());

  const before = (await layers()).length;
  // Drag a rectangle (Shift keeps it square)
  const a = await toScreen(200, 300);
  const b = await toScreen(500, 420);
  await page.keyboard.down('Shift');
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  let ls = await layers();
  assert.equal(ls.length, before + 1);
  const rect = ls[ls.length - 1];
  assert.equal(rect.shape.type, 'rect');
  assert.equal(rect.shape.stroke, '#cc0000');
  assert.equal(rect.shape.strokeWidth, 8);
  assert.equal(rect.width, rect.height, 'Shift makes it square');

  // Ellipse and line
  await page.keyboard.press('o');
  const c = await toScreen(600, 300);
  const d = await toScreen(800, 500);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(d.x, d.y, { steps: 4 });
  await page.mouse.up();
  assert.equal((await layers()).at(-1).shape.type, 'ellipse');

  await page.keyboard.press('l');
  const e = await toScreen(200, 700);
  const f = await toScreen(500, 705);
  await page.mouse.move(e.x, e.y);
  await page.mouse.down();
  await page.mouse.move(f.x, f.y, { steps: 4 });
  await page.mouse.up();
  const line = (await layers()).at(-1);
  assert.equal(line.shape.type, 'line');
  assert.ok(line.width > 250);

  // A tiny drag creates nothing
  const count = (await layers()).length;
  await page.keyboard.press('r');
  await page.mouse.move(e.x, e.y + 100);
  await page.mouse.down();
  await page.mouse.up();
  assert.equal((await layers()).length, count);

  // Brush: a stroke becomes a path layer and paints pixels along it
  await page.keyboard.press('Shift+B');
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.getTool()), 'brush');
  const pts = [[300, 900], [380, 940], [460, 900], [540, 950]];
  const screen = [];
  for (const [x, y] of pts) screen.push(await toScreen(x, y));
  await page.mouse.move(screen[0].x, screen[0].y);
  await page.mouse.down();
  for (const s of screen.slice(1)) await page.mouse.move(s.x, s.y, { steps: 6 });
  await page.mouse.up();
  const brush = (await layers()).at(-1);
  assert.equal(brush.shape.type, 'path');
  assert.ok(brush.shape.points.length >= 4);
  assert.ok(brush.shape.points.every(p => p.every(n => n >= 0 && n <= 1)), 'points are normalized');
  const painted = await page.evaluate(async () => {
    const doc = window.__atelie.editor.state.handout;
    const res = await window.__atelie.renderHandout(doc, { scale: 1, at: [[380, 940], [300, 900], [100, 100]] });
    return res.pixels;
  });
  assert.ok(painted[0][0] > 150 && painted[0][1] < 80, `stroke pixel is red, got ${painted[0]}`);
  assert.ok(painted[2][0] > 200 && painted[2][1] > 200, 'away from the stroke the paper is still light');

  // Shift at the start adds a stroke to the selected brush layer
  const countBefore = (await layers()).length;
  const g = await toScreen(300, 1100);
  const h = await toScreen(500, 1150);
  await page.keyboard.down('Shift');
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  await page.keyboard.up('Shift');
  await page.mouse.move(h.x, h.y, { steps: 4 });
  await page.mouse.up();
  assert.equal((await layers()).length, countBefore, 'no new layer');
  const merged = (await layers()).at(-1);
  assert.equal(merged.shape.points.filter(p => p === null).length, 1, 'the two strokes are separated');

  // Moving the brush layer needs no new code: normalized points follow the box
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.getTool()), 'select', 'Esc goes back to Select');
  await page.keyboard.press('v');
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.getTool()), 'select');
  assert.ok(await page.evaluate(() => window.__atelie.editor.state.canUndo));

  assert.deepEqual(errors, []);
});
