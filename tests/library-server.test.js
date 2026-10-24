import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { createApp } from '../server/app.js';

test('library server: house collection, expansions, security, and templates', async (t) => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-lib-test-'));
  const collectionDir = path.join(tmpDir, 'collection');
  const expansionsDir = path.join(tmpDir, 'expansions');
  const dataDir = path.join(tmpDir, 'data');
  const distDir = path.join(tmpDir, 'dist');

  await mkdir(collectionDir, { recursive: true });
  await mkdir(expansionsDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });
  await mkdir(distDir, { recursive: true });
  await writeFile(path.join(distDir, 'index.html'), '<html/>');

  // 1. House collection with 1 element and 1 template
  const houseManifest = {
    schema: 1,
    generatedAt: '2026-10-24T12:00:00Z',
    items: [
      {
        id: 'casa-papel-oficio',
        kind: 'element',
        name: 'Ofício Creme',
        category: 'Papéis',
        tags: ['papel'],
        file: 'papeis/oficio.webp',
        preview: 'previews/oficio.webp',
        width: 1240,
        height: 1754,
        license: 'própria',
      },
      {
        id: 'casa-tpl-carta',
        kind: 'template',
        name: 'Carta Envelhecida',
        category: 'Cartas',
        tags: [],
        file: 'modelos/carta.json',
        preview: 'previews/carta.webp',
        width: 1240,
        height: 1754,
        fields: 2,
      },
      {
        id: 'item-duplicado',
        kind: 'element',
        name: 'Item da Casa',
        category: 'Papéis',
        tags: [],
        file: 'papeis/duplicado.webp',
      },
      {
        id: 'item-malicioso',
        kind: 'element',
        name: 'Malicioso',
        file: '../../segredo.txt',
      },
    ],
  };

  await mkdir(path.join(collectionDir, 'papeis'), { recursive: true });
  await mkdir(path.join(collectionDir, 'modelos'), { recursive: true });
  await mkdir(path.join(collectionDir, 'previews'), { recursive: true });
  await writeFile(path.join(collectionDir, 'library.json'), JSON.stringify(houseManifest), 'utf8');
  await writeFile(path.join(collectionDir, 'papeis', 'oficio.webp'), 'fake-webp-bytes', 'utf8');
  await writeFile(path.join(collectionDir, 'modelos', 'carta.json'), JSON.stringify({ schema: 1, name: 'Carta' }), 'utf8');

  // 2. Expansion "ac" with 1 element, 1 font, 1 template, 1 layer, and 1 duplicate id
  const acDir = path.join(expansionsDir, 'ac');
  await mkdir(path.join(acDir, 'modelos'), { recursive: true });
  await mkdir(path.join(acDir, 'camadas'), { recursive: true });
  await writeFile(path.join(acDir, 'expansion.json'), JSON.stringify({
    id: 'ac',
    name: 'Arquivos Confidenciais',
    description: 'Expansão de teste',
    license: 'privada',
  }), 'utf8');

  const acManifest = {
    schema: 1,
    generatedAt: '2026-10-24T12:00:00Z',
    items: [
      {
        id: 'ac-elem-foto',
        kind: 'element',
        name: 'Foto Suspeito',
        file: 'elementos/foto.webp',
      },
      {
        id: 'ac-font-typewriter',
        kind: 'font',
        name: 'Máquina',
        file: 'fontes/font.ttf',
      },
      {
        id: 'ac-tpl-relatorio',
        kind: 'template',
        name: 'Relatório Policial',
        file: 'modelos/relatorio.json',
      },
      {
        id: 'ac-camada-amassado',
        kind: 'layer',
        name: 'Amassado',
        file: 'camadas/amassado.webp',
      },
      {
        id: 'item-duplicado',
        kind: 'element',
        name: 'Item da Expansão',
        file: 'elementos/duplicado.webp',
      },
    ],
  };
  await writeFile(path.join(acDir, 'library.json'), JSON.stringify(acManifest), 'utf8');
  await writeFile(path.join(acDir, 'modelos', 'relatorio.json'), JSON.stringify({ schema: 1, name: 'Relatório' }), 'utf8');
  await writeFile(path.join(acDir, 'camadas', 'amassado.webp'), 'layer-bytes', 'utf8');

  const app = await createApp({ dataDir, expansionsDir, collection: collectionDir, distDir });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise(r => server.close(r));
    await rm(tmpDir, { recursive: true, force: true });
  });

  // 1. List library items
  const resLib = await fetch(`${baseUrl}/api/atelie/library`);
  assert.equal(resLib.status, 200);
  const dataLib = await resLib.json();

  // Sources contain both casa and ac
  assert.equal(dataLib.sources.length, 2);
  assert.deepEqual(dataLib.sources[0], { id: 'casa', name: 'Coleção do Ateliê' });
  assert.equal(dataLib.sources[1].id, 'ac');
  assert.equal(dataLib.sources[1].name, 'Arquivos Confidenciais');

  // Items contain elements, fonts and templates, but kind 'layer' is excluded
  const itemIds = dataLib.items.map(i => i.id);
  assert.ok(itemIds.includes('casa-papel-oficio'));
  assert.ok(itemIds.includes('casa-tpl-carta'));
  assert.ok(itemIds.includes('ac-elem-foto'));
  assert.ok(itemIds.includes('ac-font-typewriter'));
  assert.ok(itemIds.includes('ac-tpl-relatorio'));
  assert.ok(!itemIds.includes('ac-camada-amassado'), 'kind: layer must not appear in normal list');

  // Items have proper source set
  const casaItem = dataLib.items.find(i => i.id === 'casa-papel-oficio');
  assert.equal(casaItem.source, 'casa');
  const acItem = dataLib.items.find(i => i.id === 'ac-elem-foto');
  assert.equal(acItem.source, 'ac');

  // 2. Duplicate id stays with casa
  const dupItem = dataLib.items.find(i => i.id === 'item-duplicado');
  assert.equal(dupItem.source, 'casa');
  assert.equal(dupItem.name, 'Item da Casa');

  // 3. Template item endpoint includes parsed handout
  const resTpl = await fetch(`${baseUrl}/api/atelie/library/ac-tpl-relatorio`);
  assert.equal(resTpl.status, 200);
  const dataTpl = await resTpl.json();
  assert.equal(dataTpl.id, 'ac-tpl-relatorio');
  assert.deepEqual(dataTpl.handout, { schema: 1, name: 'Relatório' });

  // 4. Layer file can be retrieved by ID even though hidden from list
  const resLayerFile = await fetch(`${baseUrl}/api/atelie/library/ac-camada-amassado/file`);
  assert.equal(resLayerFile.status, 200);
  assert.equal(resLayerFile.headers.get('content-type'), 'image/webp');
  assert.ok(resLayerFile.headers.get('cache-control').includes('immutable'));
  const layerText = await resLayerFile.text();
  assert.equal(layerText, 'layer-bytes');

  // 5. Security: traversal path in manifest returns 404
  const resTrap = await fetch(`${baseUrl}/api/atelie/library/item-malicioso/file`);
  assert.equal(resTrap.status, 404);

  // 6. Security: invalid itemId with .. returns 404
  const resInvalidId = await fetch(`${baseUrl}/api/atelie/library/..%2Fhack/file`);
  assert.equal(resInvalidId.status, 404);
});

test('library server: missing house collection rejects startup', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-lib-fail-'));
  const collectionDir = path.join(tmpDir, 'empty-collection');
  await mkdir(collectionDir, { recursive: true });

  await assert.rejects(
    async () => {
      await createApp({ collection: collectionDir, dataDir: path.join(tmpDir, 'data') });
    },
    (err) => err.message.includes('Coleção da casa sem library.json válido')
  );

  await rm(tmpDir, { recursive: true, force: true });
});

