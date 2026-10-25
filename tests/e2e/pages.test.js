import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import os from 'node:os';
import { stat, mkdtemp, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { chromium } from 'playwright';

const distPagesDir = path.resolve('dist-pages');

test('GitHub Pages e2e: static subpath /Atelie/, collection loading, IndexedDB persistence and Tabletop contract integration', { timeout: 90_000 }, async () => {
  const distStat = await stat(distPagesDir).catch(() => null);
  assert.ok(distStat && distStat.isDirectory(), 'dist-pages/ deve existir antes do teste. Execute npm run build:pages.');

  // Set up static Express server serving /Atelie/ and /Tabletop/ on same origin
  const app = express();

  // 1. Serve Atelie on /Atelie/
  app.use('/Atelie', express.static(distPagesDir));

  // 2. Minimal Tabletop test fixture on /Tabletop/
  const tabletopHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Tabletop Fixture</title></head>
<body>
  <h1>Tabletop Mesa Test</h1>
  <div id="status">ready</div>
  <script>
    window.__receivedMessages = [];
    const channel = new BroadcastChannel('mesa:handout');
    channel.onmessage = (e) => {
      window.__receivedMessages.push(e.data);
    };

    window.openExchangeDb = () => {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('mesa-handouts-v1', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('handouts')) {
            db.createObjectStore('handouts', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('bakes')) {
            db.createObjectStore('bakes', { keyPath: ['id', 'light'] });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    };
  </script>
</body>
</html>`;

  app.get('/Tabletop', (_req, res) => res.type('html').send(tabletopHtml));
  app.get('/Tabletop/', (_req, res) => res.type('html').send(tabletopHtml));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;

  const tmpProfile = await mkdtemp(path.join(os.tmpdir(), 'atelie-pages-e2e-'));
  const browserContext = await chromium.launchPersistentContext(tmpProfile, {
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox'],
    viewport: { width: 1400, height: 950 },
  });

  const pageAtelie = await browserContext.newPage();
  const pageErrors = [];
  const badApiRequests = [];

  pageAtelie.on('pageerror', err => pageErrors.push(err.message));
  pageAtelie.on('request', req => {
    const u = new URL(req.url());
    if (u.origin === origin && u.pathname.includes('/api/')) {
      badApiRequests.push(u.pathname);
    }
  });

  try {
    // -------------------------------------------------------------------------
    // 1. Abrir Ateliê sob o subcaminho /Atelie/ com um modelo da coleção
    // -------------------------------------------------------------------------
    await pageAtelie.goto(`${origin}/Atelie/?diagnostics&template=casa-tpl-carta-envelhecida`);
    await pageAtelie.waitForFunction(() => !!window.__atelie && !!window.__atelie.editor);
    await pageAtelie.waitForTimeout(400);

    // Conferir rodapé
    const footerText = await pageAtelie.locator('.desk-footer').textContent();
    assert.match(footerText, /navegador/i, 'Rodapé deve indicar salvamento neste navegador');

    // Conferir que fetch relativo da coleção funciona sob o subcaminho
    const fetchColecao = await pageAtelie.evaluate(async () => {
      const res = await fetch('colecao/library.json');
      const data = await res.json();
      return { ok: res.ok, status: res.status, itemsCount: data?.items?.length || 0 };
    });
    assert.equal(fetchColecao.ok, true, 'fetch colecao/library.json sob subcaminho deve ter sucesso');
    assert.ok(fetchColecao.itemsCount > 0, 'library.json deve conter itens da coleção');

    // Nenhum pedido à API REST de servidor
    assert.deepEqual(badApiRequests, [], 'Nenhum pedido a /api/ deve ocorrer em modo Pages (browser storage)');

    // Documento instanciado
    const doc = await pageAtelie.evaluate(() => window.__atelie.editor.state.handout);
    assert.ok(doc, 'Documento deve ser carregado');
    assert.equal(doc.source.templateId, 'casa-tpl-carta-envelhecida');
    const docId = doc.id;

    // -------------------------------------------------------------------------
    // 2. Abrir página Tabletop na mesma origem
    // -------------------------------------------------------------------------
    const pageTabletop = await browserContext.newPage();
    await pageTabletop.goto(`${origin}/Tabletop/`);
    await pageTabletop.waitForFunction(() => typeof window.openExchangeDb === 'function');

    // -------------------------------------------------------------------------
    // 3. Arquivar no Ateliê e verificar persistência após recarregamento
    // -------------------------------------------------------------------------
    await pageAtelie.bringToFront();

    // Modificar documento
    await pageAtelie.evaluate(() => {
      const editor = window.__atelie.editor;
      const h = structuredClone(editor.state.handout);
      h.name = 'Carta Pages Arquivada';
      editor.state.edit(h, { label: 'Editar título para teste' });
    });

    await pageAtelie.click('[data-action="archive"]');
    await pageAtelie.waitForFunction(() => !window.__atelie.editor.state.dirty);
    await pageAtelie.waitForTimeout(500);

    // Recarregar a página do Ateliê com o documento arquivado e verificar persistência no IndexedDB
    await pageAtelie.goto(`${origin}/Atelie/?diagnostics&handout=${docId}`);
    await pageAtelie.waitForFunction(() => !!window.__atelie && !!window.__atelie.editor);
    await pageAtelie.waitForTimeout(400);

    const reloadedDoc = await pageAtelie.evaluate(() => window.__atelie.editor.state.handout);
    assert.equal(reloadedDoc.name, 'Carta Pages Arquivada', 'Documento arquivado deve persistir após recarregar página');
    assert.equal(reloadedDoc.id, docId);

    // -------------------------------------------------------------------------
    // 4. No Tabletop: verificar documento e assado no banco de troca mesa-handouts-v1
    // -------------------------------------------------------------------------
    await pageTabletop.bringToFront();

    const exchangeData = await pageTabletop.evaluate(async (id) => {
      const db = await window.openExchangeDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['handouts', 'bakes'], 'readonly');
        const hReq = tx.objectStore('handouts').get(id);
        const bReq = tx.objectStore('bakes').get([id, 'normal']);
        tx.oncomplete = () => {
          resolve({
            handout: hReq.result ? { id: hReq.result.id, name: hReq.result.name, revision: hReq.result.revision } : null,
            bake: bReq.result ? { id: bReq.result.id, light: bReq.result.light, hasBlob: !!bReq.result.blob } : null,
          });
        };
        tx.onerror = () => reject(tx.error);
      });
    }, docId);

    assert.ok(exchangeData.handout, 'Documento deve constar em mesa-handouts-v1');
    assert.equal(exchangeData.handout.id, docId);
    assert.equal(exchangeData.handout.name, 'Carta Pages Arquivada');
    assert.ok(exchangeData.bake, 'Assado normal deve constar em mesa-handouts-v1');
    assert.equal(exchangeData.bake.hasBlob, true, 'Assado deve conter Blob de imagem');

    // -------------------------------------------------------------------------
    // 5. Arquivar de novo no Ateliê e verificar BroadcastChannel no Tabletop
    // -------------------------------------------------------------------------
    await pageAtelie.bringToFront();
    await pageAtelie.evaluate(() => {
      const editor = window.__atelie.editor;
      const h = structuredClone(editor.state.handout);
      h.name = 'Carta Pages Revisão 2';
      editor.state.edit(h, { label: 'Editar título segunda vez' });
    });

    await pageAtelie.click('[data-action="archive"]');
    await pageAtelie.waitForFunction(() => !window.__atelie.editor.state.dirty);
    await pageAtelie.waitForTimeout(500);

    // Verificar recebimento no Tabletop
    await pageTabletop.waitForFunction(() => (window.__receivedMessages || []).length > 0);
    const lastMsg = await pageTabletop.evaluate(() => window.__receivedMessages[window.__receivedMessages.length - 1]);
    assert.equal(lastMsg.app, 'atelie');
    assert.equal(lastMsg.contract, 1);
    assert.equal(lastMsg.type, 'handout-saved');
    assert.equal(lastMsg.id, docId);

    assert.equal(pageErrors.length, 0, `Nenhum erro de página esperado: ${pageErrors.join('; ')}`);
  } finally {
    await browserContext.close();
    server.close();
    await rm(tmpProfile, { recursive: true, force: true });
  }
});
