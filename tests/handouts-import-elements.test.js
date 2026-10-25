import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import * as fflate from 'fflate';

import {
  stripCount,
  isMonthFolder,
  categoryOf,
  displayName,
  tagsOf,
  slug,
  elementId,
  fontId,
} from '../scripts/library/lib/catalog.js';
import { readManifest, mergeItems, writeManifest } from '../scripts/library/lib/manifest.js';
import { importElements } from '../scripts/library/import-elements.js';
import { projectDir, collectionDir } from '../server/paths.js';

function encodeUtf16BE(str) {
  const buf = Buffer.alloc(str.length * 2);
  for (let i = 0; i < str.length; i++) {
    buf.writeUInt16BE(str.charCodeAt(i), i * 2);
  }
  return buf;
}

function createSyntheticFont(family = 'Test Expansion', ps = 'TestExpansion-Regular') {
  const familyStr = encodeUtf16BE(family);
  const fullStr = encodeUtf16BE(`${family} Regular`);
  const psStr = encodeUtf16BE(ps);

  const nameRecCount = 3;
  const nameHeaderSize = 6;
  const nameRecordsSize = nameRecCount * 12;
  const stringStorageOffset = nameHeaderSize + nameRecordsSize;
  const nameTableSize = stringStorageOffset + familyStr.length + fullStr.length + psStr.length;
  const nameBuf = Buffer.alloc(nameTableSize);

  nameBuf.writeUInt16BE(0, 0);
  nameBuf.writeUInt16BE(nameRecCount, 2);
  nameBuf.writeUInt16BE(stringStorageOffset, 4);

  let curStrOffset = 0;
  // Record 1: Family (nameID=1)
  nameBuf.writeUInt16BE(3, 6);
  nameBuf.writeUInt16BE(1, 8);
  nameBuf.writeUInt16BE(0x0409, 10);
  nameBuf.writeUInt16BE(1, 12);
  nameBuf.writeUInt16BE(familyStr.length, 14);
  nameBuf.writeUInt16BE(curStrOffset, 16);
  familyStr.copy(nameBuf, stringStorageOffset + curStrOffset);
  curStrOffset += familyStr.length;

  // Record 2: Full name (nameID=4)
  const rec2 = 6 + 12;
  nameBuf.writeUInt16BE(3, rec2);
  nameBuf.writeUInt16BE(1, rec2 + 2);
  nameBuf.writeUInt16BE(0x0409, rec2 + 4);
  nameBuf.writeUInt16BE(4, rec2 + 6);
  nameBuf.writeUInt16BE(fullStr.length, rec2 + 8);
  nameBuf.writeUInt16BE(curStrOffset, rec2 + 10);
  fullStr.copy(nameBuf, stringStorageOffset + curStrOffset);
  curStrOffset += fullStr.length;

  // Record 3: PostScript (nameID=6)
  const rec3 = 6 + 24;
  nameBuf.writeUInt16BE(3, rec3);
  nameBuf.writeUInt16BE(1, rec3 + 2);
  nameBuf.writeUInt16BE(0x0409, rec3 + 4);
  nameBuf.writeUInt16BE(6, rec3 + 6);
  nameBuf.writeUInt16BE(psStr.length, rec3 + 8);
  nameBuf.writeUInt16BE(curStrOffset, rec3 + 10);
  psStr.copy(nameBuf, stringStorageOffset + curStrOffset);

  // OS/2 table: 64 bytes
  const os2Buf = Buffer.alloc(64);
  os2Buf.writeUInt16BE(400, 4);

  // Assemble sfnt
  const numTables = 2;
  const headerSize = 12 + numTables * 16;
  const totalSize = headerSize + nameBuf.length + os2Buf.length;
  const sfnt = Buffer.alloc(totalSize);

  sfnt.writeUInt32BE(0x00010000, 0);
  sfnt.writeUInt16BE(numTables, 4);

  let offset = headerSize;
  // name table entry
  sfnt.write('name', 12, 4, 'ascii');
  sfnt.writeUInt32BE(offset, 20);
  sfnt.writeUInt32BE(nameBuf.length, 24);
  nameBuf.copy(sfnt, offset);
  offset += nameBuf.length;

  // OS/2 table entry
  sfnt.write('OS/2', 28, 4, 'ascii');
  sfnt.writeUInt32BE(offset, 36);
  sfnt.writeUInt32BE(os2Buf.length, 40);
  os2Buf.copy(sfnt, offset);

  return sfnt;
}

