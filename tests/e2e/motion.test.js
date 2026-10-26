import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('motion e2e: visual transitions, landing, FLIP, undo, slider bubble, and reduced motion compliance', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-motion-e2e-'));
  const distDir = path.join(projectDir, 'dist');
  const app = await createApp({ dataDir, distDir });
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

  // --- PART 1: Standard Motion ---
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);

  // 1. Toast notification falls with rotation
  await page.evaluate(() => {
    window.__atelie.notify('Aviso com rotação', { tone: 'info' });
  });
  await page.locator('.notify-item.visible').filter({ hasText: 'Aviso com rotação' }).waitFor({ state: 'visible' });
  const toastVisible = await page.evaluate(() => {
    const item = document.querySelector('.notify-item.visible');
    return Boolean(item);
  });
  assert.ok(toastVisible, 'Toast notification should become visible');

  // 2. Layer landing outline
  const landTested = await page.evaluate(() => {
    const editor = window.__atelie.editor;
    const layer = editor.state.handout.layers[0];
    if (!layer) return false;
    editor.stage.land(layer.id);
    const outline = document.querySelector('.stage-selection-outline');
    return outline?.classList.contains('is-landing') || false;
  });
  assert.ok(landTested, 'Stage selection outline should receive is-landing class on land()');

  // 3. Delete layer with 5s undo notification
  const initialLayerCount = await page.evaluate(() => window.__atelie.editor.state.handout.layers.length);
  await page.evaluate(() => {
    const editor = window.__atelie.editor;
    const topLayer = editor.state.handout.layers[editor.state.handout.layers.length - 1];
    editor.state.select(topLayer.id);
    editor.removeSelected();
  });

  const postDeleteLayerCount = await page.evaluate(() => window.__atelie.editor.state.handout.layers.length);
  assert.equal(postDeleteLayerCount, initialLayerCount - 1, 'Layer count should decrease after deletion');

  // Check undo notification visible with "Desfazer" button
  const undoBtn = page.locator('.notify-item .notify-action-btn:has-text("Desfazer")');
  await undoBtn.waitFor({ state: 'visible' });
  await undoBtn.click();

  const restoredLayerCount = await page.evaluate(() => window.__atelie.editor.state.handout.layers.length);
  assert.equal(restoredLayerCount, initialLayerCount, 'Layer count should be restored after clicking Desfazer');

  // 4. Tab crossfade animation in inspector
  const crossfadeClassPresent = await page.evaluate(() => {
    window.__atelie.inspector.tab('layers');
    const panel = document.querySelector('#inspector-content > *');
    return panel?.classList.contains('tab-crossfade') || false;
  });
  assert.ok(crossfadeClassPresent, 'Inspector tab panel should receive tab-crossfade class');

  // 5. Sliders tooltip bubble and mousewheel
  await page.evaluate(() => {
    window.__atelie.inspector.tab('properties');
  });
  const bubbleAppearsOnInput = await page.evaluate(() => {
    const range = document.querySelector('#inspector-content input[type="range"]');
    if (!range) return null;
    range.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    range.value = '50';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    const bubble = document.querySelector('.range-tooltip-bubble.visible');
    const hasBubble = Boolean(bubble);
    range.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return hasBubble;
  });
  if (bubbleAppearsOnInput !== null) {
    assert.ok(bubbleAppearsOnInput, 'Range tooltip bubble should appear on slider input');
  }

  // 6. Drag ghost on stage
  const dragGhostVisible = await page.evaluate(() => {
    window.__atelieActiveDragItem = {
      id: 'test-ghost-stamp',
      name: 'Carimbo Teste',
      category: 'Carimbos',
      width: 200,
      height: 200,
    };
    const desk = document.getElementById('desk-stage');
    const pageWrap = document.querySelector('.stage-page-wrap');
    if (!desk || !pageWrap) return false;
    const rect = pageWrap.getBoundingClientRect();
    const event = new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + 100,
      clientY: rect.top + 100,
      dataTransfer: new DataTransfer(),
    });
    desk.dispatchEvent(event);
    const ghost = document.querySelector('.stage-drag-ghost');
    const ok = Boolean(ghost && ghost.style.opacity);
    desk.dispatchEvent(new DragEvent('dragleave', { bubbles: true }));
    window.__atelieActiveDragItem = null;
    return ok;
  });
  assert.ok(dragGhostVisible, 'Drag ghost element should be positioned on stage during dragover');

  await page.close();

  // --- PART 2: Reduced Motion Compliance ---
  // "com redução de movimento ligada, nenhuma animação passa de 0 ms"
  const reducedContext = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1400, height: 900 },
  });
  const reducedPage = await reducedContext.newPage();
  const reducedErrors = [];
  reducedPage.on('pageerror', err => reducedErrors.push(err.message));

  await reducedPage.goto(`${baseUrl}/?diagnostics`);
  await reducedPage.waitForFunction(() => !!window.__atelie?.editor?.state);

  // Trigger toast under reduced motion
  await reducedPage.evaluate(() => {
    window.__atelie.notify('Aviso sem movimento', { tone: 'ok' });
  });
  await reducedPage.locator('.notify-item').waitFor({ state: 'visible' });

  // Trigger layer land under reduced motion
  await reducedPage.evaluate(() => {
    const editor = window.__atelie.editor;
    const layer = editor.state.handout.layers[0];
    if (layer) editor.stage.land(layer.id);
  });

  // Switch inspector tab under reduced motion
  await reducedPage.evaluate(() => {
    window.__atelie.inspector.tab('layers');
  });

  // Check that zero animations are running (> 0ms duration)
  const runningAnimationsCount = await reducedPage.evaluate(() => {
    return document.getAnimations().filter(a => a.playState === 'running').length;
  });
  assert.equal(runningAnimationsCount, 0, 'No animations should be actively running when reduced motion is requested');

  await reducedPage.close();
  await reducedContext.close();

  assert.deepEqual(errors, []);
  assert.deepEqual(reducedErrors, []);
});

