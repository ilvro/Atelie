import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('exchange e2e (Caminho A): archive, BroadcastChannel, IndexedDB mesa-handouts-v1, trash, and settings toggle in server and browser modes', { timeout: 120_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-exchange-e2e-'));
  const distDir = path.join(projectDir, 'dist');
  const app = await createApp({ dataDir, distDir });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const serverBaseUrl = `http://127.0.0.1:${server.address().port}`;

  // Static server for browser-mode test
  const staticServer = http.createServer((req, res) => {
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
  staticServer.listen(0, '127.0.0.1');
  await once(staticServer, 'listening');
  const staticBaseUrl = `http://127.0.0.1:${staticServer.address().port}`;

  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  t.after(async () => {
    await browser.close();
    await new Promise(r => server.close(r));
    await new Promise(r => staticServer.close(r));
    await rm(dataDir, { recursive: true, force: true });
  });

  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });

  // --- PART 1: Server Mode ---
  // Page 2: Listener tab on the same origin listening to BroadcastChannel('mesa:handout')
  const page2 = await context.newPage();
  await page2.goto(`${serverBaseUrl}/?diagnostics`);
  await page2.waitForFunction(() => !!window.__atelie);

  await page2.evaluate(() => {
    window.__receivedMessages = [];
    const ch = new BroadcastChannel('mesa:handout');
    ch.onmessage = (e) => {
      window.__receivedMessages.push(e.data);
    };
  });

  // Page 1: Editor tab where document is edited and archived
  const page1 = await context.newPage();
  await page1.goto(`${serverBaseUrl}/?diagnostics`);
  await page1.waitForFunction(() => !!window.__atelie?.editor?.state);

  // Set document name and add a visible UV layer
  const docId = await page1.evaluate(() => {
    const editor = window.__atelie.editor;
    const doc = structuredClone(editor.state.handout);
    doc.name = 'Documento UV Mesa';
    doc.layers.push({
      id: 'uv-layer-1',
      name: 'Pista UV',
      kind: 'shape',
      visible: true,
      locked: false,
      opacity: 1,
      blend: 'normal',
      x: 20,
      y: 20,
      width: 80,
      height: 80,
      rotation: 0,
      clip: false,
      light: 'uv',
      shape: { type: 'rect', fill: '#00ffff', stroke: null, strokeWidth: 0, radius: 0, dash: [] },
    });
    editor.state.edit(doc, { label: 'Adicionar camada UV' });
    return doc.id;
  });

  // Archive on Page 1
  await page1.click('[data-action="archive"]');
  await page1.waitForTimeout(600);

  // Check on Page 2 that BroadcastChannel received 'handout-saved'
  await page2.waitForFunction(() => (window.__receivedMessages || []).length > 0);
  const msg1 = await page2.evaluate(() => window.__receivedMessages[window.__receivedMessages.length - 1]);
  assert.equal(msg1.app, 'atelie');
  assert.equal(msg1.contract, 1);
  assert.equal(msg1.type, 'handout-saved');
  assert.equal(msg1.id, docId);
  assert.equal(msg1.revision, 1);

  // Check IndexedDB mesa-handouts-v1 on Page 2
  const exchangeData1 = await page2.evaluate(async (id) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('mesa-handouts-v1', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['handouts', 'bakes'], 'readonly');
      const hReq = tx.objectStore('handouts').get(id);
      const bNormalReq = tx.objectStore('bakes').get([id, 'normal']);
      const bUvReq = tx.objectStore('bakes').get([id, 'uv']);
      tx.oncomplete = () => {
        resolve({
          handout: hReq.result ? {
            id: hReq.result.id,
            name: hReq.result.name,
            hasUv: hReq.result.hasUv,
            revision: hReq.result.revision,
            hasPreview: hReq.result.preview instanceof Blob,
          } : null,
          normalBake: bNormalReq.result ? {
            id: bNormalReq.result.id,
            light: bNormalReq.result.light,
            revision: bNormalReq.result.revision,
            hasBlob: bNormalReq.result.blob instanceof Blob,
            width: bNormalReq.result.width,
            height: bNormalReq.result.height,
          } : null,
          uvBake: bUvReq.result ? {
            id: bUvReq.result.id,
            light: bUvReq.result.light,
            revision: bUvReq.result.revision,
            hasBlob: bUvReq.result.blob instanceof Blob,
            width: bUvReq.result.width,
            height: bUvReq.result.height,
          } : null,
        });
      };
      tx.onerror = () => reject(tx.error);
    });
  }, docId);

  assert.ok(exchangeData1.handout);
  assert.equal(exchangeData1.handout.hasUv, true);
  assert.equal(exchangeData1.handout.revision, 1);
  assert.ok(exchangeData1.normalBake);
  assert.equal(exchangeData1.normalBake.hasBlob, true);
  assert.equal(exchangeData1.normalBake.revision, 1);
  assert.ok(exchangeData1.uvBake);
  assert.equal(exchangeData1.uvBake.hasBlob, true);
  assert.equal(exchangeData1.uvBake.revision, 1);

  // Toggle off "Compartilhar com o Tabletop neste navegador" -> empties exchange DB
  await page1.evaluate(() => {
    window.dispatchEvent(new CustomEvent('atelie:share-tabletop-changed', { detail: { enabled: false } }));
  });
  await page1.waitForTimeout(400);

  const countAfterToggleOff = await page2.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('mesa-handouts-v1', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['handouts'], 'readonly');
      const req = tx.objectStore('handouts').count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
  assert.equal(countAfterToggleOff, 0, 'Exchange DB should be emptied after turning off sharing');

  // Toggle on again -> republishes all documents and broadcasts handout-saved
  await page1.evaluate(() => {
    window.dispatchEvent(new CustomEvent('atelie:share-tabletop-changed', { detail: { enabled: true } }));
  });

  await page2.waitForFunction(() => (window.__receivedMessages || []).length >= 2, { timeout: 15_000 });

  const countAfterToggleOn = await page2.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('mesa-handouts-v1', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['handouts'], 'readonly');
      const req = tx.objectStore('handouts').count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
  assert.ok(countAfterToggleOn > 0, 'Exchange DB should republish after turning on sharing');

  // Move document to trash on Page 1
  await page1.evaluate(async (id) => {
    await window.__atelie.api.handouts.remove(id);
    const { openExchange, unpublish, channel, removedMessage } = window.__atelie.exchange;
    const db = await openExchange();
    await unpublish(db, id);
    channel().postMessage(removedMessage(id, new URL('.', document.baseURI).href, 1));
  }, docId);

  // Check on Page 2 that BroadcastChannel received 'handout-removed'
  await page2.waitForFunction(() => (window.__receivedMessages || []).some(m => m.type === 'handout-removed'));
  const removedMsg = await page2.evaluate(() => window.__receivedMessages.find(m => m.type === 'handout-removed'));
  assert.equal(removedMsg.app, 'atelie');
  assert.equal(removedMsg.contract, 1);
  assert.equal(removedMsg.id, docId);

  // Verify mesa-handouts-v1 no longer has the document or bakes
  const exchangeDataAfterTrash = await page2.evaluate(async (id) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('mesa-handouts-v1', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['handouts', 'bakes'], 'readonly');
      const hReq = tx.objectStore('handouts').get(id);
      const bNormalReq = tx.objectStore('bakes').get([id, 'normal']);
      const bUvReq = tx.objectStore('bakes').get([id, 'uv']);
      tx.oncomplete = () => {
        resolve({
          handout: hReq.result || null,
          normalBake: bNormalReq.result || null,
          uvBake: bUvReq.result || null,
        });
      };
      tx.onerror = () => reject(tx.error);
    });
  }, docId);

  assert.equal(exchangeDataAfterTrash.handout, null);
  assert.equal(exchangeDataAfterTrash.normalBake, null);
  assert.equal(exchangeDataAfterTrash.uvBake, null);

  // --- PART 2: Browser Mode (static SPA with VITE_ATELIE_STORAGE=browser) ---
  const pageBrowser = await context.newPage();
  await pageBrowser.goto(`${staticBaseUrl}/?storage=browser&diagnostics`);
  await pageBrowser.waitForFunction(() => !!window.__atelie?.editor?.state);

  const browserDocId = await pageBrowser.evaluate(async () => {
    const editor = window.__atelie.editor;
    const doc = structuredClone(editor.state.handout);
    doc.name = 'Documento Browser Mode';
    editor.state.edit(doc, { label: 'Nome browser' });
    return doc.id;
  });

  await pageBrowser.click('[data-action="archive"]');
  await pageBrowser.waitForFunction(() => !window.__atelie?.editor?.state?.dirty);
  await pageBrowser.waitForTimeout(500);

  const exchangeDataBrowser = await pageBrowser.evaluate(async (id) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('mesa-handouts-v1', 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('handouts')) d.createObjectStore('handouts', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('bakes')) d.createObjectStore('bakes', { keyPath: ['id', 'light'] });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['handouts', 'bakes'], 'readonly');
      const hReq = tx.objectStore('handouts').get(id);
      const bReq = tx.objectStore('bakes').get([id, 'normal']);
      tx.oncomplete = () => {
        resolve({
          handout: hReq.result ? { id: hReq.result.id, name: hReq.result.name } : null,
          bake: bReq.result ? { id: bReq.result.id, hasBlob: bReq.result.blob instanceof Blob } : null,
        });
      };
      tx.onerror = () => reject(tx.error);
    });
  }, browserDocId);

  assert.ok(exchangeDataBrowser.handout);
  assert.equal(exchangeDataBrowser.handout.name, 'Documento Browser Mode');
  assert.ok(exchangeDataBrowser.bake);
  assert.equal(exchangeDataBrowser.bake.hasBlob, true);
});
