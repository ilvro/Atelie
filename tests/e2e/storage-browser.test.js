import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { projectDir } from '../../server/paths.js';

test('browser storage: static SPA in browser mode creates, saves, and reloads from IndexedDB', { timeout: 90_000 }, async (t) => {
  const distDir = path.join(projectDir, 'dist');

  // Simple static file server without any API routes
  const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    let filePath = path.join(distDir, urlPath === '/' ? 'index.html' : urlPath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.webp': 'image/webp',
      '.png': 'image/png',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
    };

    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;

  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  t.after(async () => {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  });

  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  // Navigate with ?storage=browser
  await page.goto(`http://127.0.0.1:${port}/?storage=browser`);
  await page.waitForFunction(() => !!window.__atelie && !!window.__atelie.api);

  // 1. Verify storage mode is browser
  const mode = await page.evaluate(() => window.__atelie.api.mode);
  assert.equal(mode, 'browser');

  // 2. Create and save a document in IndexedDB
  const created = await page.evaluate(async () => {
    const doc = {
      schema: 1,
      id: '00000000-0000-0000-0000-000000000001',
      revision: 0,
      name: 'Documento no Navegador',
      category: '',
      tags: [],
      folder: null,
      favorite: false,
      page: { width: 400, height: 400, background: '#ffffff' },
      layers: [
        {
          id: 'papel',
          name: 'Papel',
          kind: 'shape',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 0,
          y: 0,
          width: 400,
          height: 400,
          rotation: 0,
          clip: false,
          light: 'both',
          shape: { type: 'rect', fill: '#ffffff', stroke: null, strokeWidth: 0, radius: 0, dash: [] },
        },
      ],
      fields: [],
      source: { kind: 'blank' },
      back: null,
    };

    const c = await window.__atelie.api.handouts.create(doc);
    c.name = 'Documento Salvo e Atualizado';
    const s = await window.__atelie.api.handouts.save(c);
    return s;
  });

  assert.equal(created.revision, 2);
  assert.equal(created.name, 'Documento Salvo e Atualizado');

  // 3. Reload the page
  await page.reload();
  await page.waitForFunction(() => !!window.__atelie && !!window.__atelie.api);

  // 4. Verify document persists in IndexedDB after reload
  const persisted = await page.evaluate(async () => {
    const list = await window.__atelie.api.handouts.list();
    const doc = await window.__atelie.api.handouts.read('00000000-0000-0000-0000-000000000001');
    return { list, doc };
  });

  assert.equal(persisted.list.length, 1);
  assert.equal(persisted.list[0].id, '00000000-0000-0000-0000-000000000001');
  assert.equal(persisted.list[0].name, 'Documento Salvo e Atualizado');
  assert.equal(persisted.doc.revision, 2);

  // 5. Verify library reads house collection as static files
  const lib = await page.evaluate(async () => {
    return await window.__atelie.api.library.list();
  });

  assert.equal(lib.sources.length, 1);
  assert.equal(lib.sources[0].id, 'casa');
  assert.ok(Array.isArray(lib.items));

  assert.deepEqual(errors, []);
});

