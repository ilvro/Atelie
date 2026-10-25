import test from 'node:test';
import assert from 'node:assert/strict';
import { exportBackup, importBackup, blobToBase64, base64ToBlob } from '../src/data/backup.js';

function createMockApi() {
  const handoutsStore = new Map();
  const uploadsStore = new Map();
  let foldersList = [];
  let foldersRevision = 1;

  return {
    handouts: {
      async list() {
        return Array.from(handoutsStore.values()).map(h => ({
          id: h.id,
          name: h.name,
          category: h.category,
          tags: h.tags,
          revision: h.revision,
          folder: h.folder,
        }));
      },
      async read(id) {
        const doc = handoutsStore.get(id);
        if (!doc) throw new Error(`Not found: ${id}`);
        return structuredClone(doc);
      },
      async importDoc(doc) {
        const existing = handoutsStore.get(doc.id);
        if (existing && existing.revision > doc.revision) {
          return { imported: false, reason: 'lower_revision', doc: existing };
        }
        handoutsStore.set(doc.id, structuredClone(doc));
        return { imported: true, doc };
      },
      async create(doc) {
        if (handoutsStore.has(doc.id)) throw new Error('Already exists');
        handoutsStore.set(doc.id, structuredClone(doc));
        return doc;
      },
      async save(doc) {
        handoutsStore.set(doc.id, structuredClone(doc));
        return doc;
      },
    },
    uploads: {
      async list() {
        return Array.from(uploadsStore.values()).map(u => ({
          id: u.id,
          name: u.name,
          mime: u.mime,
          size: u.size,
          width: u.width,
          height: u.height,
          createdAt: u.createdAt,
        }));
      },
      async getBlob(id) {
        const u = uploadsStore.get(id);
        return u ? u.blob : null;
      },
      async get(id) {
        return uploadsStore.get(id) || null;
      },
      async put(record) {
        uploadsStore.set(record.id, record);
        return true;
      },
    },
    folders: {
      async list() {
        return { folders: structuredClone(foldersList), revision: foldersRevision };
      },
      async save(folders, expectedRev) {
        foldersList = structuredClone(folders);
        foldersRevision = (foldersRevision || 1) + 1;
        return { folders: foldersList, revision: foldersRevision };
      },
    },
    _internal: {
      handoutsStore,
      uploadsStore,
    },
  };
}

test('blobToBase64 and base64ToBlob conversion', async () => {
  const originalBytes = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128]);
  const blob = new Blob([originalBytes], { type: 'application/octet-stream' });
  const b64 = await blobToBase64(blob);
  assert.ok(typeof b64 === 'string');

  const restoredBlob = base64ToBlob(b64, 'application/octet-stream');
  const restoredBytes = new Uint8Array(await restoredBlob.arrayBuffer());
  assert.deepEqual(restoredBytes, originalBytes);
});

test('backup: exportar e importar ida e volta; importar não apaga; revisão menor ignorada', async () => {
  const api1 = createMockApi();

  const sampleBlob = new Blob([new Uint8Array([10, 20, 30, 40])], { type: 'image/png' });
  await api1.uploads.put({
    id: 'up-foto-1',
    name: 'Retrato.png',
    mime: 'image/png',
    size: 4,
    width: 2,
    height: 2,
    createdAt: '2026-10-25T10:00:00.000Z',
    blob: sampleBlob,
  });

  await api1.folders.save([{ id: 'folder-misterio', name: 'Mistério', parent: null, order: 0 }]);

  const doc1 = {
    schema: 1,
    id: 'doc-carta-01',
    name: 'Carta Antiga',
    category: 'Cartas',
    tags: ['antiga'],
    revision: 2,
    page: { width: 800, height: 1100, background: '#f5f0e6' },
    layers: [],
    fields: [],
    source: { kind: 'blank' },
  };

  const doc2 = {
    schema: 1,
    id: 'doc-relatorio-02',
    name: 'Relatório',
    category: 'Policial',
    tags: ['policial'],
    revision: 1,
    page: { width: 800, height: 1100, background: '#ffffff' },
    layers: [],
    fields: [],
    source: { kind: 'blank' },
  };

  await api1.handouts.importDoc(doc1);
  await api1.handouts.importDoc(doc2);

  // 1. Export backup from api1
  const backup = await exportBackup(api1);
  assert.equal(backup.app, 'atelie');
  assert.equal(backup.schema, 1);
  assert.equal(backup.handouts.length, 2);
  assert.equal(backup.uploads.length, 1);
  assert.equal(backup.folders.length, 1);
  assert.ok(backup.uploads[0].base64);

  // 2. Import into empty api2 (round-trip)
  const api2 = createMockApi();
  const res1 = await importBackup(api2, backup);
  assert.equal(res1.importedHandouts, 2);
  assert.equal(res1.skippedHandouts, 0);
  assert.equal(res1.importedUploads, 1);

  const importedDoc1 = await api2.handouts.read('doc-carta-01');
  assert.equal(importedDoc1.name, 'Carta Antiga');
  assert.equal(importedDoc1.revision, 2);

  const importedUpload = await api2.uploads.get('up-foto-1');
  assert.ok(importedUpload);
  assert.equal(importedUpload.name, 'Retrato.png');

  const foldersApi2 = await api2.folders.list();
  assert.equal(foldersApi2.folders.length, 1);
  assert.equal(foldersApi2.folders[0].id, 'folder-misterio');

  // 3. Importar não apaga: criar um terceiro documento no api2 e reimportar
  const doc3 = {
    schema: 1,
    id: 'doc-independente-03',
    name: 'Documento Local',
    category: 'Geral',
    tags: ['local'],
    revision: 1,
    page: { width: 800, height: 1100, background: '#ffffff' },
    layers: [],
    fields: [],
    source: { kind: 'blank' },
  };
  await api2.handouts.importDoc(doc3);

  const res2 = await importBackup(api2, backup);
  // doc-carta-01 e doc-relatorio-02 foram sobrescritos com mesma revisão, doc-independente-03 foi mantido
  const allDocsApi2 = await api2.handouts.list();
  assert.equal(allDocsApi2.length, 3, 'Importação não deve apagar documentos locais preexistentes');
  assert.ok(allDocsApi2.some(d => d.id === 'doc-independente-03'), 'doc3 deve continuar existindo');

  // 4. Revisão menor ignorada
  // Atualiza doc-carta-01 no api2 para revisão 4
  const doc1Updated = { ...doc1, revision: 4, name: 'Carta Antiga Revisão Recente' };
  await api2.handouts.importDoc(doc1Updated);

  // O backup antigo tem doc-carta-01 na revisão 2.
  // Ao importar, a revisão 2 deve ser ignorada em favor da revisão 4 mais nova.
  const res3 = await importBackup(api2, backup);
  assert.equal(res3.skippedHandouts, 1, 'Documento com revisão menor deve ser ignorado');

  const doc1After = await api2.handouts.read('doc-carta-01');
  assert.equal(doc1After.revision, 4, 'Revisão mais alta deve ser mantida');
  assert.equal(doc1After.name, 'Carta Antiga Revisão Recente');
});