test('1. stripCount, categoryOf, displayName, tagsOf com os exemplos de especificacao', () => {
  // stripCount
  assert.equal(stripCount('Sangue (14)'), 'Sangue');
  assert.equal(stripCount('Papéis Rasgados e Chamuscados (16 + 100)'), 'Papéis Rasgados e Chamuscados');
  assert.equal(stripCount('06-2024 (2º) [Fontes! (100+)]'), '06-2024');

  // isMonthFolder
  assert.equal(isMonthFolder('06-2024'), true);
  assert.equal(isMonthFolder('2024'), true);
  assert.equal(isMonthFolder('Sangue'), false);

  // categoryOf
  assert.equal(categoryOf('Assets/2024/01-2024/Sangue (14)/sangue_01.png'), 'Sangue');
  assert.equal(categoryOf('Assets/2024/10-2024/Doodles (30).png'), 'Doodles');
  assert.equal(categoryOf('Símbolos/2024/02-2024/Marcas/marca_01.png'), 'Símbolos · Marcas');

  // displayName
  assert.equal(displayName('Assets/2024/01-2024/Sangue (14)/Sangue (7).png'), 'Sangue 7');
  assert.equal(displayName('Assets/2024/10-2024/Doodles (30).png'), 'Doodles 30');
  assert.equal(displayName('Assets/2024/01-2024/Manchas/Mancha de Cafe.png'), 'Mancha de Cafe');

  // tagsOf
  const tags = tagsOf('Assets/2024/01-2024/Sangue (14)/Sangue (7).png');
  assert.ok(tags.includes('sangue'), 'tagsOf deve incluir sangue');
  assert.ok(!tags.includes('7'), 'tagsOf nao deve conter numeros');
  assert.ok(tags.every(t => t.length > 2), 'tagsOf nao deve conter palavras curtas (1-2 letras)');
  assert.ok(tags.length <= 12, 'tagsOf max 12');
});

test('2. elementId e igual em duas chamadas e diferente para caminhos diferentes; slug', () => {
  assert.equal(slug('Papéis Amassados'), 'papeis-amassados');
  assert.equal(slug('06-2024 (2º) [Fontes! (100+)]'), '06-2024-2o-fontes-100');

  const id1 = elementId('Assets/2024/01-2024/Sangue/01.png');
  const id2 = elementId('Assets/2024/01-2024/Sangue/01.png');
  const id3 = elementId('Assets/2024/01-2024/Sangue/02.png');

  assert.equal(id1, id2, 'elementId deve ser deterministico e igual para o mesmo caminho');
  assert.notEqual(id1, id3, 'elementId deve ser diferente para caminhos diferentes');
  assert.ok(id1.startsWith('ac-el-'), `elementId deve comecar com ac-el-, obtido ${id1}`);
});

test('3. Uma fonte com o mesmo postscript de uma fonte da colecao da casa nao e copiada', async () => {
  const houseManifest = await readManifest(collectionDir);
  const houseFont = houseManifest.items.find(i => i.kind === 'font' && i.postscript);
  assert.ok(houseFont, 'Colecao da casa deve ter pelo menos uma fonte');

  const tmpSource = await mkdtemp(path.join(os.tmpdir(), 'atelie-test-house-dup-src-'));
  const tmpDest = await mkdtemp(path.join(os.tmpdir(), 'atelie-test-house-dup-dest-'));

  try {
    const fontDir = path.join(tmpSource, 'Documentos/Bundle 1/Fontes - Bundle 1');
    await mkdir(fontDir, { recursive: true });

    // Create a font with the exact postscript of a house font
    const dupFontBuffer = createSyntheticFont('House Duplicate', houseFont.postscript);
    await writeFile(path.join(fontDir, 'Duplicate.ttf'), dupFontBuffer);

    const { report, items } = await importElements({
      source: tmpSource,
      dest: tmpDest,
      collection: collectionDir,
      dryRun: true,
      logger: () => {},
    });

    assert.equal(items.length, 0, 'Fonte com mesmo postscript da casa nao deve ser copiada');
    assert.ok(report.skipped > 0, 'Fonte duplicada da casa deve ser pulada');
  } finally {
    await rm(tmpSource, { recursive: true, force: true });
    await rm(tmpDest, { recursive: true, force: true });
  }
});

