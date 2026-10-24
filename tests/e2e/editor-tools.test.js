import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('editor tools e2e: rulers, guides with snap, history navigation, mini-bar, eyedropper, external drop, copy/paste across docs, align, and context menu', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-editor-tools-e2e-'));
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

  // 1. Initial page load
  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);

  // 2. Drag a guide from horizontal ruler onto the page
  await page.waitForSelector('.stage-ruler-h', { state: 'visible' });
  const rulerH = page.locator('.stage-ruler-h');
  const rulerHBox = await rulerH.boundingBox();
  const pageWrap = page.locator('.stage-page-wrap');
  const pageWrapBox = await pageWrap.boundingBox();

  const startX = pageWrapBox.x + 200;
  const startY = rulerHBox.y + 10;
  const targetScreenY = pageWrapBox.y + 180;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, targetScreenY, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(100);

  // Verify guide was created
  const guides = await page.evaluate(() => window.__atelie.editor.state.handout.guides);
  assert.ok(guides && Array.isArray(guides.y) && guides.y.length > 0, 'Document should have a Y guide');
  const guideY = guides.y[0];
  await page.waitForSelector('.stage-doc-guide-y', { state: 'visible' });

  // 3. Test snap to guide
  // Add text layer
  await page.click('.inspector-tab[data-tab="layers"]');
  await page.click('[data-action="toggle-add-menu"]');
  await page.click('[data-add="text"]');
  await page.waitForTimeout(100);

  // Position layer top near guideY (within 4 px)
  await page.evaluate((targetY) => {
    const s = window.__atelie.editor.state;
    const l = s.handout.layers.find(x => x.id === s.selection);
    s.edit({
      ...s.handout,
      layers: s.handout.layers.map(x => (x.id === l.id ? { ...x, rotation: 0, y: targetY - 4 } : x)),
    });
  }, guideY);

  // Wait for outline to update to the new position
  await page.waitForFunction((targetY) => {
    const el = document.querySelector('.stage-selection-outline');
    if (!el || !window.__atelie?.editor?.stage) return false;
    const top = parseInt(el.style.top, 10);
    const zoom = window.__atelie.editor.stage.getZoom();
    return Math.abs(top - Math.round((targetY - 4) * zoom)) <= 2;
  }, guideY);

  // Nudge by dragging selection outline to trigger snapBox
  const outline = page.locator('.stage-selection-outline');
  const outlineBounds = await outline.boundingBox();
  const oCenterX = outlineBounds.x + outlineBounds.width / 2;
  const oCenterY = outlineBounds.y + outlineBounds.height / 2;

  await page.mouse.move(oCenterX, oCenterY);
  await page.mouse.down();
  await page.mouse.move(oCenterX, oCenterY + 1, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(100);

  const snappedLayerY = await page.evaluate(() => {
    const s = window.__atelie.editor.state;
    const l = s.handout.layers.find(x => x.id === s.selection);
    return l.y;
  });
  assert.equal(snappedLayerY, guideY, 'Layer should snap exactly to the document guide');

  // 4. Mini-bar: duplicate layer
  await page.waitForSelector('.stage-selection-bar', { state: 'visible' });
  const layersCountBeforeDup = await page.evaluate(() => window.__atelie.editor.state.handout.layers.length);
  await page.click('.sel-bar-btn[data-action="duplicate"]');
  await page.waitForTimeout(100);
  const layersCountAfterDup = await page.evaluate(() => window.__atelie.editor.state.handout.layers.length);
  assert.equal(layersCountAfterDup, layersCountBeforeDup + 1, 'Mini-bar duplicate should add 1 layer');

  // Edit: add rectangle shape layer
  await page.click('.inspector-tab[data-tab="layers"]');
  await page.click('[data-action="toggle-add-menu"]');
  await page.click('[data-add="rect"]');
  await page.waitForTimeout(100);

  // Edit: change rect fill to red #ff0000
  await page.click('.inspector-tab[data-tab="properties"]');
  const hexInput = page.locator('input[data-hex="h:shape.fill"]');
  await hexInput.fill('#ff0000');
  await hexInput.press('Enter');
  await hexInput.dispatchEvent('change', { bubbles: true });
  await page.waitForTimeout(100);

  const rectFillCheck = await page.evaluate(() => {
    const rct = window.__atelie.editor.state.handout.layers.find(l => l.name === 'Retângulo');
    return rct?.shape?.fill;
  });
  assert.equal(rectFillCheck, '#ff0000', 'Rect fill should be changed to #ff0000');

  // 5. History panel: switch to history tab and capture reference screenshot
  await page.click('.inspector-tab[data-tab="history"]');
  await page.waitForSelector('.history-step-btn', { state: 'visible' });

  // Capture reference screenshot with rulers, guide, mini-bar, and history visible
  await page.screenshot({ path: path.join(projectDir, 'docs/referencias/atelie-editor-ferramentas.png') });

  const historyInfo = await page.evaluate(() => {
    const s = window.__atelie.editor.state;
    return {
      stepIndex: s.stepIndex,
      totalSteps: s.steps.length,
    };
  });
  assert.ok(historyInfo.stepIndex >= 3, 'History step index should be at least 3');

  // Navigate 3 steps back
  const targetStepIndex = historyInfo.stepIndex - 3;
  await page.click(`.history-step-btn[data-index="${targetStepIndex}"]`);
  await page.waitForTimeout(100);

  const historyNavigated = await page.evaluate(() => window.__atelie.editor.state.stepIndex);
  assert.equal(historyNavigated, targetStepIndex, 'Clicking history item should navigate back 3 steps');

  // Go forward back to the latest step
  await page.click(`.history-step-btn[data-index="${historyInfo.stepIndex}"]`);
  await page.waitForTimeout(100);

  // 6. Eyedropper: select text layer, press 'i', click on red rect, verify text color becomes #ff0000
  const layersMeta = await page.evaluate(() => {
    const s = window.__atelie.editor.state;
    const txt = s.handout.layers.find(l => l.kind === 'text');
    const rct = s.handout.layers.find(l => l.name === 'Retângulo');
    // Place rect at top-left (50, 50) with 200x200 and fill #ff0000 so it is easily sampled
    s.edit({
      ...s.handout,
      layers: s.handout.layers.map(l =>
        l.id === rct.id ? { ...l, x: 50, y: 50, width: 200, height: 200, shape: { ...l.shape, fill: '#ff0000' } } : l
      ),
    });
    s.select(txt.id);
    return { textId: txt.id, rectId: rct.id };
  });
  await page.waitForTimeout(200);

  // Ensure active element is blurred before pressing 'i'
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('i');
  await page.waitForSelector('.stage-eyedropper-loupe', { state: 'visible' });

  const zoom = await page.evaluate(() => window.__atelie.editor.stage.getZoom());
  const freshPageBox = await page.locator('.stage-page-wrap').boundingBox();
  const rectScreenX = freshPageBox.x + 100 * zoom;
  const rectScreenY = freshPageBox.y + 100 * zoom;

  await page.mouse.click(rectScreenX, rectScreenY);
  await page.waitForTimeout(200);

  const updatedTextColor = await page.evaluate((tid) => {
    const l = window.__atelie.editor.state.handout.layers.find(x => x.id === tid);
    return l.text.color;
  }, layersMeta.textId);
  assert.equal(updatedTextColor.toLowerCase(), '#ff0000', 'Eyedropper should sample red and apply to text');

  // 7. External Image Drag-and-Drop via DataTransfer
  const pngBuffer = await sharp({
    create: { width: 60, height: 40, channels: 4, background: { r: 50, g: 150, b: 250, alpha: 1 } },
  }).png().toBuffer();

  await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const file = new File([bytes], 'evidencia-drop.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(file);
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt,
      clientX: 500,
      clientY: 400,
    });
    document.getElementById('desk-stage').dispatchEvent(dropEvent);
  }, pngBuffer.toString('base64'));

  await page.waitForFunction(() =>
    window.__atelie.editor.state.handout.layers.some(l => l.name === 'evidencia-drop')
  );

  const droppedLayer = await page.evaluate(() => {
    const l = window.__atelie.editor.state.handout.layers.find(x => x.name === 'evidencia-drop');
    return { kind: l.kind, hasUpload: !!l.image?.src?.upload };
  });
  assert.equal(droppedLayer.kind, 'image');
  assert.equal(droppedLayer.hasUpload, true);

  // 8. Ctrl+C / Ctrl+V across documents
  await page.keyboard.press('Control+c');
  await page.waitForTimeout(100);

  // Create and switch to Document B
  await page.evaluate(() => {
    window.__atelie.editor.createDocument({ name: 'Documento B', preset: 'carta' });
  });
  await page.waitForFunction(() => window.__atelie.editor.state.handout.name === 'Documento B');

  const docBLayersCountBefore = await page.evaluate(() => window.__atelie.editor.state.handout.layers.length);
  assert.equal(docBLayersCountBefore, 1, 'Fresh document B should have 1 layer (Papel)');

  // Paste with Ctrl+V
  await page.keyboard.press('Control+v');
  await page.waitForFunction(() => window.__atelie.editor.state.handout.layers.length === 2);

  const pastedLayer = await page.evaluate(() => {
    const s = window.__atelie.editor.state;
    const l = s.handout.layers.find(x => x.id === s.selection);
    return { name: l.name, kind: l.kind, hasUpload: !!l.image?.src?.upload };
  });
  assert.equal(pastedLayer.name, 'evidencia-drop');
  assert.equal(pastedLayer.kind, 'image');
  assert.equal(pastedLayer.hasUpload, true);

  // 9. Align to page center
  await page.click('.inspector-tab[data-tab="properties"]');
  await page.click('.align-btn[data-align="center-h"]');
  await page.waitForTimeout(100);
  await page.click('.align-btn[data-align="center-v"]');
  await page.waitForTimeout(100);

  const centeredCheck = await page.evaluate(() => {
    const s = window.__atelie.editor.state;
    const l = s.handout.layers.find(x => x.id === s.selection);
    const cx = l.x + l.width / 2;
    const cy = l.y + l.height / 2;
    const px = s.handout.page.width / 2;
    const py = s.handout.page.height / 2;
    return { diffX: Math.abs(cx - px), diffY: Math.abs(cy - py) };
  });
  assert.ok(centeredCheck.diffX <= 1, 'Layer horizontal center should match page center');
  assert.ok(centeredCheck.diffY <= 1, 'Layer vertical center should match page center');

  // 10. Context menu -> Excluir
  await page.locator('.stage-selection-outline').click({ button: 'right' });
  await page.waitForSelector('.at-context-menu', { state: 'visible' });
  await page.click('.at-context-menu-item.is-danger');
  await page.waitForTimeout(100);

  const finalLayersCount = await page.evaluate(() => window.__atelie.editor.state.handout.layers.length);
  assert.equal(finalLayersCount, 1, 'Layer should be removed via context menu Excluir');

  assert.deepEqual(errors, []);
});
