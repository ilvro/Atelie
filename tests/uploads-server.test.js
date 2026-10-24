import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { createApp } from '../server/app.js';

test('uploads server: image header validation, listing, serving, and deletion', async (t) => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-uploads-test-'));
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

  // Construct a minimal 3x2 PNG buffer
  // Signature (8 bytes) + IHDR length (4) + 'IHDR' (4) + width 3 (4) + height 2 (4) + flags (5) + crc (4)
  const png3x2 = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d,                         // IHDR chunk length 13
    0x49, 0x48, 0x44, 0x52,                         // 'IHDR'
    0x00, 0x00, 0x00, 0x03,                         // width: 3
    0x00, 0x00, 0x00, 0x02,                         // height: 2
    0x08, 0x02, 0x00, 0x00, 0x00,                   // 8-bit RGB, no interlace
    0x85, 0xb6, 0x52, 0x22,                         // CRC
    0x00, 0x00, 0x00, 0x00,                         // IEND length
    0x49, 0x45, 0x4e, 0x44,                         // 'IEND'
    0xae, 0x42, 0x60, 0x82                          // CRC
  ]);

  // 1. Send plain text claiming to be image/png -> should fail with 422
  const textFakeImage = Buffer.from('This is not an image');
  const fakeRes = await fetch(`${baseUrl}/api/atelie/uploads?name=fake.png`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: textFakeImage,
  });
  assert.equal(fakeRes.status, 422);
  const fakeData = await fakeRes.json();
  assert.equal(fakeData.error?.code, 'INVALID_IMAGE');

  // 2. Send valid PNG 3x2 -> 201 with width: 3, height: 2
  const uploadRes = await fetch(`${baseUrl}/api/atelie/uploads?name=brasao.png`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: png3x2,
  });
  assert.equal(uploadRes.status, 201);
  const uploadData = await uploadRes.json();
  assert.match(uploadData.id, /^up-[0-9a-f]{12}$/);
  assert.equal(uploadData.name, 'brasao.png');
  assert.equal(uploadData.mime, 'image/png');
  assert.equal(uploadData.width, 3);
  assert.equal(uploadData.height, 2);
  const uploadId = uploadData.id;

  // 3. List uploads
  const listRes = await fetch(`${baseUrl}/api/atelie/uploads`);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.length, 1);
  assert.equal(listData[0].id, uploadId);
  assert.equal(listData[0].width, 3);

  // 4. Retrieve upload file
  const fileRes = await fetch(`${baseUrl}/api/atelie/uploads/${uploadId}/file`);
  assert.equal(fileRes.status, 200);
  assert.equal(fileRes.headers.get('content-type'), 'image/png');
  assert.ok(fileRes.headers.get('cache-control').includes('immutable'));
  const fileBytes = Buffer.from(await fileRes.arrayBuffer());
  assert.deepEqual(fileBytes, png3x2);

  // 5. Delete upload
  const delRes = await fetch(`${baseUrl}/api/atelie/uploads/${uploadId}`, {
    method: 'DELETE',
  });
  assert.equal(delRes.status, 204);

  // Verify list is empty and file is gone
  const listAfterDel = await (await fetch(`${baseUrl}/api/atelie/uploads`)).json();
  assert.equal(listAfterDel.length, 0);

  const fileAfterDel = await fetch(`${baseUrl}/api/atelie/uploads/${uploadId}/file`);
  assert.equal(fileAfterDel.status, 404);
});

