import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('reading mode e2e: rail button & shortcut P entry, full screen hide shell, loupe, UV lantern circle with pixel revelation, mouse wheel resize, flip back, arrow navigation, and escape exit', { timeout: 90_000 }, async (t) => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-reading-e2e-'));
  const dataDir = path.join(tmpDir, 'data');
  const collectionDir = path.join(projectDir, 'public/colecao');
  const distDir = path.join(projectDir, 'dist');

  await mkdir(dataDir, { recursive: true });

  const app = await createApp({
    dataDir,
    collection: collectionDir,
    distDir,
  });

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  t.after(async () => {
    await browser.close();
    await new Promise(r => server.close(r));
    await rm(tmpDir, { recursive: true, force: true });
  });

  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  // ---------------------------------------------------------------------------
  // 1. Load template Diário de culto · com UV
  // ---------------------------------------------------------------------------
  await page.goto(`${baseUrl}/?diagnostics&template=casa-tpl-diario-culto-uv`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state && !!window.__atelie?.reading);
  await page.waitForTimeout(400);

  // Archive as document so it's in storage and recents
  await page.click('[data-action="archive"]');
  await page.waitForTimeout(400);

  // ---------------------------------------------------------------------------
  // 2. Click Rail "Leitura" button to enter Reading mode
  // ---------------------------------------------------------------------------
  await page.click('.rail-btn[data-action="reader"]');
  await page.waitForSelector('#at-reader', { state: 'visible' });

  // Verify body class is-reading
  const isReading = await page.evaluate(() => document.body.classList.contains('is-reading'));
  assert.equal(isReading, true, 'body should have is-reading class');

  // Verify rail and inspector are hidden
  const railHidden = await page.evaluate(() => {
    const rail = document.querySelector('.app-rail');
    return window.getComputedStyle(rail).display === 'none';
  });
  const inspectorHidden = await page.evaluate(() => {
    const insp = document.querySelector('.app-inspector');
    return window.getComputedStyle(insp).display === 'none';
  });
  assert.equal(railHidden, true, 'rail should be hidden in reading mode');
  assert.equal(inspectorHidden, true, 'inspector should be hidden in reading mode');

  // Verify reading canvas rendered
  const canvasWidth = await page.evaluate(() => {
    const c = document.querySelector('.reader-canvas-front');
    return c?.width || 0;
  });
  assert.ok(canvasWidth > 0, 'reader front canvas should be rendered');

  // ---------------------------------------------------------------------------
  // 3. Test Loupe (L)
  // ---------------------------------------------------------------------------
  await page.keyboard.press('l');
  await page.waitForTimeout(100);

  const sheetBox = await page.locator('.reader-sheet').boundingBox();
  assert.ok(sheetBox, 'reader sheet should exist and have bounding box');

  // Move pointer onto sheet
  await page.mouse.move(sheetBox.x + 200, sheetBox.y + 200);
  await page.waitForTimeout(100);

  const loupePos = await page.evaluate(() => {
    const loupe = document.querySelector('.reader-loupe');
    return {
      display: window.getComputedStyle(loupe).display,
      left: parseFloat(loupe.style.left),
      top: parseFloat(loupe.style.top),
    };
  });
  assert.notEqual(loupePos.display, 'none', 'loupe should be visible when mouse is on sheet');
  assert.equal(Math.round(loupePos.left), Math.round(sheetBox.x + 200), 'loupe left matches cursor');
  assert.equal(Math.round(loupePos.top), Math.round(sheetBox.y + 200), 'loupe top matches cursor');

  // Toggle loupe off with L
  await page.keyboard.press('l');
  await page.waitForTimeout(100);
  const loupeHidden = await page.evaluate(() => {
    const loupe = document.querySelector('.reader-loupe');
    return window.getComputedStyle(loupe).display === 'none';
  });
  assert.equal(loupeHidden, true, 'loupe should hide after pressing L again');

  // ---------------------------------------------------------------------------
  // 4. Test UV Lantern (U)
  // ---------------------------------------------------------------------------
  await page.keyboard.press('u');
  await page.waitForTimeout(200);

  const lanternActive = await page.evaluate(() => {
    const overlay = document.querySelector('.reader-dark-overlay-front');
    const halo = document.querySelector('.reader-uv-halo');
    return overlay.classList.contains('is-active') && window.getComputedStyle(halo).display !== 'none';
  });
  assert.equal(lanternActive, true, 'UV lantern should be active with dark overlay and halo');

  // Position mouse over the secret message area:
  // Secret message layer is at x: 140, y: 1000, width: 960, height: 200 on 1240 × 1754 sheet.
  const msgTargetX = sheetBox.x + sheetBox.width * 0.5;
  const msgTargetY = sheetBox.y + sheetBox.height * (1100 / 1754);

  await page.mouse.move(msgTargetX, msgTargetY);
  await page.waitForTimeout(300);

  // Check pixel inside lantern circle vs outside lantern circle on lantern canvas
  const pixelCheck = await page.evaluate(() => {
    const lanternCanvas = document.querySelector('.reader-canvas-lantern-front');
    const ctx = lanternCanvas.getContext('2d');

    const px = Math.round(lanternCanvas.width * 0.5);
    const py = Math.round(lanternCanvas.height * (1100 / 1754));

    // Sample inside: in an area covered by the text
    const insideData = ctx.getImageData(Math.max(0, px - 60), Math.max(0, py - 20), 120, 40).data;
    let foundGreenInside = false;
    for (let i = 0; i < insideData.length; i += 4) {
      const r = insideData[i];
      const g = insideData[i + 1];
      const b = insideData[i + 2];
      const a = insideData[i + 3];
      if (a > 100 && r < 100 && g > 180 && b > 80) {
        foundGreenInside = true;
        break;
      }
    }

    // Sample outside the lantern circle: 260 px above py
    const outsideY = Math.max(0, py - 260);
    const outsidePixel = ctx.getImageData(px, outsideY, 1, 1).data;

    return {
      foundGreenInside,
      outsideAlpha: outsidePixel[3],
    };
  });

  assert.equal(pixelCheck.foundGreenInside, true, 'pixel inside UV lantern reveals green fluorescent layer');
  assert.equal(pixelCheck.outsideAlpha, 0, 'pixel outside UV lantern circle is completely transparent/masked');

  // Test mouse wheel resize on lantern circle
  const initialHaloWidth = await page.evaluate(() => {
    return parseInt(document.querySelector('.reader-uv-halo').style.width, 10);
  });
  await page.mouse.wheel(0, -120); // scroll up = enlarge
  await page.waitForTimeout(150);
  const enlargedHaloWidth = await page.evaluate(() => {
    return parseInt(document.querySelector('.reader-uv-halo').style.width, 10);
  });
  assert.ok(enlargedHaloWidth > initialHaloWidth, 'wheel scroll up should enlarge lantern radius');

  // Capture reference screenshot docs/referencias/atelie-leitura-uv.png (1600 × 950)
  await page.screenshot({ path: path.join(projectDir, 'docs/referencias/atelie-leitura-uv.png') });

  // Toggle lantern off
  await page.keyboard.press('u');
  await page.waitForTimeout(100);

  // ---------------------------------------------------------------------------
  // 5. Test Escape exits reading mode
  // ---------------------------------------------------------------------------
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  const isReadingAfterEsc = await page.evaluate(() => document.body.classList.contains('is-reading'));
  assert.equal(isReadingAfterEsc, false, 'body should not have is-reading class after Esc');
  const readerHidden = await page.evaluate(() => {
    const reader = document.querySelector('#at-reader');
    return window.getComputedStyle(reader).display === 'none';
  });
  assert.equal(readerHidden, true, 'reader root should be hidden after Esc');

  // ---------------------------------------------------------------------------
  // 6. Test Two-Sided document flip (F)
  // ---------------------------------------------------------------------------
  await page.goto(`${baseUrl}/?diagnostics&template=casa-tpl-polaroide-frente`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state && !!window.__atelie?.reading);
  await page.waitForTimeout(400);

  // Press P to enter reader
  await page.keyboard.press('p');
  await page.waitForSelector('#at-reader', { state: 'visible' });

  // Press F to flip
  await page.keyboard.press('f');
  await page.waitForTimeout(400);

  const isFlipped = await page.evaluate(() => {
    return document.querySelector('.reader-sheet')?.classList.contains('is-flipped');
  });
  assert.equal(isFlipped, true, 'sheet should have is-flipped class after pressing F');

  // Flip back
  await page.keyboard.press('f');
  await page.waitForTimeout(400);
  const isFlippedBack = await page.evaluate(() => {
    return document.querySelector('.reader-sheet')?.classList.contains('is-flipped');
  });
  assert.equal(isFlippedBack, false, 'sheet should not have is-flipped class after pressing F again');

  // ---------------------------------------------------------------------------
  // 7. Test Navigation between documents (ArrowRight / ArrowLeft)
  // ---------------------------------------------------------------------------
  // Archive this polaroide so there are 2 archived documents in storage
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.click('[data-action="archive"]');
  await page.waitForTimeout(800);

  // Enter reader
  await page.keyboard.press('p');
  await page.waitForSelector('#at-reader', { state: 'visible' });

  const initialDocName = await page.evaluate(() => window.__atelie.reading.currentHandout?.name);

  // Press ArrowRight to navigate carousel
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);

  const nextDocName = await page.evaluate(() => window.__atelie.reading.currentHandout?.name);
  assert.notEqual(initialDocName, nextDocName, 'ArrowRight should transition to next document');

  // Exit reader with Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // Editor should be loaded with the active document from reading
  const editorDocName = await page.evaluate(() => window.__atelie.editor.state.handout?.name);
  assert.equal(editorDocName, nextDocName, 'Editor should reflect the current document when exiting reader');
});

