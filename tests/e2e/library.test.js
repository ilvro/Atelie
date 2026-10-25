import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('library drawer and fill mode e2e', { timeout: 90_000 }, async (t) => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-library-e2e-'));
  const dataDir = path.join(tmpDir, 'data');
  const collectionDir = path.join(tmpDir, 'colecao');
  const expansionsDir = path.join(tmpDir, 'expansoes');
  const distDir = path.join(projectDir, 'dist');

  await mkdir(dataDir, { recursive: true });
  await mkdir(path.join(collectionDir, 'papeis'), { recursive: true });
  await mkdir(path.join(collectionDir, 'texturas'), { recursive: true });
  await mkdir(path.join(collectionDir, 'elementos'), { recursive: true });
  await mkdir(path.join(collectionDir, 'fontes/ofl/courierprime'), { recursive: true });
  await mkdir(path.join(collectionDir, 'previews'), { recursive: true });

  // Generate tiny dummy WebP files for testing
  const dummyWebp = await sharp({
    create: { width: 64, height: 64, channels: 4, background: { r: 200, g: 180, b: 150, alpha: 1 } },
  }).webp().toBuffer();

  const dummyBloodWebp = await sharp({
    create: { width: 64, height: 64, channels: 4, background: { r: 180, g: 20, b: 20, alpha: 1 } },
  }).webp().toBuffer();

  await writeFile(path.join(collectionDir, 'papeis/papel-teste.webp'), dummyWebp);
  await writeFile(path.join(collectionDir, 'previews/papel-teste.webp'), dummyWebp);
  await writeFile(path.join(collectionDir, 'texturas/mancha-teste.webp'), dummyWebp);
  await writeFile(path.join(collectionDir, 'previews/mancha-teste.webp'), dummyWebp);
  await writeFile(path.join(collectionDir, 'texturas/sangue-teste.webp'), dummyBloodWebp);
  await writeFile(path.join(collectionDir, 'previews/sangue-teste.webp'), dummyBloodWebp);

  const dummySvg = '<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="80" fill="currentColor"/></svg>';
  await writeFile(path.join(collectionDir, 'elementos/carimbo-teste.svg'), dummySvg, 'utf8');
  await writeFile(path.join(collectionDir, 'previews/carimbo-teste.webp'), dummyWebp);

  // Copy one real font from repo
  const sourceFont = path.join(projectDir, 'public/colecao/fontes/ofl/courierprime/CourierPrime-Regular.ttf');
  await copyFile(sourceFont, path.join(collectionDir, 'fontes/ofl/courierprime/CourierPrime-Regular.ttf'));

  // House collection manifest
  const houseManifest = {
    schema: 1,
    items: [
      {
        id: 'casa-papel-teste',
        kind: 'image',
        name: 'Papel Teste',
        category: 'Papéis',
        file: 'papeis/papel-teste.webp',
        preview: 'previews/papel-teste.webp',
        width: 1240,
        height: 1754,
      },
      {
        id: 'casa-mancha-teste',
        kind: 'image',
        name: 'Mancha Teste',
        category: 'Manchas',
        file: 'texturas/mancha-teste.webp',
        preview: 'previews/mancha-teste.webp',
        width: 400,
        height: 400,
      },
      {
        id: 'casa-carimbo-teste',
        kind: 'image',
        name: 'Carimbo Teste',
        category: 'Carimbos',
        file: 'elementos/carimbo-teste.svg',
        preview: 'previews/carimbo-teste.webp',
        width: 300,
        height: 120,
      },
      {
        id: 'casa-sangue-2',
        kind: 'image',
        name: 'Sangue · gotas múltiplas',
        category: 'Sangue',
        file: 'texturas/sangue-teste.webp',
        preview: 'previews/sangue-teste.webp',
        width: 400,
        height: 400,
      },
      {
        id: 'casa-font-courier-teste',
        kind: 'font',
        name: 'Courier Prime Teste',
        family: 'Courier Prime',
        category: 'Máquina de escrever',
        file: 'fontes/ofl/courierprime/CourierPrime-Regular.ttf',
        weight: 400,
        style: 'normal',
      },
    ],
  };
  await writeFile(path.join(collectionDir, 'library.json'), JSON.stringify(houseManifest), 'utf8');

  // Expansion "teste"
  const expTesteDir = path.join(expansionsDir, 'teste');
  await mkdir(path.join(expTesteDir, 'elementos'), { recursive: true });
  await mkdir(path.join(expTesteDir, 'previews'), { recursive: true });
  await writeFile(path.join(expTesteDir, 'manifest.json'), JSON.stringify({ id: 'teste', name: 'Expansão Teste' }), 'utf8');
  await writeFile(path.join(expTesteDir, 'elementos/sangue-teste.webp'), dummyWebp);
  await writeFile(path.join(expTesteDir, 'previews/sangue-teste.webp'), dummyWebp);

  const expManifest = {
    schema: 1,
    items: [
      {
        id: 'teste-sangue-1',
        kind: 'element',
        name: 'Sangue Teste',
        category: 'Sangue',
        file: 'elementos/sangue-teste.webp',
        preview: 'previews/sangue-teste.webp',
        width: 300,
        height: 300,
      },
    ],
  };
  await writeFile(path.join(expTesteDir, 'library.json'), JSON.stringify(expManifest), 'utf8');

  const app = await createApp({ dataDir, collection: collectionDir, expansionsDir, distDir });
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
    await rm(tmpDir, { recursive: true, force: true });
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);

  // 1. Open library drawer
  await page.click('.rail-btn[data-action="library"]');
  await page.waitForSelector('.library-drawer-inner', { state: 'visible' });

  // List 5 elements (4 house image elements + 1 expansion element; font is under fonts tab)
  const itemCards = page.locator('.library-item-card');
  const initialCount = await itemCards.count();
  assert.equal(initialCount, 5, 'Should display 4 house elements and 1 expansion element');

  // Verify expansion item has source stamp
  const expCard = page.locator('.library-item-card[data-id="teste-sangue-1"]');
  await expCard.waitFor({ state: 'visible' });
  const stampText = await expCard.locator('.library-expansion-stamp').textContent();
  assert.equal(stampText.trim(), 'teste');

  // Click "Coleção do Ateliê" source chip -> expansion item is hidden
  const casaChip = page.locator('.library-source-chips button[data-source="casa"]');
  await casaChip.click();
  await page.waitForTimeout(50);
  const countAfterCasa = await page.locator('.library-item-card').count();
  assert.equal(countAfterCasa, 4, 'Filtering by house collection should hide expansion item');

  // Click "Tudo" source chip -> expansion item appears again
  const allChip = page.locator('.library-source-chips button[data-source="all"]');
  await allChip.click();
  await page.waitForTimeout(50);
  assert.equal(await page.locator('.library-item-card').count(), 5);

  // 2. Click on stain -> new layer with blend 'multiply'
  const stainCard = page.locator('.library-item-card[data-id="casa-mancha-teste"]');
  await stainCard.click();
  await page.waitForTimeout(100);

  const stainLayer = await page.evaluate(() => {
    const doc = window.__atelie.editor.state.handout;
    return doc.layers.find(l => l.image?.src?.library === 'casa-mancha-teste');
  });
  assert.ok(stainLayer, 'Stain layer should be added');
  assert.equal(stainLayer.blend, 'multiply', 'Stain layer must have blend multiply');

  // Shift + click on paper -> layer at bottom covering page
  const paperCard = page.locator('.library-item-card[data-id="casa-papel-teste"]');
  await paperCard.click({ modifiers: ['Shift'] });
  await page.waitForTimeout(100);

  const bottomLayer = await page.evaluate(() => {
    const doc = window.__atelie.editor.state.handout;
    const p = doc.layers.find(l => l.image?.src?.library === 'casa-papel-teste');
    return {
      id: p?.image?.src?.library,
      width: p?.width,
      height: p?.height,
      pageW: doc.page.width,
      pageH: doc.page.height,
      fit: p?.image?.fit,
      index: doc.layers.indexOf(p),
    };
  });
  assert.equal(bottomLayer.id, 'casa-papel-teste', 'Paper must be present in layers');
  assert.equal(bottomLayer.index, 1, 'Paper must be inserted directly above base paper (index 1)');
  assert.equal(bottomLayer.width, bottomLayer.pageW, 'Paper must cover page width');
  assert.equal(bottomLayer.height, bottomLayer.pageH, 'Paper must cover page height');
  assert.equal(bottomLayer.fit, 'cover');

  // Click on stamp -> layer has dark blue tint
  const stampCard = page.locator('.library-item-card[data-id="casa-carimbo-teste"]');
  await stampCard.click();
  await page.waitForTimeout(100);

  const stampLayer = await page.evaluate(() => {
    const doc = window.__atelie.editor.state.handout;
    return doc.layers.find(l => l.image?.src?.library === 'casa-carimbo-teste');
  });
  assert.ok(stampLayer, 'Stamp layer should be added');
  assert.equal(stampLayer.image?.tint?.color, '#1f2f6b', 'Stamp must have dark blue tint');

  // 3. Drag expansion element onto page at specific position
  const stageWrap = page.locator('.stage-page-wrap');
  const stageBox = await stageWrap.boundingBox();

  // Trigger custom drop on stage with expansion item data
  await page.evaluate(dropTarget => {
    const item = {
      id: 'teste-sangue-1',
      name: 'Sangue Teste',
      category: 'Sangue',
      width: 300,
      height: 300,
    };
    const dt = new DataTransfer();
    dt.setData('text/x-atelie-library', JSON.stringify(item));
    dt.setData('application/json', JSON.stringify({ libraryId: item.id, item }));

    const evt = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt,
      clientX: dropTarget.x + 150,
      clientY: dropTarget.y + 150,
    });
    document.getElementById('desk-stage').dispatchEvent(evt);
  }, { x: stageBox.x, y: stageBox.y });

  await page.waitForTimeout(100);

  const draggedLayer = await page.evaluate(() => {
    const doc = window.__atelie.editor.state.handout;
    return doc.layers.find(l => l.image?.src?.library === 'teste-sangue-1');
  });
  assert.ok(draggedLayer, 'Dragged expansion item must create an image layer');
  assert.equal(draggedLayer.blend, 'multiply', 'Sangue layer must have blend multiply');

  // 4. Favorite and filter by favorites
  const favBtn = page.locator('.library-item-card[data-id="casa-mancha-teste"] .library-item-fav-btn');
  await favBtn.click();
  await page.waitForTimeout(50);

  const favFilterChip = page.locator('.library-fav-chip');
  await favFilterChip.click();
  await page.waitForTimeout(50);

  const favCount = await page.locator('.library-item-card').count();
  assert.equal(favCount, 1, 'Only favorited item should be visible');
  assert.equal(await page.locator('.library-item-card').getAttribute('data-id'), 'casa-mancha-teste');

  // Turn off favorite filter
  await favFilterChip.click();
  await page.waitForTimeout(50);
  assert.equal(await page.locator('.library-item-card').count(), 5);

  // 5. Font applied to text layer updates text.font.library
  // First, add text layer
  await page.click('.inspector-tab[data-tab="layers"]');
  await page.click('[data-action="toggle-add-menu"]');
  await page.click('[data-add="text"]');
  await page.waitForTimeout(100);

  // Switch library to Fonts tab (ensure library drawer is open)
  const isDrawerOpen = await page.evaluate(() => document.getElementById('app-drawer')?.classList.contains('open'));
  if (!isDrawerOpen) {
    await page.click('.rail-btn[data-action="library"]');
    await page.waitForSelector('.library-drawer-inner', { state: 'visible' });
  }

  const fontsTabChip = page.locator('.library-type-chips button[data-type="fonts"]');
  await fontsTabChip.click();
  await page.waitForTimeout(100);

  const fontCard = page.locator('.library-font-card[data-id="casa-font-courier-teste"]');
  await fontCard.waitFor({ state: 'visible' });
  await fontCard.click();
  await page.waitForTimeout(100);

  const appliedFontLib = await page.evaluate(() => {
    const doc = window.__atelie.editor.state.handout;
    const l = doc.layers.find(x => x.id === window.__atelie.editor.state.selection);
    return l?.text?.font?.library;
  });
  assert.equal(appliedFontLib, 'casa-font-courier-teste', 'Font library ID must update to selected font');

  // 6. Open a model with fields -> Fill tab opens automatically, editing changes canvas, sample button fills text
  const docWithFields = {
    id: 'doc-modelo-teste',
    name: 'Ficha de Investigador',
    page: { width: 1240, height: 1754, preset: 'a4', background: '#f4f1ea' },
    layers: [
      {
        id: 'l-paper',
        kind: 'shape',
        name: 'Papel',
        x: 0, y: 0, width: 1240, height: 1754, rotation: 0, opacity: 1, blend: 'normal', locked: true, visible: true, light: 'normal',
        shape: { type: 'rect', fill: '#f4f1ea', stroke: null, strokeWidth: 0, radius: 0 },
      },
      {
        id: 'l-txt-nome',
        kind: 'text',
        name: 'Nome do Investigador',
        x: 100, y: 200, width: 600, height: 80, rotation: 0, opacity: 1, blend: 'normal', locked: false, visible: true, light: 'normal',
        text: {
          content: 'Texto Inicial',
          font: { family: 'Courier Prime', library: 'casa-font-courier-teste', weight: 400, italic: false },
          size: 32,
          color: '#1a1820',
          align: 'left',
          valign: 'top',
          lineHeight: 1.2,
          letterSpacing: 0,
          box: 'area',
          fit: 'overflow',
          ink: { style: 'clean', wear: 0, seed: 1 },
        },
      },
    ],
    fields: [
      { layerId: 'l-txt-nome', label: 'Nome do Investigador' },
    ],
  };

  await page.evaluate(async (doc) => {
    await window.__atelie.editor.loadHandout(doc);
  }, docWithFields);

  await page.waitForTimeout(150);

  // Verify fill tab is open automatically and active
  const fillTabActive = await page.evaluate(() => {
    const tab = document.querySelector('.inspector-tab[data-tab="fill"]');
    return tab?.classList.contains('active');
  });
  assert.ok(fillTabActive, 'Fill inspector tab should open automatically for document with fields');

  // Verify fill tab is visible
  const fillInput = page.locator('.fill-field-input[data-field-id="l-txt-nome"]');
  await fillInput.waitFor({ state: 'visible' });
  assert.equal(await fillInput.inputValue(), 'Texto Inicial');

  // Edit text in Fill input -> canvas / state updates
  await fillInput.fill('Arthur Pendelton');
  await page.waitForTimeout(100);

  const updatedText = await page.evaluate(() => {
    const l = window.__atelie.editor.state.handout.layers.find(x => x.id === 'l-txt-nome');
    return l.text.content;
  });
  assert.equal(updatedText, 'Arthur Pendelton', 'Editing in Fill input must update layer text');

  // Click "Preencher com exemplo" -> fills plausible text
  const sampleBtn = page.locator('.fill-sample-btn[data-field-id="l-txt-nome"]');
  await sampleBtn.click();
  await page.waitForTimeout(100);

  const sampleVal = await fillInput.inputValue();
  assert.ok(sampleVal && sampleVal.length > 0 && sampleVal !== 'Arthur Pendelton', 'Sample button should put non-empty plausible text');

  // 6. Fase 0: Arrastar "Sangue · gotas múltiplas" para um modelo com 10 camadas
  // deixa a camada nova em layers.at(-1), selecionada e à vista no pixel.
  const tenLayersDoc = {
    schema: 1,
    id: 'doc-10-layers',
    revision: 1,
    name: 'Modelo 10 Camadas',
    category: '',
    tags: [],
    folder: null,
    favorite: false,
    page: { width: 1240, height: 1754, background: '#00000000', uv: { tint: '#00ffc8', strength: 0.85 } },
    layers: [
      {
        id: 'l-base-paper',
        name: 'Papel',
        kind: 'shape',
        visible: true,
        locked: false,
        opacity: 1,
        blend: 'normal',
        x: 0,
        y: 0,
        width: 1240,
        height: 1754,
        rotation: 0,
        clip: false,
        light: 'both',
        shape: { type: 'rect', fill: '#ffffff', stroke: null, strokeWidth: 0, radius: 0, dash: [] },
      },
      ...Array.from({ length: 9 }, (_, i) => ({
        id: `l-extra-${i + 1}`,
        name: `Camada Extra ${i + 1}`,
        kind: 'shape',
        visible: true,
        locked: false,
        opacity: 1,
        blend: 'normal',
        x: 100 + i * 20,
        y: 100 + i * 20,
        width: 200,
        height: 100,
        rotation: 0,
        clip: false,
        light: 'both',
        shape: { type: 'rect', fill: '#eeeeee', stroke: null, strokeWidth: 0, radius: 0, dash: [] },
      })),
    ],
    fields: [],
    source: { kind: 'template' },
    back: null,
  };

  assert.equal(tenLayersDoc.layers.length, 10, 'Document must start with 10 layers');

  await page.evaluate(async (doc) => {
    await window.__atelie.editor.loadHandout(doc);
    window.__atelie.editor.state.select(null);
  }, tenLayersDoc);

  await page.waitForTimeout(150);

  // Drag and drop "Sangue · gotas múltiplas" without selection
  await page.evaluate(dropTarget => {
    const item = {
      id: 'casa-sangue-2',
      name: 'Sangue · gotas múltiplas',
      category: 'Sangue',
      width: 400,
      height: 400,
    };
    const dt = new DataTransfer();
    dt.setData('text/x-atelie-library', JSON.stringify(item));
    dt.setData('application/json', JSON.stringify({ libraryId: item.id, item }));

    const evt = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt,
      clientX: dropTarget.x + 200,
      clientY: dropTarget.y + 200,
    });
    document.getElementById('desk-stage').dispatchEvent(evt);
  }, { x: stageBox.x, y: stageBox.y });

  await page.waitForTimeout(200);

  // 1. Check layer insertion at top
  const layerCheck = await page.evaluate(() => {
    const doc = window.__atelie.editor.state.handout;
    const lastLayer = doc.layers.at(-1);
    const selectedId = window.__atelie.editor.state.selection;
    return {
      count: doc.layers.length,
      lastLayerName: lastLayer?.name,
      lastLayerLibrary: lastLayer?.image?.src?.library,
      lastLayerId: lastLayer?.id,
      selectedId,
    };
  });

  assert.equal(layerCheck.count, 11, 'Layer count should increase from 10 to 11');
  assert.equal(layerCheck.lastLayerName, 'Sangue · gotas múltiplas');
  assert.equal(layerCheck.lastLayerLibrary, 'casa-sangue-2');
  assert.equal(layerCheck.selectedId, layerCheck.lastLayerId, 'Newly inserted layer must be selected');

  // 2. Check pixel visibility on canvas (blood has red pixels)
  const pixelIsRed = await page.waitForFunction(() => {
    const canvas = document.querySelector('#desk-stage canvas');
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const r = imgData.data[i];
      const g = imgData.data[i + 1];
      const b = imgData.data[i + 2];
      const a = imgData.data[i + 3];
      if (a > 50 && r > 100 && g < 80 && b < 80) {
        return true;
      }
    }
    return false;
  }, { timeout: 6000 }).then(() => true).catch(() => false);
  assert.ok(pixelIsRed, 'Blood layer must be rendered and visible at pixel level on canvas');

  assert.deepEqual(errors, []);
});
