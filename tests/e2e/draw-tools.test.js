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

  // Tool bar: ten tools (Texto among them, next to the cutting tools), select active
  assert.equal(await page.locator('.stage-tool-btn').count(), 10);
  assert.equal(await page.locator('.stage-tool-btn[data-tool="text"]').count(), 1, 'the Texto tool is in the bar');
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.getTool()), 'select');

  // Texto tool: a click writes there, a drag draws the box, and the tool goes back to Selecionar
  await page.click('.stage-tool-btn[data-tool="text"]');
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.getTool()), 'text');
  const t0 = (await layers()).length;
  const tp = await toScreen(300, 1200);
  await page.mouse.click(tp.x, tp.y);
  await page.waitForFunction(() => document.activeElement?.classList.contains('stage-inline-text-editor'));
  let tl = await layers();
  assert.equal(tl.length, t0 + 1, 'a click creates a text layer');
  assert.equal(tl.at(-1).kind, 'text');
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.getTool()), 'select', 'the tool goes back to select, so letters are not shortcuts');
  await page.keyboard.type('Rtqx');
  assert.equal(await page.evaluate(() => document.querySelector('.stage-inline-text-editor').value), 'Rtqx');
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.activeElement?.blur());
  await page.click('.stage-tool-btn[data-tool="text"]');
  const d1 = await toScreen(200, 1300);
  const d2 = await toScreen(700, 1450);
  await page.mouse.move(d1.x, d1.y);
  await page.mouse.down();
  await page.mouse.move(d2.x, d2.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForFunction(() => document.activeElement?.classList.contains('stage-inline-text-editor'));
  tl = await layers();
  assert.equal(tl.length, t0 + 2, 'a drag creates another text layer');
  const boxed = tl.at(-1);
  assert.ok(Math.abs(boxed.width - 500) <= 4 && Math.abs(boxed.height - 150) <= 4, `the dragged box sets the size (${boxed.width}×${boxed.height})`);
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.activeElement?.blur());

  // Options strip appears with a tool; set a red colour and width 8
  await page.keyboard.press('r');
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.getTool()), 'rect');
  await page.waitForSelector('.stage-tool-options', { state: 'visible' });
  await page.locator('[data-option="color"]').evaluate(el => { el.value = '#cc0000'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('[data-option="width"]').fill('8');
  await page.evaluate(() => document.activeElement?.blur());

  const before = (await layers()).length;
  // Drag a rectangle (Shift keeps it square)
  const a = await toScreen(400, 300);
  const b = await toScreen(700, 420);
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
  const e = await toScreen(400, 700);
  const f = await toScreen(700, 705);
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
  await page.keyboard.press('b');
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.getTool()), 'brush');
  const pts = [[400, 900], [480, 940], [560, 900], [640, 950]];
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
    const res = await window.__atelie.renderHandout(doc, { scale: 1, at: [[480, 940], [400, 900], [100, 100]] });
    return res.pixels;
  });
  assert.ok(painted[0][0] > 150 && painted[0][1] < 80, `stroke pixel is red, got ${painted[0]}`);
  assert.ok(painted[2][0] > 200 && painted[2][1] > 200, 'away from the stroke the paper is still light');

  // Shift at the start adds a stroke to the selected brush layer
  const countBefore = (await layers()).length;
  const g = await toScreen(400, 1100);
  const h = await toScreen(700, 1150);
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

  // Brush tips: six buttons in the strip; Giz makes a textured stroke whose pixels are partly transparent
  await page.keyboard.press('b');
  assert.equal(await page.locator('.stage-brush-tip').count(), 6);
  assert.equal(await page.locator('.stage-brush-tip[aria-pressed="true"]').getAttribute('data-tip'), 'pen');
  await page.click('.stage-brush-tip[data-tip="chalk"]');
  assert.equal(await page.locator('.stage-brush-tip[aria-pressed="true"]').getAttribute('data-tip'), 'chalk');
  assert.equal(await page.locator('[data-option="width"]').inputValue(), '14', 'Giz starts at its own width');
  assert.equal(await page.locator('[data-option="grain"]').count(), 1, 'Grão appears for a grainy tip');
  await page.fill('[data-option="width"]', '30');
  await page.click('.stage-brush-tip[data-tip="pencil"]');
  assert.equal(await page.locator('[data-option="width"]').inputValue(), '3');
  await page.click('.stage-brush-tip[data-tip="chalk"]');
  assert.equal(await page.locator('[data-option="width"]').inputValue(), '30', 'going back to Giz returns it as it was left');
  const chalkBefore = (await layers()).length;
  const c1 = await toScreen(300, 1500);
  const c2 = await toScreen(900, 1500);
  await page.mouse.move(c1.x, c1.y);
  await page.mouse.down();
  await page.mouse.move(c2.x, c2.y, { steps: 12 });
  await page.mouse.up();
  const chalk = (await layers()).at(-1);
  assert.equal((await layers()).length, chalkBefore + 1);
  assert.equal(chalk.name, 'Giz');
  assert.equal(chalk.shape.brush.kind, 'chalk');
  assert.ok(Number.isInteger(chalk.shape.brush.seed));
  const alphas = await page.evaluate(async (layer) => {
    const doc = window.__atelie.editor.state.handout;
    const mid = [layer.x + layer.width / 2, layer.y + layer.height / 2];
    const at = [];
    for (let dx = -80; dx <= 80; dx += 3) for (let dy = -10; dy <= 10; dy += 5) at.push([mid[0] + dx, mid[1] + dy]);
    const res = await window.__atelie.renderHandout(doc, { scale: 1, at });
    return res.pixels;
  }, chalk);
  assert.ok(alphas.length > 10);
  const channelSpread = new Set(alphas.map(p => p.join(','))).size;
  assert.ok(channelSpread > 3, 'the chalk leaves paper showing through the stroke (pixels differ along it)');

  // Properties of a stroke: "Traço", no Tipo/Preenchimento, tip change writes brush.kind, width up to 200 kept
  assert.equal(await page.locator('.prop-legend', { hasText: 'Traço' }).count(), 1);
  assert.equal(await page.locator('[data-field="h:shape.type"]').count(), 0, 'a stroke is not offered as a rectangle');
  assert.equal(await page.locator('[data-field="h:shape.fill"]').count(), 0);
  assert.equal(await page.locator('[data-field="h:shape.radius"]').count(), 0);
  await page.click('[data-field="h:shape.brush.kind"] ~ [role="radiogroup"] [data-choice="drybrush"]');
  assert.equal((await layers()).at(-1).shape.brush.kind, 'drybrush');
  assert.equal(await page.locator('[data-field="h:shape.strokeWidth"]').getAttribute('max'), '200');
  await page.fill('[data-field="h:shape.strokeWidth"]', '120');
  await page.keyboard.press('Tab');
  const wide = (await layers()).at(-1);
  assert.equal(wide.shape.strokeWidth, 120);
  assert.ok(wide.shape.points.every(p => p === null || p.every(n => n >= 0 && n <= 1)));
  assert.equal(await page.locator('[data-field="h:shape.strokeWidth"]').inputValue(), '120', 'the panel does not cut the width');
  const seedBefore = wide.shape.brush.seed;
  await page.click('[data-action="reroll-brush"]');
  const rerolled = (await layers()).at(-1);
  assert.notEqual(rerolled.shape.brush.seed, seedBefore);
  assert.equal(await page.evaluate(() => window.__atelie.editor.state.steps.at(-1).label), 'Variar traço');
  await page.keyboard.press('Escape');

  // Stabilizer: "Suavizar" turns a trembling zigzag into a calmer stroke that still reaches the release point
  await page.keyboard.press('b');
  await page.click('.stage-brush-tip[data-tip="pen"]');
  const zigzag = async (smooth) => {
    await page.evaluate((v) => {
      const el = document.querySelector('[data-option="smooth"]');
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, smooth);
    const before = (await layers()).length;
    const origin = await toScreen(300, 1600);
    await page.mouse.move(origin.x, origin.y);
    await page.mouse.down();
    for (let i = 1; i <= 40; i++) await page.mouse.move(origin.x + i * 6, origin.y + (i % 2 ? 10 : -10));
    await page.mouse.up();
    const layersNow = await layers();
    assert.equal(layersNow.length, before + 1);
    const l = layersNow.at(-1);
    // without the closing point, which is the cursor itself by design
    const ys = l.shape.points.filter(Boolean).slice(0, smooth > 0 ? -1 : undefined).map(p => p[1] * l.height + l.y);
    return { amplitude: Math.max(...ys) - Math.min(...ys), layer: l };
  };
  assert.equal(await page.locator('[data-option="smooth"]').count(), 1);
  const raw = await zigzag(0);
  const smooth = await zigzag(100);
  assert.ok(raw.amplitude > 15, `raw zigzag ${raw.amplitude.toFixed(1)}`);
  assert.ok(smooth.amplitude < raw.amplitude * 0.5, `smoothed ${smooth.amplitude.toFixed(1)} vs raw ${raw.amplitude.toFixed(1)}`);
  await page.evaluate(() => {
    const el = document.querySelector('[data-option="smooth"]');
    el.value = '0';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.keyboard.press('Escape');

  // Stroke eraser: Shift+E (E is Exportar); works only on a selected brush layer; one gesture, one undo step
  await page.keyboard.press('b');
  const sx1 = await toScreen(300, 1680);
  const sx2 = await toScreen(900, 1680);
  await page.mouse.move(sx1.x, sx1.y);
  await page.mouse.down();
  await page.mouse.move(sx2.x, sx2.y, { steps: 20 });
  await page.mouse.up();
  await page.keyboard.press('Shift+E');
  assert.equal(await page.evaluate(() => window.__atelie.editor.stage.getTool()), 'eraser');
  assert.equal(await page.locator('[data-eraser-hint]').isVisible(), false, 'a brush layer is selected, so no warning');
  const stepsBefore = await page.evaluate(() => window.__atelie.editor.state.steps.length);
  const e1 = await toScreen(600, 1640);
  const e2 = await toScreen(600, 1720);
  await page.mouse.move(e1.x, e1.y);
  await page.mouse.down();
  await page.mouse.move(e2.x, e2.y, { steps: 6 });
  await page.mouse.up();
  const erased = (await layers()).at(-1);
  assert.equal(erased.shape.points.filter(p => p === null).length, 1, 'the stroke was split in two');
  assert.ok(erased.shape.points.every(p => p === null || p.every(n => n >= 0 && n <= 1)));
  assert.equal(await page.evaluate(() => window.__atelie.editor.state.steps.length), stepsBefore + 1, 'one gesture is one step');
  assert.equal(await page.evaluate(() => window.__atelie.editor.state.steps.at(-1).label), 'Apagar traço');
  // erasing everything removes the layer in the same step
  const countWith = (await layers()).length;
  const f1 = await toScreen(250, 1680);
  const f2 = await toScreen(950, 1680);
  await page.evaluate(() => {
    const el = document.querySelector('[data-option="eraser"]');
    el.value = '200';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.mouse.move(f1.x, f1.y);
  await page.mouse.down();
  await page.mouse.move(f2.x, f2.y, { steps: 20 });
  await page.mouse.up();
  assert.equal((await layers()).length, countWith - 1, 'an empty stroke layer is removed');
  await page.evaluate(() => window.__atelie.editor.state.undo());
  assert.equal((await layers()).length, countWith, 'one undo brings it back');
  // with no brush layer selected the gesture does nothing and the strip warns
  await page.evaluate(() => window.__atelie.editor.stage.select(null));
  await page.waitForFunction(() => document.querySelector('[data-eraser-hint]')?.style.display !== 'none');
  const stepsIdle = await page.evaluate(() => window.__atelie.editor.state.steps.length);
  await page.mouse.move(f1.x, f1.y);
  await page.mouse.down();
  await page.mouse.move(f2.x, f2.y, { steps: 5 });
  await page.mouse.up();
  assert.equal(await page.evaluate(() => window.__atelie.editor.state.steps.length), stepsIdle, 'nothing changed');
  await page.keyboard.press('Escape');

  // [ and ] size the tool in use; period inks; Alt+click takes the colour of the page
  const blur = () => page.evaluate(() => document.activeElement?.blur?.());
  const setOption = (key, value) => page.evaluate(([k, v]) => {
    const el = document.querySelector(`[data-option="${k}"]`);
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, [key, value]);
  const width = () => page.locator('[data-option="width"]').inputValue();
  await page.keyboard.press('b');
  await blur();
  await setOption('width', 6);
  await page.keyboard.press(']');
  assert.equal(await width(), '7');
  await page.keyboard.press('[');
  await page.keyboard.press('[');
  assert.equal(await width(), '5');
  await setOption('width', 10);
  await page.keyboard.press(']');
  assert.equal(await width(), '11', 'above 10 it grows by 10 %, never less than one');
  await setOption('width', 1);
  await page.keyboard.press('[');
  assert.equal(await width(), '1', 'lower limit');
  await setOption('width', 200);
  await page.keyboard.press(']');
  assert.equal(await width(), '200', 'upper limit');
  await setOption('width', 6);
  const layersBefore = (await layers()).length;
  await page.keyboard.press('Control+]');
  assert.equal(await width(), '6', 'Ctrl+] is still the layer shortcut, not the size');
  assert.equal((await layers()).length, layersBefore);
  await page.keyboard.press('Shift+E');
  await setOption('eraser', 30);
  await blur();
  const eraserSize = await page.locator('[data-option="eraser"]').inputValue();
  await page.keyboard.press(']');
  assert.notEqual(await page.locator('[data-option="eraser"]').inputValue(), eraserSize, 'with the eraser, [ ] size the eraser');
  assert.equal(await page.locator('[data-option="eraser"]').inputValue(), String(Number(eraserSize) + 3), '30 grows 10 % → 33');
  await page.keyboard.press('b');

  assert.equal(await page.locator('.stage-ink').count() >= 6, true);
  await page.click('.stage-ink[data-ink="#a3221c"]');
  assert.equal(await page.locator('[data-option="color"]').inputValue(), '#a3221c');
  const inkStroke1 = await toScreen(300, 1560);
  const inkStroke2 = await toScreen(500, 1560);
  await page.mouse.move(inkStroke1.x, inkStroke1.y);
  await page.mouse.down();
  await page.mouse.move(inkStroke2.x, inkStroke2.y, { steps: 5 });
  await page.mouse.up();
  assert.equal((await layers()).at(-1).shape.stroke, '#a3221c');
  assert.equal(await page.locator('.stage-ink').first().getAttribute('data-ink'), '#15131a');
  assert.equal(await page.locator('.stage-ink').nth(6).getAttribute('data-ink'), '#a3221c', 'the colour just used is remembered after the period inks');
  await page.click('.stage-ink[data-ink="#2f5a3a"]');
  const countAlt = (await layers()).length;
  const pick = await toScreen(40, 400);
  await page.keyboard.down('Alt');
  await page.mouse.click(pick.x, pick.y);
  await page.keyboard.up('Alt');
  const picked = await page.locator('[data-option="color"]').inputValue();
  assert.match(picked, /^#[0-9a-f]{6}$/);
  assert.notEqual(picked, '#2f5a3a', 'Alt+click took the colour of the page');
  assert.equal((await layers()).length, countAlt, 'and drew nothing');
  await page.keyboard.press('Escape');

  assert.deepEqual(errors, []);
});
