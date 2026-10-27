import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('front and back e2e: create the back, flip, edit it, flip back, unlink', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-frontback-e2e-'));
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

  const frontId = await page.evaluate(() => window.__atelie.editor.state.handout.id);
  await page.fill('.at-doc-name-input', 'Carta');
  assert.equal((await page.textContent('[data-action="flip-sheet"]')).trim(), 'Criar verso');

  // Create the back: both documents are linked and saved, and the back is on stage
  await page.click('[data-action="flip-sheet"]');
  await page.waitForFunction(id => window.__atelie.editor.state?.handout.id !== id && window.__atelie.editor.state?.handout.back?.handoutId === id, frontId);
  const backId = await page.evaluate(() => window.__atelie.editor.state.handout.id);
  assert.equal(await page.locator('.desk-tab-list .desk-tab').count(), 1, 'the pair lives in one tab');
  await page.waitForFunction(() => /· verso$/.test(document.querySelector('.desk-tab.is-active .desk-tab-title')?.textContent || ''));
  const savedFront = await page.evaluate(id => window.__atelie.api.handouts.read(id), frontId);
  assert.equal(savedFront.back.handoutId, backId, 'front points to the back');
  const savedBack = await page.evaluate(id => window.__atelie.api.handouts.read(id), backId);
  assert.equal(savedBack.back.handoutId, frontId, 'back points to the front');
  assert.equal(savedBack.page.width, savedFront.page.width);

  // Edit the back, flip to the front and back again: the edit is still there
  await page.fill('.at-doc-name-input', 'Carta (verso editado)');
  await page.keyboard.press('Tab');
  await page.click('[data-action="flip-sheet"]');
  await page.waitForFunction(id => window.__atelie.editor.state?.handout.id === id, frontId);
  await page.waitForFunction(() => document.querySelector('.at-doc-name-input').value === 'Carta');
  await page.click('body', { position: { x: 5, y: 5 } });
  await page.keyboard.press('f');
  await page.waitForFunction(id => window.__atelie.editor.state?.handout.id === id, backId);
  await page.waitForFunction(() => document.querySelector('.at-doc-name-input').value === 'Carta (verso editado)');

  // The page was turned with an animation (not instant) unless motion is reduced
  const hasFlipKeyframes = await page.evaluate(() => [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.name === 'sheet-flip-out'); } catch { return false; } }));
  assert.ok(hasFlipKeyframes, 'flip keyframes exist');

  // Unlink removes the link on both sides
  await page.click('[data-action="unlink-back"]');
  await page.waitForFunction(id => window.__atelie.editor.state?.handout.id === id && !window.__atelie.editor.state.handout.back, frontId);
  await page.evaluate(async ids => {
    for (let i = 0; i < 100; i++) {
      const [f, b] = await Promise.all(ids.map(id => window.__atelie.api.handouts.read(id)));
      if (f.back === null && b.back === null) return;
      await new Promise(r => setTimeout(r, 50));
    }
  }, [frontId, backId]);
  const afterFront = await page.evaluate(id => window.__atelie.api.handouts.read(id), frontId);
  const afterBack = await page.evaluate(id => window.__atelie.api.handouts.read(id), backId);
  assert.equal(afterFront.back, null);
  assert.equal(afterBack.back, null);
  assert.equal((await page.textContent('[data-action="flip-sheet"]')).trim(), 'Criar verso');

  assert.deepEqual(errors, []);
});
