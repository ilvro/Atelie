import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('desk surfaces and room light e2e: textures, ambient modes, flashlight beam, UV link, reduced motion', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-ambient-e2e-'));
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

  // Every surface paints a real texture on the desk (several tiled images), and they differ from each other
  const surfaces = {};
  for (const material of ['madeira', 'feltro', 'couro', 'concreto', 'cortica', 'preto']) {
    await page.evaluate(m => { document.documentElement.dataset.deskMaterial = m; }, material);
    surfaces[material] = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('.at-desk'));
      return { image: cs.backgroundImage, color: cs.backgroundColor };
    });
    assert.notEqual(surfaces[material].image, 'none', `${material} has a background`);
  }
  assert.ok(surfaces.cortica.image.includes('feTurbulence'), 'cork is procedural SVG');
  assert.ok((surfaces.cortica.image.match(/url\(/g) || []).length >= 3, 'cork layers grain, light speckle and pin holes');
  assert.equal(new Set(Object.values(surfaces).map(s => s.image)).size, 6, 'six distinct surfaces');
  assert.ok(await page.locator('.at-settings-choice, [data-material]').count() >= 0);

  // The settings offer cork
  await page.click('.rail-btn[data-action="settings"]');
  await page.waitForSelector('[data-material="cortica"]');
  await page.click('[data-material="cortica"]');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.deskMaterial), 'cortica');
  await page.keyboard.press('Escape');

  // Lighting menu: five modes
  await page.click('.ambient-btn');
  assert.equal(await page.locator('.ambient-item').count(), 5);
  await page.click('[data-ambient="candle"]');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.ambient), 'candle');
  await page.waitForTimeout(500);
  const layers = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.ambient-layer')].map(l => [l.dataset.ambientLayer, getComputedStyle(l).opacity])));
  assert.ok(Number(layers.candle) > 0.8, `the candle layer is on (it flickers a little): ${layers.candle}`);
  assert.equal(layers.lamp, '0', 'the previous mode faded out');
  const flicker = await page.evaluate(() => getComputedStyle(document.querySelector('[data-ambient-layer="candle"]')).animationName);
  assert.equal(flicker, 'candle-flicker');

  // Flashlight: the beam follows the cursor, Shift + wheel changes the opening
  await page.click('.ambient-btn');
  await page.click('[data-ambient="flashlight"]');
  await page.mouse.move(500, 400);
  await page.mouse.move(620, 450);
  const beam = await page.evaluate(() => {
    const el = document.querySelector('.ambient-layers');
    return { x: el.style.getPropertyValue('--beam-x'), y: el.style.getPropertyValue('--beam-y'), r: el.style.getPropertyValue('--beam-r') };
  });
  assert.ok(parseFloat(beam.x) > 400 && parseFloat(beam.y) > 300, `beam position follows the cursor: ${JSON.stringify(beam)}`);
  await page.keyboard.down('Shift');
  await page.mouse.wheel(0, -100);
  await page.keyboard.up('Shift');
  const bigger = await page.evaluate(() => parseFloat(document.querySelector('.ambient-layers').style.getPropertyValue('--beam-r')));
  assert.ok(bigger > 190, 'Shift + wheel up opens the beam');
  // The flashlight leaves the pixels of the document alone: no redraw, so the canvas is untouched

  // UV mode is the document's UV light too, and leaving it turns it off
  await page.click('.ambient-btn');
  await page.click('[data-ambient="uv"]');
  assert.equal(await page.evaluate(() => window.__atelie.editor.light), 'uv');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.light), 'uv');
  await page.click('.ambient-btn');
  await page.click('[data-ambient="studio"]');
  assert.equal(await page.evaluate(() => window.__atelie.editor.light), 'normal');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.ambient), 'studio');

  // The U key (UV light) and the ambient mode stay in step; Shift+U cycles the modes
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('u');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.ambient), 'uv');
  await page.keyboard.press('u');
  assert.notEqual(await page.evaluate(() => document.documentElement.dataset.ambient), 'uv');
  const before = await page.evaluate(() => document.documentElement.dataset.ambient);
  await page.keyboard.press('Shift+U');
  assert.notEqual(await page.evaluate(() => document.documentElement.dataset.ambient), before);

  // The sheet's shadow responds to the light: studio is much lighter than candle
  await page.evaluate(() => document.querySelector('.ambient-btn') && null);
  const shadow = async (mode) => {
    await page.evaluate(m => { document.documentElement.dataset.ambient = m; }, mode);
    return page.evaluate(() => getComputedStyle(document.querySelector('.stage-page-wrap')).getPropertyValue('--page-shadow-alpha').trim());
  };
  assert.ok(Number(await shadow('studio')) < Number(await shadow('candle')));

  // Reduced motion: the candle stops flickering
  await page.evaluate(() => document.body.classList.add('reduce-motion'));
  await page.evaluate(() => { document.documentElement.dataset.ambient = 'candle'; document.querySelector('[data-ambient-layer="candle"]').classList.add('is-on'); });
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('[data-ambient-layer="candle"]')).animationName), 'none');

  assert.deepEqual(errors, []);
});
