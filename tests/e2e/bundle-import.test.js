import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import os from 'node:os';
import { stat, mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { writePsdBuffer } from 'ag-psd';

const distPagesDir = path.resolve('dist-pages');

// Minimal 1x1 transparent PNG buffer
const DUMMY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

test('bundle import e2e: shallow scan, preview listing, JIT conversion, and editor opening', { timeout: 90_000 }, async (t) => {
  const distStat = await stat(distPagesDir).catch(() => null);
  assert.ok(distStat && distStat.isDirectory(), 'dist-pages/ deve existir antes do teste.');

  // Set up static Express server serving /Atelie/
  const app = express();
  app.use('/Atelie', express.static(distPagesDir));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  const atelieUrl = `http://127.0.0.1:${port}/Atelie/?diagnostics`;

  // Create temporary test bundle directory
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-e2e-bundle-'));
  const bundleDir = path.join(tempDir, 'Bundle 18 - Bilhetes e Notas');
  const prevDir = path.join(bundleDir, 'Prévias');
  await mkdir(prevDir, { recursive: true });

  // Generate real valid PSD buffer using ag-psd
  const psdBuf = writePsdBuffer({
    width: 400,
    height: 600,
    children: [
      {
        name: 'Nota Secreta',
        text: {
          text: 'Pista deixada no armazém',
          transform: [1, 0, 0, 1, 40, 80],
          style: { fontSize: 24 },
        },
      },
    ],
  });

  const psdFilePath = path.join(bundleDir, '1- Bilhete Secreto.psd');
  const prevFilePath = path.join(prevDir, '1- Bilhete Secreto.png');

  await writeFile(psdFilePath, Buffer.from(psdBuf));
  await writeFile(prevFilePath, DUMMY_PNG);

  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-pw-bundle-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    viewport: { width: 1400, height: 900 },
  });

  t.after(async () => {
    await context.close().catch(() => {});
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    await new Promise(resolve => server.close(resolve));
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('atelie-welcome', 'done');
  });
  await page.goto(atelieUrl);
  await page.waitForLoadState('networkidle');

  // 1. Open templates drawer
  await page.click('.app-rail [data-action="templates"]');
  await page.waitForSelector('.templates-drawer-view', { timeout: 10_000 });

  // 2. Load bundle folder via input
  const bundleFolderInput = page.locator('.templates-bundle-folder-input');
  await bundleFolderInput.setInputFiles(bundleDir);

  // 3. Verify card appears in the grid with JIT badge
  await page.waitForSelector('.template-card[data-id*="bilhete-secreto"]', { timeout: 10_000 });
  const card = page.locator('.template-card[data-id*="bilhete-secreto"]').first();
  const cardTitle = await card.locator('.template-card-title').innerText();
  assert.equal(cardTitle, 'Bilhete Secreto');

  const jitBadge = card.locator('.template-badge.is-jit');
  assert.equal(await jitBadge.count(), 1, 'Deve exibir badge JIT no card pendente');

  // 4. Click card to open detail view
  await card.click();
  await page.waitForSelector('.template-detail-view', { timeout: 5_000 });

  const useBtn = page.locator('.template-detail-view [data-action="use-template"]');
  assert.match(await useBtn.innerText(), /Preparar e usar este modelo/i);

  // 5. Click "Preparar e usar este modelo" to trigger JIT conversion
  await useBtn.click();

  // Progress dialog should appear
  await page.waitForSelector('#at-conversion-modal', { timeout: 5_000 });

  // Wait for conversion to complete and editor to load document
  await page.waitForFunction(() => {
    return window.__atelie?.editor?.state?.handout?.name === 'Bilhete Secreto';
  }, { timeout: 20_000 });

  const loadedDocName = await page.evaluate(() => window.__atelie.editor.state.handout.name);
  assert.equal(loadedDocName, 'Bilhete Secreto');

  const textLayerContent = await page.evaluate(() => {
    const layers = window.__atelie.editor.state.handout.layers || [];
    const textLayer = layers.find(l => l.kind === 'text');
    return textLayer?.text?.content;
  });
  assert.equal(textLayerContent, 'Pista deixada no armazém');
});
