import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('editor e2e: presets, text editing, undo/redo, blend/opacity, archive, visibility, lock, reorder and uploads', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-editor-e2e-'));
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

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  // 1. Initial page opens with A4 and layer "Papel"
  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);

  const initialInfo = await page.evaluate(() => {
    const doc = window.__atelie.editor.state.handout;
    return {
      width: doc.page.width,
      height: doc.page.height,
      firstLayerName: doc.layers[0]?.name,
    };
  });
  assert.equal(initialInfo.width, 1240);
  assert.equal(initialInfo.height, 1754);
  assert.equal(initialInfo.firstLayerName, 'Papel');

  // Open with ?new=polaroid
  await page.goto(`${baseUrl}/?new=polaroid&diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);

  const polaroidInfo = await page.evaluate(() => {
    const doc = window.__atelie.editor.state.handout;
    return { width: doc.page.width, height: doc.page.height };
  });
  assert.equal(polaroidInfo.width, 880);
  assert.equal(polaroidInfo.height, 1070);

  // 2. Add text layer, write "Querida Lia" and size 80
  await page.click('.inspector-tab[data-tab="layers"]');
  await page.click('[data-action="toggle-add-menu"]');
  await page.click('[data-add="text"]');

  // Switch to properties tab
  await page.click('.inspector-tab[data-tab="properties"]');
  const contentArea = page.locator('textarea[data-field="h:text.content"]');
  await contentArea.fill('Querida Lia');

  const sizeInput = page.locator('input[data-field="h:text.size"]');
  await sizeInput.fill('80');
  await sizeInput.dispatchEvent('change');

  // Give a moment for render
  await page.waitForTimeout(100);
  await sizeInput.blur();

  // Verify dark pixels exist on canvas
  const hasDarkPixel = await page.evaluate(() => {
    const canvas = document.querySelector('.stage-canvas');
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let dark = 0;
    for (let i = 0; i < imgData.length; i += 4) {
      if (imgData[i] < 100 && imgData[i + 1] < 100 && imgData[i + 2] < 100 && imgData[i + 3] > 200) {
        dark++;
      }
    }
    return dark > 10;
  });
  assert.ok(hasDarkPixel, 'Canvas should render dark text pixels for "Querida Lia"');

  // 3. Ctrl+Z reverts size; Ctrl+Z again reverts text content
  await page.keyboard.press('Control+z');
  const sizeAfterUndo1 = await page.evaluate(() => {
    const textL = window.__atelie.editor.state.handout.layers.find(l => l.kind === 'text');
    return textL.text.size;
  });
  assert.notEqual(sizeAfterUndo1, 80);

  await page.keyboard.press('Control+z');
  const contentAfterUndo2 = await page.evaluate(() => {
    const textL = window.__atelie.editor.state.handout.layers.find(l => l.kind === 'text');
    return textL.text.content;
  });
  assert.equal(contentAfterUndo2, 'Escreva aqui');

  // Redo back to "Querida Lia" and size 80
  await page.keyboard.press('Control+Shift+z');
  await page.keyboard.press('Control+Shift+z');

  // 4. Set blend "multiply" and opacity 50%
  const blendSelect = page.locator('select[data-field="h:blend"]');
  await blendSelect.selectOption('multiply');

  const opacityInput = page.locator('input[type="number"][data-field="h:opacity"]');
  await opacityInput.fill('50');
  await opacityInput.dispatchEvent('change');

  const layerProps = await page.evaluate(() => {
    const textL = window.__atelie.editor.state.handout.layers.find(l => l.kind === 'text');
    return { blend: textL.blend, opacity: textL.opacity };
  });
  assert.equal(layerProps.blend, 'multiply');
  assert.equal(layerProps.opacity, 0.5);

  // 5. Archive (save) -> stamp appears, reload recovers layers
  await page.click('button[data-action="archive"]');
  await page.waitForSelector('.archive-stamp-overlay.active', { timeout: 5000 });

  const currentUrl = page.url();
  assert.ok(currentUrl.includes('handout='), 'URL must include handout ID after archive');

  // Reload page
  await page.reload();
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);

  const recoveredDoc = await page.evaluate(() => {
    return {
      layersCount: window.__atelie.editor.state.handout.layers.length,
      hasText: window.__atelie.editor.state.handout.layers.some(l => l.kind === 'text'),
    };
  });
  assert.equal(recoveredDoc.layersCount, 2);
  assert.equal(recoveredDoc.hasText, true);

  // Verify recent rail and documents drawer
  const recentCount = await page.evaluate(() => {
    return document.querySelectorAll('.rail-recent-item').length;
  });
  assert.ok(recentCount >= 1, 'Rail should display recent document');

  await page.click('.rail-btn[data-action="documents"]');
  await page.waitForSelector('.doc-card-btn', { timeout: 5000 });
  const hasDocInDrawer = await page.evaluate(() => {
    return document.querySelectorAll('.doc-card-btn').length >= 1;
  });
  assert.ok(hasDocInDrawer, 'Documents drawer should list archived document');
  await page.click('.drawer-close-btn');

  // 6. Hide layer (eye) -> text disappears from canvas; Lock layer -> properties disabled
  await page.click('.inspector-tab[data-tab="layers"]');
  const eyeBtn = page.locator('.layer-item[data-index="1"] [data-action="toggle-visible"]');
  await eyeBtn.click();

  const isLayerHidden = await page.evaluate(() => {
    const l = window.__atelie.editor.state.handout.layers.find(x => x.kind === 'text');
    return !l.visible;
  });
  assert.ok(isLayerHidden, 'Layer should be hidden');

  // Lock layer
  const lockBtn = page.locator('.layer-item[data-index="1"] [data-action="toggle-lock"]');
  await lockBtn.click();

  // Switch to properties -> should be locked
  await page.click('.inspector-tab[data-tab="properties"]');
  const hasLockedBanner = await page.locator('.locked-banner').isVisible();
  assert.ok(hasLockedBanner, 'Properties panel should display locked banner');

  // Unlock and unhide
  await page.click('.inspector-tab[data-tab="layers"]');
  await eyeBtn.click();
  await lockBtn.click();

  // 7. Add Rect and reorder layers
  await page.click('[data-action="toggle-add-menu"]');
  await page.click('[data-add="rect"]');

  const beforeOrder = await page.evaluate(() => {
    return window.__atelie.editor.state.handout.layers.map(l => l.name);
  });

  // Move the Rect down
  const moveDownBtn = page.locator('.layer-item[data-index="2"] [data-action="move-down"]');
  await moveDownBtn.click();

  const afterOrder = await page.evaluate(() => {
    return window.__atelie.editor.state.handout.layers.map(l => l.name);
  });
  assert.notDeepEqual(beforeOrder, afterOrder, 'Layer order in handout should change after moving');

  // 8. Upload PNG and choose in image layer
  await page.click('[data-action="toggle-add-menu"]');
  await page.click('[data-add="image"]');

  await page.click('.inspector-tab[data-tab="properties"]');
  await page.click('button[data-action="open-image-picker"]');
  await page.waitForSelector('.at-modal', { timeout: 5000 });

  const png3x2 = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x03,
    0x00, 0x00, 0x00, 0x02,
    0x08, 0x02, 0x00, 0x00, 0x00,
    0x85, 0xb6, 0x52, 0x22,
    0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4e, 0x44,
    0xae, 0x42, 0x60, 0x82,
  ]);

  await page.setInputFiles('.image-upload-file-input', {
    name: 'foto-teste.png',
    mimeType: 'image/png',
    buffer: png3x2,
  });

  // Wait for modal to close and image to be assigned
  await page.waitForFunction(() => {
    const imgL = window.__atelie.editor.state.handout.layers.find(l => l.kind === 'image');
    return !!imgL?.image?.src?.upload;
  });

  const uploadSrc = await page.evaluate(() => {
    const imgL = window.__atelie.editor.state.handout.layers.find(l => l.kind === 'image');
    return imgL.image.src.upload;
  });
  assert.match(uploadSrc, /^up-[0-9a-f]{12}$/);

  assert.deepEqual(errors, []);
});