test('4. mergeItems substitui por id e, com replaceKinds: ["element"], remove elementos antigos sem tocar em template', () => {
  const manifest = {
    schema: 1,
    generatedAt: '2026-01-01T00:00:00.000Z',
    items: [
      { id: 'el-1', kind: 'element', name: 'Elemento 1' },
      { id: 'el-2', kind: 'element', name: 'Elemento 2' },
      { id: 'tpl-1', kind: 'template', name: 'Modelo 1' },
      { id: 'lyr-1', kind: 'layer', name: 'Camada 1' },
    ],
  };

  const newItems = [
    { id: 'el-1', kind: 'element', name: 'Elemento 1 Atualizado' },
    { id: 'el-3', kind: 'element', name: 'Elemento 3' },
  ];

  const merged = mergeItems(manifest, newItems, { replaceKinds: ['element'] });

  // el-1 was updated
  const el1 = merged.items.find(i => i.id === 'el-1');
  assert.equal(el1?.name, 'Elemento 1 Atualizado');

  // el-2 was removed because replaceKinds: ['element'] and el-2 is not in newItems
  const el2 = merged.items.find(i => i.id === 'el-2');
  assert.equal(el2, undefined, 'el-2 deve ser removido por replaceKinds');

  // el-3 was added
  const el3 = merged.items.find(i => i.id === 'el-3');
  assert.ok(el3, 'el-3 deve ser adicionado');

  // tpl-1 and lyr-1 are strictly preserved
  const tpl1 = merged.items.find(i => i.id === 'tpl-1');
  assert.ok(tpl1, 'tpl-1 deve ser preservado');
  const lyr1 = merged.items.find(i => i.id === 'lyr-1');
  assert.ok(lyr1, 'lyr-1 deve ser preservado');
});

test('5. De ponta a ponta: 2 imagens (uma copiada 2x com nomes diferentes) e 1 zip com fonte; reexecucao incremental', async () => {
  const tmpSource = await mkdtemp(path.join(os.tmpdir(), 'atelie-e2e-src-'));
  const tmpDest = await mkdtemp(path.join(os.tmpdir(), 'atelie-e2e-dest-'));

  try {
    const assetsDir = path.join(tmpSource, 'Assets/2023/01-2023/Sangue (2)');
    const docsDir = path.join(tmpSource, 'Documentos/Bundle 1 - X/Fontes - Bundle 1');
    await mkdir(assetsDir, { recursive: true });
    await mkdir(docsDir, { recursive: true });

    // Generate 1 PNG image with sharp (400 × 300)
    const imgBuffer = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 4,
        background: { r: 180, g: 20, b: 20, alpha: 1 },
      },
    }).png().toBuffer();

    // Write image twice with different filenames in same folder
    await writeFile(path.join(assetsDir, 'Sangue (1).png'), imgBuffer);
    await writeFile(path.join(assetsDir, 'Sangue Copia (2).png'), imgBuffer);

    // Create a .zip with a synthetic unique font
    const fontBuffer = createSyntheticFont('Ordem Secreta', 'OrdemSecreta-Regular');
    const zipBytes = fflate.zipSync({
      'OrdemSecreta-Regular.ttf': fontBuffer,
    });
    await writeFile(path.join(docsDir, 'Fontes.zip'), Buffer.from(zipBytes));

    // First execution
    const run1 = await importElements({
      source: tmpSource,
      dest: tmpDest,
      collection: collectionDir,
      logger: () => {},
    });

    assert.equal(run1.report.created, 2, 'Run 1 deve criar 2 itens (1 elemento e 1 fonte)');
    assert.equal(run1.report.duplicates, 1, 'Run 1 deve registrar 1 duplicata para a segunda imagem');

    // Read generated library.json
    const manifest1 = await readManifest(tmpDest);
    assert.equal(manifest1.items.length, 2, 'Manifesto deve conter 2 itens (1 elemento + 1 fonte)');

    const elementItem = manifest1.items.find(i => i.kind === 'element');
    assert.ok(elementItem, 'Elemento deve existir no manifesto');
    assert.ok(elementItem.id.startsWith('ac-el-'), 'Elemento deve ter id com prefixo ac-el-');

    const fontItem = manifest1.items.find(i => i.kind === 'font');
    assert.ok(fontItem, 'Fonte deve existir no manifesto');
    assert.equal(fontItem.postscript, 'OrdemSecreta-Regular');

    // Verify files exist on disk
    const elemMeta = await sharp(path.join(tmpDest, elementItem.file)).metadata();
    assert.ok(elemMeta.width > 0 && elemMeta.height > 0);

    const prevMeta = await sharp(path.join(tmpDest, elementItem.preview)).metadata();
    assert.ok(Math.max(prevMeta.width, prevMeta.height) <= 320, 'Previa deve ter lado maior <= 320');

    // Run again: incremental execution
    const run2 = await importElements({
      source: tmpSource,
      dest: tmpDest,
      collection: collectionDir,
      logger: () => {},
    });

    assert.equal(run2.report.created, 0, 'Run 2 nao deve recriar itens');
    assert.ok(run2.report.skipped >= 2, 'Run 2 deve pular arquivos inalterados');
  } finally {
    await rm(tmpSource, { recursive: true, force: true });
    await rm(tmpDest, { recursive: true, force: true });
  }
});

