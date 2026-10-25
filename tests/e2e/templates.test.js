import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('templates instantiation, fill mode, double-sided linking and UV e2e', { timeout: 90_000 }, async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-templates-e2e-'));
  const dataDir = path.join(tmpDir, 'data');
  const collectionDir = path.join(projectDir, 'public/colecao');
  const expansionsDir = path.join(tmpDir, 'expansoes');
  const distDir = path.join(projectDir, 'dist');

  await mkdir(dataDir, { recursive: true });
  await mkdir(expansionsDir, { recursive: true });

  const app = await createApp({
    dataDir,
    collection: collectionDir,
    expansionsDir,
    distDir,
  });

  const server = app.listen(0);
  await once(server, 'listening');
  const port = server.address().port;

  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  try {
    // -------------------------------------------------------------------------
    // 1. Template Standard: Carta envelhecida (?template=casa-tpl-carta-envelhecida)
    // -------------------------------------------------------------------------
    await page.goto(`http://127.0.0.1:${port}/?diagnostics&template=casa-tpl-carta-envelhecida`);
    await page.waitForFunction(() => !!window.__atelie && !!window.__atelie.editor);
    await page.waitForTimeout(300);

    const doc1 = await page.evaluate(() => window.__atelie.editor.state.handout);
    assert.equal(doc1.name, 'Carta envelhecida');
    assert.equal(doc1.source.kind, 'template');
    assert.equal(doc1.source.templateId, 'casa-tpl-carta-envelhecida');
    assert.ok(doc1.fields.length >= 1, 'Carta envelhecida deve ter campos');

    // Verify Fill tab is open automatically
    const fillTabActive1 = await page.evaluate(() => {
      const tab = document.querySelector('.inspector-tab[data-tab="fill"]');
      return tab?.classList.contains('active');
    });
    assert.ok(fillTabActive1, 'Aba "Preencher" deve abrir automaticamente ao instanciar modelo com campos');

    // Get canvas snapshot before edit
    const canvasBefore1 = await page.evaluate(() => {
      const canvas = document.querySelector('.stage-canvas') || document.querySelector('canvas');
      return canvas?.toDataURL();
    });

    // Locate field input for "Destinatário" and edit
    const destField = doc1.fields.find(f => f.label === 'Destinatário');
    assert.ok(destField, 'Campo Destinatário deve existir');
    const inputDest = page.locator(`.fill-field-input[data-field-id="${destField.layerId}"]`);
    await inputDest.waitFor({ state: 'visible' });

    await inputDest.fill('Prezado Inspetor Miller,');
    await page.waitForTimeout(150);

    const doc1Updated = await page.evaluate(() => window.__atelie.editor.state.handout);
    const updatedLayer = doc1Updated.layers.find(l => l.id === destField.layerId);
    assert.equal(updatedLayer.text.content, 'Prezado Inspetor Miller,', 'Edição no Preencher deve atualizar a camada');

    const canvasAfter1 = await page.evaluate(() => {
      const canvas = document.querySelector('.stage-canvas') || document.querySelector('canvas');
      return canvas?.toDataURL();
    });
    assert.notEqual(canvasBefore1, canvasAfter1, 'Canvas deve ser atualizado visualmente ao editar campo no Preencher');

    // -------------------------------------------------------------------------
    // 2. Template Frente e Verso: Polaroide (?template=casa-tpl-polaroide-frente)
    // -------------------------------------------------------------------------
    await page.goto(`http://127.0.0.1:${port}/?diagnostics&template=casa-tpl-polaroide-frente`);
    await page.waitForFunction(() => !!window.__atelie && !!window.__atelie.editor);
    await page.waitForTimeout(300);

    const frontDoc = await page.evaluate(() => window.__atelie.editor.state.handout);
    assert.equal(frontDoc.source.templateId, 'casa-tpl-polaroide-frente');
    assert.ok(frontDoc.back?.handoutId, 'Documento frente deve ter back.handoutId preenchido');

    // Check that verso document was auto-created in storage and linked back
    const backDocId = frontDoc.back.handoutId;
    const backDoc = await page.evaluate(async (id) => {
      return await window.__atelie.api.handouts.read(id);
    }, backDocId);

    assert.ok(backDoc, 'Documento de verso deve existir no armazenamento');
    assert.equal(backDoc.source.templateId, 'casa-tpl-polaroide-verso', 'Documento de verso deve ter templateId correto');
    assert.equal(backDoc.back?.handoutId, frontDoc.id, 'Verso deve apontar de volta para a frente');

    // Edit a field on front (Legenda)
    const legField = frontDoc.fields.find(f => f.label === 'Legenda');
    assert.ok(legField, 'Campo Legenda deve existir na frente');
    const inputLeg = page.locator(`.fill-field-input[data-field-id="${legField.layerId}"]`);
    await inputLeg.waitFor({ state: 'visible' });

    const canvasBefore2 = await page.evaluate(() => {
      const canvas = document.querySelector('.stage-canvas') || document.querySelector('canvas');
      return canvas?.toDataURL();
    });

    await inputLeg.fill('Noite de tempestade no farol abandonado');
    await page.waitForTimeout(150);

    const canvasAfter2 = await page.evaluate(() => {
      const canvas = document.querySelector('.stage-canvas') || document.querySelector('canvas');
      return canvas?.toDataURL();
    });
    assert.notEqual(canvasBefore2, canvasAfter2, 'Canvas da polaroide deve atualizar ao editar legenda');

    // -------------------------------------------------------------------------
    // 3. Template com UV: Diário de culto (?template=casa-tpl-diario-culto-uv)
    // -------------------------------------------------------------------------
    await page.goto(`http://127.0.0.1:${port}/?diagnostics&template=casa-tpl-diario-culto-uv`);
    await page.waitForFunction(() => !!window.__atelie && !!window.__atelie.editor);
    await page.waitForTimeout(300);

    const uvDoc = await page.evaluate(() => window.__atelie.editor.state.handout);
    assert.equal(uvDoc.source.templateId, 'casa-tpl-diario-culto-uv');

    // Confirm that UV layer exists
    const uvLayer = uvDoc.layers.find(l => l.light === 'uv');
    assert.ok(uvLayer, 'Diário de culto deve conter camada com light: "uv"');

    // Check Fill tab is active
    const fillTabActive3 = await page.evaluate(() => {
      const tab = document.querySelector('.inspector-tab[data-tab="fill"]');
      return tab?.classList.contains('active');
    });
    assert.ok(fillTabActive3, 'Aba Preencher deve estar ativa para o diário com UV');

    // Edit "Data" field and verify canvas update
    const dataField = uvDoc.fields.find(f => f.label === 'Data');
    assert.ok(dataField, 'Campo Data deve existir');
    const inputData = page.locator(`.fill-field-input[data-field-id="${dataField.layerId}"]`);
    await inputData.waitFor({ state: 'visible' });

    const canvasBefore3 = await page.evaluate(() => {
      const canvas = document.querySelector('.stage-canvas') || document.querySelector('canvas');
      return canvas?.toDataURL();
    });

    await inputData.fill('31 de Outubro — Vigília das Sombras');
    await page.waitForTimeout(150);

    const canvasAfter3 = await page.evaluate(() => {
      const canvas = document.querySelector('.stage-canvas') || document.querySelector('canvas');
      return canvas?.toDataURL();
    });
    assert.notEqual(canvasBefore3, canvasAfter3, 'Canvas do diário deve atualizar ao editar data');

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
    await rm(tmpDir, { recursive: true, force: true });
  }
});

