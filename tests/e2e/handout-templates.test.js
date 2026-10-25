import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { writePsd } from 'ag-psd';

import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';
import { useImageDataCanvas } from '../../scripts/library/lib/psd-canvas.js';
import { importPsdTemplates } from '../../scripts/library/import-psd.js';

test('imported PSD template e2e: instantiate, inspect fields, fill text and verify canvas change', { timeout: 90_000 }, async () => {
  useImageDataCanvas();

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-psd-template-e2e-'));
  const dataDir = path.join(tmpDir, 'data');
  const collectionDir = path.join(projectDir, 'public/colecao');
  const expansionsDir = path.join(tmpDir, 'expansoes');
  const expDir = path.join(expansionsDir, 'psd-test-expansion');
  const psdSourceDir = path.join(tmpDir, 'psd-source');
  const distDir = path.join(projectDir, 'dist');

  await mkdir(dataDir, { recursive: true });
  await mkdir(expDir, { recursive: true });
  await mkdir(psdSourceDir, { recursive: true });

  // 1. Create a synthetic PSD (background, multiply shadow, text layer)
  const bgData = new Uint8ClampedArray(200 * 200 * 4);
  for (let i = 0; i < 200 * 200; i++) {
    bgData[i * 4] = 240;
    bgData[i * 4 + 1] = 230;
    bgData[i * 4 + 2] = 210;
    bgData[i * 4 + 3] = 255;
  }

  const mulData = new Uint8ClampedArray(60 * 60 * 4);
  for (let i = 0; i < 60 * 60; i++) {
    mulData[i * 4] = 80;
    mulData[i * 4 + 1] = 70;
    mulData[i * 4 + 2] = 60;
    mulData[i * 4 + 3] = 200;
  }

  const compData = new Uint8ClampedArray(200 * 200 * 4);
  compData.set(bgData);

  const psdObj = {
    width: 200,
    height: 200,
    imageData: { width: 200, height: 200, data: compData },
    children: [
      {
        name: 'Fundo',
        left: 0,
        top: 0,
        right: 200,
        bottom: 200,
        blendMode: 'normal',
        opacity: 1,
        imageData: { width: 200, height: 200, data: bgData },
      },
      {
        name: 'Mancha Sombra',
        left: 20,
        top: 20,
        right: 80,
        bottom: 80,
        blendMode: 'multiply',
        opacity: 0.8,
        imageData: { width: 60, height: 60, data: mulData },
      },
      {
        name: 'Manchete',
        left: 20,
        top: 100,
        right: 180,
        bottom: 140,
        blendMode: 'normal',
        opacity: 1,
        text: {
          text: 'Texto Original do Modelo',
          transform: [1, 0, 0, 1, 20, 100],
          style: {
            fontSize: 16,
            fillColor: { r: 20, g: 20, b: 20 },
            font: { name: 'Lora' },
          },
          styleRuns: [
            {
              length: 24,
              style: {
                fontSize: 16,
                fillColor: { r: 20, g: 20, b: 20 },
                font: { name: 'Lora' },
              },
            },
          ],
        },
      },
    ],
  };

  const psdBuf = Buffer.from(writePsd(psdObj));
  await writeFile(path.join(psdSourceDir, '1- Recorte Jornal Teste.psd'), psdBuf);

  // 2. Run importer into temporary expansion
  const importResult = await importPsdTemplates({
    source: psdSourceDir,
    dest: expDir,
    force: true,
    logger: () => {}, // quiet
  });

  assert.equal(importResult.reports.length, 1, 'Deve converter o PSD de teste');
  const tplId = importResult.reports[0].id;

  // 3. Start server
  const app = await createApp({
    dataDir,
    collection: collectionDir,
    expansionsDir,
    distDir,
  });

  const server = app.listen(0);
  await once(server, 'listening');
  const port = server.address().port;

  // 4. Launch browser and navigate
  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  try {
    await page.goto(`http://127.0.0.1:${port}/?diagnostics&template=${tplId}`);
    await page.waitForFunction(() => !!window.__atelie && !!window.__atelie.editor);
    await page.waitForTimeout(300);

    const doc = await page.evaluate(() => window.__atelie.editor.state.handout);
    assert.ok(doc, 'Documento deve ser instanciado');
    assert.equal(doc.source.kind, 'template');
    assert.equal(doc.source.templateId, tplId);
    assert.equal(doc.fields.length, 1, 'Deve ter 1 campo editável');

    // Verify Preencher tab opened automatically
    const fillTabActive = await page.evaluate(() => {
      const tab = document.querySelector('.inspector-tab[data-tab="fill"]');
      return tab?.classList.contains('active');
    });
    assert.ok(fillTabActive, 'Aba "Preencher" deve abrir automaticamente');

    // Capture canvas snapshot before text replacement
    const canvasBefore = await page.evaluate(() => {
      const canvas = document.querySelector('.stage-canvas') || document.querySelector('canvas');
      return canvas?.toDataURL();
    });
    assert.ok(canvasBefore, 'Canvas deve estar renderizado');

    // Fill field
    const field = doc.fields[0];
    const input = page.locator(`.fill-field-input[data-field-id="${field.layerId}"]`);
    await input.waitFor({ state: 'visible' });

    await input.fill('Texto Modificado no Atelie E2E');
    await page.waitForTimeout(200);

    // Verify handout state updated
    const docUpdated = await page.evaluate(() => window.__atelie.editor.state.handout);
    const updatedLayer = docUpdated.layers.find(l => l.id === field.layerId);
    assert.equal(updatedLayer.text.content, 'Texto Modificado no Atelie E2E');

    // Capture canvas snapshot after text replacement
    const canvasAfter = await page.evaluate(() => {
      const canvas = document.querySelector('.stage-canvas') || document.querySelector('canvas');
      return canvas?.toDataURL();
    });
    assert.notEqual(canvasBefore, canvasAfter, 'Canvas deve atualizar visualmente ao trocar o texto');

    assert.equal(errors.length, 0, `Nenhum erro de página esperado: ${errors.join('; ')}`);
  } finally {
    await browser.close();
    server.close();
    await rm(tmpDir, { recursive: true, force: true });
  }
});

