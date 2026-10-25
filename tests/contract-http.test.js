import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { createApp } from '../server/app.js';
import { createHandout } from '../src/domain/handouts.js';

// Minimal 1x1 valid PNG
const VALID_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

test('contract HTTP: health, CORS read-only, bake cycle, revision conflicts, and hasUv listing', async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-contract-http-'));
  const allowedOrigins = ['http://127.0.0.1:3001', 'http://localhost:3001'];
  const app = await createApp({ dataDir, allowedOrigins });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise(r => server.close(r));
    await rm(dataDir, { recursive: true, force: true });
  });

  // 1. health without origin
  const healthNoOrigin = await fetch(`${baseUrl}/api/atelie/health`);
  assert.equal(healthNoOrigin.status, 200);
  const healthBody = await healthNoOrigin.json();
  assert.deepEqual(healthBody, { status: 'ok', app: 'atelie', contract: 1 });
  assert.equal(healthNoOrigin.headers.get('access-control-allow-origin'), null);

  // 2. health with allowed origin
  const healthWithOrigin = await fetch(`${baseUrl}/api/atelie/health`, {
    headers: { Origin: 'http://127.0.0.1:3001' },
  });
  assert.equal(healthWithOrigin.status, 200);
  assert.equal(healthWithOrigin.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3001');
  assert.equal(healthWithOrigin.headers.get('vary'), 'Origin');
  assert.equal(healthWithOrigin.headers.get('access-control-expose-headers'), 'X-Atelie-Revision');

  // 3. health with disallowed origin
  const healthDisallowed = await fetch(`${baseUrl}/api/atelie/health`, {
    headers: { Origin: 'http://malicious.example.com' },
  });
  assert.equal(healthDisallowed.status, 200);
  assert.equal(healthDisallowed.headers.get('access-control-allow-origin'), null);

  // 4. OPTIONS preflight on allowed origin
  const optionsAllowed = await fetch(`${baseUrl}/api/atelie/health`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://127.0.0.1:3001',
      'Access-Control-Request-Method': 'GET',
    },
  });
  assert.equal(optionsAllowed.status, 204);
  assert.equal(optionsAllowed.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3001');
  assert.equal(optionsAllowed.headers.get('access-control-allow-methods'), 'GET, HEAD');

  // 5. OPTIONS preflight on disallowed origin
  const optionsDisallowed = await fetch(`${baseUrl}/api/atelie/health`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://malicious.example.com',
      'Access-Control-Request-Method': 'GET',
    },
  });
  assert.equal(optionsDisallowed.headers.get('access-control-allow-origin'), null);

  // 6. Create a handout for bake tests
  const doc = createHandout({ preset: 'a4' });
  doc.name = 'Documento de Contrato';
  // Add a UV layer to verify hasUv
  doc.layers.push({
    id: 'uv-secret',
    name: 'Segredo UV',
    kind: 'shape',
    visible: true,
    locked: false,
    opacity: 1,
    blend: 'normal',
    x: 10,
    y: 10,
    width: 100,
    height: 100,
    rotation: 0,
    clip: false,
    light: 'uv',
    shape: { type: 'rect', fill: '#00ffff', stroke: null, strokeWidth: 0, radius: 0, dash: [] },
  });

  const createRes = await fetch(`${baseUrl}/api/atelie/handouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handout: doc }),
  });
  assert.equal(createRes.status, 201);
  const created = (await createRes.json()).handout;
  assert.equal(created.revision, 1);

  // 7. Verify hasUv in GET /api/atelie/handouts
  const listRes = await fetch(`${baseUrl}/api/atelie/handouts`, {
    headers: { Origin: 'http://127.0.0.1:3001' },
  });
  assert.equal(listRes.status, 200);
  assert.equal(listRes.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3001');
  const list = await listRes.json();
  const found = list.find(h => h.id === doc.id);
  assert.ok(found);
  assert.equal(found.hasUv, true);

  // 8. PUT bake WITHOUT CORS (PUT/DELETE never have CORS headers even when Origin is allowed)
  const putNormalRes = await fetch(`${baseUrl}/api/atelie/handouts/${doc.id}/bake?light=normal&revision=1`, {
    method: 'PUT',
    headers: {
      Origin: 'http://127.0.0.1:3001',
      'Content-Type': 'image/png',
    },
    body: VALID_PNG,
  });
  assert.equal(putNormalRes.status, 204);
  assert.equal(putNormalRes.headers.get('access-control-allow-origin'), null, 'PUT must never have CORS headers');

  // PUT uv bake
  const putUvRes = await fetch(`${baseUrl}/api/atelie/handouts/${doc.id}/bake?light=uv&revision=1`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/png',
    },
    body: VALID_PNG,
  });
  assert.equal(putUvRes.status, 204);

  // 9. Cycle PUT -> GET bake with X-Atelie-Revision and Cache-Control: no-cache
  const getBakeRes = await fetch(`${baseUrl}/api/atelie/handouts/${doc.id}/bake?light=normal`, {
    headers: { Origin: 'http://127.0.0.1:3001' },
  });
  assert.equal(getBakeRes.status, 200);
  assert.equal(getBakeRes.headers.get('content-type'), 'image/png');
  assert.equal(getBakeRes.headers.get('x-atelie-revision'), '1');
  assert.equal(getBakeRes.headers.get('cache-control'), 'no-cache');
  assert.equal(getBakeRes.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3001');

  // GET UV bake
  const getUvBakeRes = await fetch(`${baseUrl}/api/atelie/handouts/${doc.id}/bake?light=uv`, {
    headers: { Origin: 'http://localhost:3001' },
  });
  assert.equal(getUvBakeRes.status, 200);
  assert.equal(getUvBakeRes.headers.get('content-type'), 'image/png');
  assert.equal(getUvBakeRes.headers.get('x-atelie-revision'), '1');
  assert.equal(getUvBakeRes.headers.get('access-control-allow-origin'), 'http://localhost:3001');

  // 10. 409 Conflict when PUT has stale/mismatched revision
  const stalePutRes = await fetch(`${baseUrl}/api/atelie/handouts/${doc.id}/bake?light=normal&revision=99`, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: VALID_PNG,
  });
  assert.equal(stalePutRes.status, 409);
  const conflictJson = await stalePutRes.json();
  assert.equal(conflictJson.error.code, 'REVISION_CONFLICT');

  // 11. DELETE bake
  const deleteUvRes = await fetch(`${baseUrl}/api/atelie/handouts/${doc.id}/bake?light=uv&revision=1`, {
    method: 'DELETE',
    headers: { Origin: 'http://127.0.0.1:3001' },
  });
  assert.equal(deleteUvRes.status, 204);
  assert.equal(deleteUvRes.headers.get('access-control-allow-origin'), null, 'DELETE must never have CORS headers');

  // Verify UV bake is now 404
  const getDeletedUv = await fetch(`${baseUrl}/api/atelie/handouts/${doc.id}/bake?light=uv`);
  assert.equal(getDeletedUv.status, 404);
});


test('contract HTTP: sidecar files follow the trash, bake writes do not race, PNG previews keep their type, list stays fresh', async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-sidecars-'));
  const app = await createApp({ dataDir, allowedOrigins: [] });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise(r => server.close(r));
    await rm(dataDir, { recursive: true, force: true });
  });

  const doc = createHandout({ preset: 'a4' });
  doc.name = 'Com assados';
  const created = await fetch(`${baseUrl}/api/atelie/handouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handout: doc }),
  });
  assert.equal(created.status, 201);
  const { handout } = await created.json();
  const bakeUrl = light => `${baseUrl}/api/atelie/handouts/${handout.id}/bake?light=${light}&revision=${handout.revision}`;
  const png = { 'Content-Type': 'image/png' };

  // Concurrent bake writes: both revisions must end up in bake.json.
  const [a, b] = await Promise.all([
    fetch(bakeUrl('normal'), { method: 'PUT', headers: png, body: VALID_PNG }),
    fetch(bakeUrl('uv'), { method: 'PUT', headers: png, body: VALID_PNG }),
  ]);
  assert.equal(a.status, 204);
  assert.equal(b.status, 204);
  const info = JSON.parse(await readFile(path.join(dataDir, 'handouts', `${handout.id}.bake.json`), 'utf8'));
  assert.deepEqual(info, { normal: handout.revision, uv: handout.revision });

  // A PNG preview is stored and served as PNG.
  const previewPut = await fetch(`${baseUrl}/api/atelie/handouts/${handout.id}/preview`, { method: 'PUT', headers: png, body: VALID_PNG });
  assert.equal(previewPut.status, 204);
  const previewGet = await fetch(`${baseUrl}/api/atelie/handouts/${handout.id}/preview`);
  assert.equal(previewGet.headers.get('content-type').split(';')[0], 'image/png');

  // The list reflects a changed document even though summaries are cached.
  const before = await (await fetch(`${baseUrl}/api/atelie/handouts`)).json();
  assert.equal(before[0].name, 'Com assados');
  const renamed = { ...handout, name: 'Renomeado' };
  const put = await fetch(`${baseUrl}/api/atelie/handouts/${handout.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handout: renamed, expectedRevision: handout.revision }),
  });
  assert.equal(put.status, 200);
  const after = await (await fetch(`${baseUrl}/api/atelie/handouts`)).json();
  assert.equal(after[0].name, 'Renomeado');

  // Trash: bakes and preview stop being served and leave the live folder.
  const removed = await fetch(`${baseUrl}/api/atelie/handouts/${handout.id}`, { method: 'DELETE' });
  assert.equal(removed.status, 204);
  assert.equal((await fetch(`${baseUrl}/api/atelie/handouts/${handout.id}/bake?light=normal`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/api/atelie/handouts/${handout.id}/preview`)).status, 404);
  const live = await readdir(path.join(dataDir, 'handouts'));
  assert.deepEqual(live.filter(f => f.startsWith(handout.id)), []);

  // Restore brings them back.
  const restored = await fetch(`${baseUrl}/api/atelie/trash/${handout.id}/restore`, { method: 'POST' });
  assert.equal(restored.status, 200);
  assert.equal((await fetch(`${baseUrl}/api/atelie/handouts/${handout.id}/bake?light=uv`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/api/atelie/handouts/${handout.id}/preview`)).status, 200);

  // Permanent purge removes everything.
  await fetch(`${baseUrl}/api/atelie/handouts/${handout.id}`, { method: 'DELETE' });
  const purged = await fetch(`${baseUrl}/api/atelie/trash/${handout.id}`, { method: 'DELETE' });
  assert.equal(purged.status, 204);
  const trashLeft = await readdir(path.join(dataDir, 'handouts', 'trash'));
  assert.deepEqual(trashLeft, []);
});
