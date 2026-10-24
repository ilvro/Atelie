import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { createApp } from '../server/app.js';

test('server health and static SPA routing', async (t) => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-server-test-'));
  const dataDir = path.join(tmpDir, 'data');
  const distDir = path.join(tmpDir, 'dist');
  await mkdir(distDir, { recursive: true });
  const testHtml = '<!DOCTYPE html><html><head><title>Test Atelie</title></head><body><h1>Ateliê Test</h1></body></html>';
  await writeFile(path.join(distDir, 'index.html'), testHtml, 'utf8');

  const app = await createApp({ dataDir, distDir });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(tmpDir, { recursive: true, force: true });
  });

  const healthRes = await fetch(`${baseUrl}/api/atelie/health`);
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.deepEqual(health, { status: 'ok', app: 'atelie', contract: 1 });

  const unknownApiRes = await fetch(`${baseUrl}/api/atelie/unknown`);
  assert.equal(unknownApiRes.status, 404);
  const unknownApiBody = await unknownApiRes.json();
  assert.equal(unknownApiBody.error?.code, 'API_NOT_FOUND');

  const pageRes = await fetch(`${baseUrl}/some/sub/route`);
  assert.equal(pageRes.status, 200);
  const html = await pageRes.text();
  assert.ok(html.includes('Ateliê Test'));
});

