import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { createApp } from '../server/app.js';
import { createFolder } from '../src/domain/folders.js';

test('folders server: list, update with revisions, and conflict detection', async (t) => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-folders-server-test-'));
  const collectionDir = path.join(tmpDir, 'collection');
  const dataDir = path.join(tmpDir, 'data');
  const distDir = path.join(tmpDir, 'dist');

  await mkdir(collectionDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });
  await mkdir(distDir, { recursive: true });
  await writeFile(path.join(distDir, 'index.html'), '<html/>');
  await writeFile(path.join(collectionDir, 'library.json'), JSON.stringify({ schema: 1, items: [] }));

  const app = await createApp({ dataDir, collection: collectionDir, distDir });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise(r => server.close(r));
    await rm(tmpDir, { recursive: true, force: true });
  });

  // 1. Initial GET -> empty list with revision 1
  const getRes1 = await fetch(`${baseUrl}/api/atelie/folders`);
  assert.equal(getRes1.status, 200);
  const data1 = await getRes1.json();
  assert.equal(data1.revision, 1);
  assert.deepEqual(data1.folders, []);

  // 2. PUT with valid folders
  const f1 = createFolder('Campanha 1', { id: 'f-1', color: '#ff0000' });
  const f2 = createFolder('Atos', { id: 'f-2', parentId: 'f-1' });

  const putRes1 = await fetch(`${baseUrl}/api/atelie/folders`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expectedRevision: 1,
      folders: [f1, f2],
    }),
  });
  assert.equal(putRes1.status, 200);
  const putData1 = await putRes1.json();
  assert.equal(putData1.revision, 2);
  assert.equal(putData1.folders.length, 2);

  // 3. Conflict when expectedRevision does not match current
  const conflictRes = await fetch(`${baseUrl}/api/atelie/folders`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expectedRevision: 1, // Current is 2
      folders: [f1],
    }),
  });
  assert.equal(conflictRes.status, 409);
  const conflictBody = await conflictRes.json();
  assert.equal(conflictBody.error.code, 'REVISION_CONFLICT');
  assert.equal(conflictBody.currentRevision, 2);

  // 4. Reject invalid folder payload (422)
  const invalidRes = await fetch(`${baseUrl}/api/atelie/folders`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expectedRevision: 2,
      folders: [{ id: 'bad', name: '' }],
    }),
  });
  assert.equal(invalidRes.status, 422);

  // 5. GET confirms persisted state
  const getRes2 = await fetch(`${baseUrl}/api/atelie/folders`);
  const data2 = await getRes2.json();
  assert.equal(data2.revision, 2);
  assert.equal(data2.folders[0].name, 'Campanha 1');
  assert.equal(data2.folders[1].name, 'Atos');
});

