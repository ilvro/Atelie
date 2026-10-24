import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { createApp } from '../server/app.js';
import { createHandout } from '../src/domain/handouts.js';

test('handouts server: CRUD, revisions, versions, trash, auto-purge, and previews', async (t) => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-handouts-test-'));
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

  // 1. Create handout
  const doc = createHandout({ name: 'Documento Secreto' });
  const docId = doc.id;

  const createRes = await fetch(`${baseUrl}/api/atelie/handouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handout: doc }),
  });
  assert.equal(createRes.status, 201);
  const createdBody = await createRes.json();
  assert.equal(createdBody.handout.revision, 1);
  assert.equal(createdBody.handout.name, 'Documento Secreto');

  // 2. Reject invalid handout (422)
  const invalidDoc = structuredClone(doc);
  invalidDoc.page.background = 'not-a-color';
  const invalidRes = await fetch(`${baseUrl}/api/atelie/handouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handout: invalidDoc }),
  });
  assert.equal(invalidRes.status, 422);

  // 3. Conflict on wrong expectedRevision (409)
  const patchDoc = structuredClone(createdBody.handout);
  patchDoc.name = 'Nome Alterado';
  const conflictRes = await fetch(`${baseUrl}/api/atelie/handouts/${docId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handout: patchDoc, expectedRevision: 99 }),
  });
  assert.equal(conflictRes.status, 409);
  const conflictData = await conflictRes.json();
  assert.equal(conflictData.currentRevision, 1);

  // 4. Update with correct expectedRevision (save as revision 2)
  const updateRes = await fetch(`${baseUrl}/api/atelie/handouts/${docId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handout: patchDoc, expectedRevision: 1 }),
  });
  assert.equal(updateRes.status, 200);
  const updatedBody = await updateRes.json();
  assert.equal(updatedBody.handout.revision, 2);
  assert.equal(updatedBody.handout.name, 'Nome Alterado');

  // 5. Versions: version 1 should be listed and readable
  const versionsRes = await fetch(`${baseUrl}/api/atelie/handouts/${docId}/versions`);
  assert.equal(versionsRes.status, 200);
  const versionsList = await versionsRes.json();
  assert.equal(versionsList.length, 1);
  assert.equal(versionsList[0].revision, 1);
  assert.equal(versionsList[0].name, 'Documento Secreto');

  const version1Res = await fetch(`${baseUrl}/api/atelie/handouts/${docId}/versions/1`);
  assert.equal(version1Res.status, 200);
  const v1 = await version1Res.json();
  assert.equal(v1.name, 'Documento Secreto');
  assert.equal(v1.revision, 1);

  // 6. Preview upload and retrieval
  const previewBytes = Buffer.from('RIFF\x1a\x00\x00\x00WEBPVP8 \x0e\x00\x00\x00\x00\x00\x00\x9d\x01\x2a\x02\x00\x02\x00', 'binary');
  const putPreviewRes = await fetch(`${baseUrl}/api/atelie/handouts/${docId}/preview`, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/webp' },
    body: previewBytes,
  });
  assert.equal(putPreviewRes.status, 204);

  const getPreviewRes = await fetch(`${baseUrl}/api/atelie/handouts/${docId}/preview`);
  assert.equal(getPreviewRes.status, 200);
  assert.equal(getPreviewRes.headers.get('content-type'), 'image/webp');

  // Verify list summary shows preview: true
  const listRes = await fetch(`${baseUrl}/api/atelie/handouts`);
  const list = await listRes.json();
  const summary = list.find(h => h.id === docId);
  assert.ok(summary);
  assert.equal(summary.preview, true);

  // 7. Delete handout (moves to trash)
  const delRes = await fetch(`${baseUrl}/api/atelie/handouts/${docId}?expectedRevision=2`, {
    method: 'DELETE',
  });
  assert.equal(delRes.status, 204);

  // Absent from main list
  const listAfterDel = await (await fetch(`${baseUrl}/api/atelie/handouts`)).json();
  assert.ok(!listAfterDel.some(h => h.id === docId));

  // Present in trash
  const trashRes = await fetch(`${baseUrl}/api/atelie/trash`);
  const trashList = await trashRes.json();
  const inTrash = trashList.find(h => h.id === docId);
  assert.ok(inTrash);
  assert.ok(inTrash.deletedAt);

  // 8. Restore from trash
  const restoreRes = await fetch(`${baseUrl}/api/atelie/trash/${docId}/restore`, {
    method: 'POST',
  });
  assert.equal(restoreRes.status, 200);

  const listAfterRestore = await (await fetch(`${baseUrl}/api/atelie/handouts`)).json();
  assert.ok(listAfterRestore.some(h => h.id === docId));

  // 9. Move back to trash and purge
  await fetch(`${baseUrl}/api/atelie/handouts/${docId}`, { method: 'DELETE' });
  const purgeRes = await fetch(`${baseUrl}/api/atelie/trash/${docId}`, { method: 'DELETE' });
  assert.equal(purgeRes.status, 204);

  const trashAfterPurge = await (await fetch(`${baseUrl}/api/atelie/trash`)).json();
  assert.ok(!trashAfterPurge.some(h => h.id === docId));

  // 10. Auto-purge of 31-day-old items when listing trash
  const oldDoc = createHandout({ name: 'Arquivo Velho' });
  const oldId = oldDoc.id;
  const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  await writeFile(
    path.join(dataDir, 'handouts', 'trash', `${oldId}.json`),
    JSON.stringify({ ...oldDoc, deletedAt: thirtyOneDaysAgo }),
    'utf8'
  );

  const freshDoc = createHandout({ name: 'Arquivo Recente' });
  const freshId = freshDoc.id;
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  await writeFile(
    path.join(dataDir, 'handouts', 'trash', `${freshId}.json`),
    JSON.stringify({ ...freshDoc, deletedAt: twoDaysAgo }),
    'utf8'
  );

  const trashCheck = await (await fetch(`${baseUrl}/api/atelie/trash`)).json();
  assert.ok(!trashCheck.some(h => h.id === oldId), '31-day-old item should be automatically purged');
  assert.ok(trashCheck.some(h => h.id === freshId), 'Fresh item should remain in trash');
});

