import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';
import { createHandout } from '../../src/domain/handouts.js';

test('responsive e2e: 1600x950, 1024x768, 390x844, drawer, simplified editor, touch and container queries', { timeout: 120_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-responsive-e2e-'));
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

  // Helper to assert no horizontal scrollbar overflow
  async function assertNoHorizontalOverflow(page, label) {
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        hasOverflow: doc.scrollWidth > doc.clientWidth,
      };
    });
    assert.ok(
      !overflow.hasOverflow,
      `Expected no horizontal overflow on ${label}, but scrollWidth (${overflow.scrollWidth}) > clientWidth (${overflow.clientWidth})`
    );
  }

  // =========================================================================
  // VIEWPORT 1: Desktop Default (1600 × 950)
  // =========================================================================
  const page1600 = await browser.newPage({
    viewport: { width: 1600, height: 950 },
    hasTouch: false,
  });

  await page1600.goto(`${baseUrl}/?diagnostics`);
  await page1600.waitForFunction(() => !!window.__atelie?.editor?.state);

  await assertNoHorizontalOverflow(page1600, 'Desktop 1600x950');

  // Verify inspector is static flex column, drawer toggle is hidden
  const desktopLayout = await page1600.evaluate(() => {
    const inspector = document.querySelector('.app-inspector');
    const toggleBtn = document.querySelector('.desk-inspector-toggle-btn');
    const style = inspector ? window.getComputedStyle(inspector) : null;
    const btnStyle = toggleBtn ? window.getComputedStyle(toggleBtn) : null;
    return {
      position: style?.position,
      width: inspector?.offsetWidth,
      btnDisplay: btnStyle?.display,
    };
  });

  assert.notEqual(desktopLayout.position, 'fixed', 'Inspector should be static/flex, not fixed drawer on desktop');
  assert.equal(desktopLayout.btnDisplay, 'none', 'Inspector toggle button should be hidden on desktop >= 1100px');

  await page1600.screenshot({
    path: path.join(projectDir, 'docs/referencias/responsive-1600.png'),
    fullPage: false,
  });

  await page1600.close();

  // =========================================================================
  // VIEWPORT 2: Tablet / Narrow Desktop (1024 × 768) < 1100 px
  // =========================================================================
  const page1024 = await browser.newPage({
    viewport: { width: 1024, height: 768 },
    hasTouch: false,
  });

  await page1024.goto(`${baseUrl}/?diagnostics`);
  await page1024.waitForFunction(() => !!window.__atelie?.editor?.state);

  await assertNoHorizontalOverflow(page1024, 'Tablet 1024x768');

  // Verify inspector is in drawer mode (fixed position)
  const tabletLayout = await page1024.evaluate(() => {
    const inspector = document.querySelector('.app-inspector');
    const toggleBtn = document.querySelector('.desk-inspector-toggle-btn');
    const style = inspector ? window.getComputedStyle(inspector) : null;
    const btnStyle = toggleBtn ? window.getComputedStyle(toggleBtn) : null;
    return {
      position: style?.position,
      isOpen: inspector?.classList.contains('open'),
      btnDisplay: btnStyle?.display,
    };
  });

  assert.equal(tabletLayout.position, 'fixed', 'Inspector should become fixed drawer on < 1100px');
  assert.equal(tabletLayout.isOpen, false, 'Inspector drawer should start closed on narrow screens');
  assert.notEqual(tabletLayout.btnDisplay, 'none', 'Inspector toggle button must be visible on < 1100px');

  // Click toggle button to open drawer
  await page1024.click('.desk-inspector-toggle-btn');
  await page1024.waitForSelector('.app-inspector.open');

  const drawerOpened = await page1024.evaluate(() => {
    const inspector = document.querySelector('.app-inspector');
    const backdrop = document.querySelector('.app-inspector-backdrop');
    return {
      isOpen: inspector?.classList.contains('open'),
      backdropVisible: backdrop?.classList.contains('visible'),
    };
  });
  assert.ok(drawerOpened.isOpen, 'Inspector drawer should open when toggle button is clicked');
  assert.ok(drawerOpened.backdropVisible, 'Inspector backdrop should be visible when drawer is open');

  await assertNoHorizontalOverflow(page1024, 'Tablet 1024x768 with inspector open');

  // Click close button inside inspector
  await page1024.click('.inspector-close-btn');
  await page1024.waitForFunction(() => !document.querySelector('.app-inspector.open'));

  // Test Escape key closes inspector drawer
  await page1024.click('.desk-inspector-toggle-btn');
  await page1024.waitForSelector('.app-inspector.open');
  await page1024.keyboard.press('Escape');
  await page1024.waitForFunction(() => !document.querySelector('.app-inspector.open'));

  await page1024.screenshot({
    path: path.join(projectDir, 'docs/referencias/responsive-1024.png'),
    fullPage: false,
  });

  await page1024.close();

  // =========================================================================
  // VIEWPORT 3: Mobile (390 × 844) < 720 px
  // =========================================================================
  const page390 = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });

  await page390.goto(`${baseUrl}/?diagnostics`);
  await page390.waitForFunction(() => !!window.__atelie?.editor?.state);

  await assertNoHorizontalOverflow(page390, 'Mobile 390x844 (Editor)');

  // 1. Verify simplified properties (< 720px hides .prop-advanced)
  await page390.evaluate(() => {
    const state = window.__atelie.editor.state;
    const newLayer = {
      id: 'layer-test-text',
      name: 'Texto de teste',
      kind: 'text',
      visible: true,
      locked: false,
      opacity: 1,
      blend: 'normal',
      light: 'both',
      x: 100,
      y: 100,
      width: 400,
      height: 120,
      rotation: 0,
      text: {
        content: 'Texto responsivo',
        font: { family: 'Courier Prime', weight: 400 },
        size: 24,
        color: '#1d1b24',
        align: 'left',
      },
    };
    state.edit({
      ...state.handout,
      layers: [...state.handout.layers, newLayer],
      fields: [{ layerId: 'layer-test-text', label: 'Nome do Destinatário' }],
    });
    state.select('layer-test-text');
    window.__atelie.inspector.tab('properties');
    window.__atelie.inspector.open();
  });

  const mobileProps = await page390.evaluate(() => {
    const advancedEls = Array.from(document.querySelectorAll('.prop-advanced'));
    const allHidden = advancedEls.every(el => {
      const style = window.getComputedStyle(el);
      return style.display === 'none';
    });

    const nameField = document.querySelector('input[data-field="h:name"]');
    const xField = document.querySelector('input[data-field="h:x"]');
    const colorFieldEl = document.querySelector('input[data-field="h:text.color"]');

    return {
      advancedCount: advancedEls.length,
      allHidden,
      hasSimpleFields: Boolean(nameField && xField && colorFieldEl),
    };
  });

  assert.ok(mobileProps.advancedCount > 0, 'Inspector should have advanced controls');
  assert.ok(mobileProps.allHidden, 'All .prop-advanced elements must be hidden under 720px');
  assert.ok(mobileProps.hasSimpleFields, 'Simple fields (name, position, color) must remain present');

  // =========================================================================
  // TOUCH & GESTURES VERIFICATION (Coarse Pointer, Pinch, Pan, Handles)
  // =========================================================================
  // 1. Verify transform handles enlarged to 24px on touch
  await page390.waitForSelector('.stage-handle');

  const handleSize = await page390.evaluate(() => {
    const handle = document.querySelector('.stage-handle');
    if (!handle) return null;
    const rect = handle.getBoundingClientRect();
    return { width: Math.round(rect.width), height: Math.round(rect.height) };
  });

  assert.ok(handleSize, 'Handle should be present on selected layer');
  assert.ok(handleSize.width >= 24, `Handle width should be >= 24px on touch device, got ${handleSize.width}`);
  assert.ok(handleSize.height >= 24, `Handle height should be >= 24px on touch device, got ${handleSize.height}`);

  // 2. Pinch-to-zoom simulation on stage
  const pinchResult = await page390.evaluate(() => {
    const stage = window.__atelie.editor.stage;
    const initialZoom = stage.getZoom();
    const viewport = document.querySelector('.stage-viewport');

    // Simulate two touch pointers moving apart (pinch zoom in)
    const p1Down = new PointerEvent('pointerdown', { pointerId: 101, pointerType: 'touch', clientX: 150, clientY: 300, bubbles: true });
    const p2Down = new PointerEvent('pointerdown', { pointerId: 102, pointerType: 'touch', clientX: 250, clientY: 300, bubbles: true });
    viewport.dispatchEvent(p1Down);
    viewport.dispatchEvent(p2Down);

    // Move pointers apart to distance 200 (from 100) -> factor 2
    const p1Move = new PointerEvent('pointermove', { pointerId: 101, pointerType: 'touch', clientX: 100, clientY: 300, bubbles: true });
    const p2Move = new PointerEvent('pointermove', { pointerId: 102, pointerType: 'touch', clientX: 300, clientY: 300, bubbles: true });
    window.dispatchEvent(p1Move);
    window.dispatchEvent(p2Move);

    const midZoom = stage.getZoom();

    const p1Up = new PointerEvent('pointerup', { pointerId: 101, pointerType: 'touch', clientX: 100, clientY: 300, bubbles: true });
    const p2Up = new PointerEvent('pointerup', { pointerId: 102, pointerType: 'touch', clientX: 300, clientY: 300, bubbles: true });
    window.dispatchEvent(p1Up);
    window.dispatchEvent(p2Up);

    return { initialZoom, midZoom };
  });

  assert.ok(pinchResult.midZoom > pinchResult.initialZoom, 'Pinch out should increase zoom level');

  // 3. Long press opens context menu
  const contextMenuOpened = await page390.evaluate(async () => {
    const pageWrap = document.querySelector('.stage-page-wrap');
    const pDown = new PointerEvent('pointerdown', { pointerId: 201, pointerType: 'touch', clientX: 150, clientY: 350, bubbles: true });
    pageWrap.dispatchEvent(pDown);

    // Wait 550ms for long-press timer (500ms) to trigger
    await new Promise(r => setTimeout(r, 550));

    const menu = document.querySelector('.at-context-menu');
    const menuVisible = menu && window.getComputedStyle(menu).display !== 'none';

    // Release touch
    const pUp = new PointerEvent('pointerup', { pointerId: 201, pointerType: 'touch', clientX: 150, clientY: 350, bubbles: true });
    window.dispatchEvent(pUp);

    return Boolean(menuVisible);
  });

  assert.ok(contextMenuOpened, 'Long press touch should trigger context menu');

  // Close context menu
  await page390.keyboard.press('Escape');

  // 4. Container queries on inspector panel
  const cqResult = await page390.evaluate(() => {
    const inspector = document.querySelector('.app-inspector');
    // Set inspector width to 260px (under 290px container query threshold)
    inspector.style.width = '260px';
    const fieldRow = document.querySelector('.field-row');
    if (!fieldRow) return null;
    const direction = window.getComputedStyle(fieldRow).flexDirection;
    return { direction };
  });

  assert.ok(cqResult, 'Field row must exist in inspector panel');
  assert.equal(cqResult.direction, 'column', 'Container query should reorganize .field-row to column when container <= 290px');

  // =========================================================================
  // WORKFLOWS AT 390px: Preencher, Leitura, Tela de Início
  // =========================================================================
  // 1. Test Preencher (Fill mode) on 390px
  await page390.evaluate(() => {
    window.__atelie.inspector.tab('fill');
    window.__atelie.inspector.open();
  });
  await page390.waitForSelector('.fill-panel-root');
  await assertNoHorizontalOverflow(page390, 'Mobile 390x844 (Preencher mode)');

  // 2. Test Modo Leitura on 390px
  const testDoc = createHandout({ name: 'Documento de Teste' });
  await page390.evaluate(async (docData) => {
    const doc = await window.__atelie.api.handouts.create(docData);
    await window.__atelie.reading.open(doc.id);
  }, testDoc);
  await page390.waitForSelector('.at-reader');
  await assertNoHorizontalOverflow(page390, 'Mobile 390x844 (Modo Leitura)');

  // Close reader
  await page390.evaluate(() => {
    window.__atelie.reading.close();
  });
  await page390.waitForSelector('.at-reader', { state: 'hidden' });

  // 3. Test Start screen on 390px
  await page390.evaluate(() => {
    window.__atelie.inspector.close();
    window.__atelie.editor.showStartScreen();
  });
  await page390.waitForSelector('.at-start-screen');
  await assertNoHorizontalOverflow(page390, 'Mobile 390x844 (Tela de Início)');

  await page390.screenshot({
    path: path.join(projectDir, 'docs/referencias/responsive-390.png'),
    fullPage: false,
  });

  await page390.close();
});

