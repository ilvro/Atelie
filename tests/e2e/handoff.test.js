import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';
import { createHandout } from '../../src/domain/handouts.js';

test('handoff e2e (Caminho B): pick mode sends delivery and closes popup; handout mode sends on archive', { timeout: 120_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-handoff-e2e-'));
  const distDir = path.join(projectDir, 'dist');
  const app = await createApp({ dataDir, distDir });
  const atelieServer = app.listen(0, '127.0.0.1');
  await once(atelieServer, 'listening');
  const atelieBaseUrl = `http://127.0.0.1:${atelieServer.address().port}`;

  // Fake Tabletop server on a different port/origin
  const tabletopServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>Tabletop Mock</title></head>
        <body>
          <h1>Mesa Tabletop</h1>
          <script>
            window.__deliveries = [];
            window.addEventListener('message', async (e) => {
              const msg = e.data;
              let headerHex = null;
              if (msg && msg.delivery && msg.delivery.bakes && msg.delivery.bakes.normal) {
                const blob = msg.delivery.bakes.normal;
                const buf = await blob.arrayBuffer();
                const bytes = new Uint8Array(buf).slice(0, 4);
                headerHex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
              }
              window.__deliveries.push({
                origin: e.origin,
                data: msg,
                headerHex,
              });
            });
          </script>
        </body>
      </html>
    `);
  });
  tabletopServer.listen(0, '127.0.0.1');
  await once(tabletopServer, 'listening');
  const tabletopOrigin = `http://127.0.0.1:${tabletopServer.address().port}`;

  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  t.after(async () => {
    await browser.close();
    await new Promise(r => atelieServer.close(r));
    await new Promise(r => tabletopServer.close(r));
    await rm(dataDir, { recursive: true, force: true });
  });

  // Pre-create a document in Ateliê
  const doc = createHandout({ preset: 'a4' });
  doc.name = 'Pista Secreta Tabletop';
  const createRes = await fetch(`${atelieBaseUrl}/api/atelie/handouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handout: doc }),
  });
  assert.equal(createRes.status, 201);
  const createdDoc = (await createRes.json()).handout;

  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });

  // 1. Open Fake Tabletop Page
  const pageTabletop = await context.newPage();
  await pageTabletop.goto(tabletopOrigin);

  // --- MODE PICK (?pick=1) ---
  const popupPromise = pageTabletop.waitForEvent('popup');
  await pageTabletop.evaluate(({ atelieUrl, from, nonce }) => {
    window.open(`${atelieUrl}/?pick=1&from=${encodeURIComponent(from)}&nonce=${nonce}`, 'atelie_pick');
  }, { atelieUrl: atelieBaseUrl, from: tabletopOrigin, nonce: 'pick-nonce-abc' });

  const pickPopup = await popupPromise;
  await pickPopup.waitForLoadState('domcontentloaded');

  // Verify banner "O Tabletop pediu um documento"
  const banner = pickPopup.locator('.at-handoff-banner');
  await banner.waitFor({ state: 'visible' });
  assert.ok(await banner.isVisible());

  // Click "Enviar ao Tabletop"
  const sendBtn = pickPopup.locator('.nav-handoff-pick-btn').first();
  await sendBtn.waitFor({ state: 'visible' });
  await sendBtn.click();

  // Wait for popup to close itself within 1-2 seconds
  await pickPopup.waitForEvent('close', { timeout: 10_000 });

  // Verify Fake Tabletop received the delivered message
  await pageTabletop.waitForFunction(() => (window.__deliveries || []).length > 0);
  const deliveryRecord = await pageTabletop.evaluate(() => window.__deliveries[0]);

  assert.equal(deliveryRecord.origin, atelieBaseUrl);
  assert.equal(deliveryRecord.data.app, 'atelie');
  assert.equal(deliveryRecord.data.contract, 1);
  assert.equal(deliveryRecord.data.type, 'delivered');
  assert.equal(deliveryRecord.data.nonce, 'pick-nonce-abc');
  assert.equal(deliveryRecord.data.delivery.id, createdDoc.id);
  assert.equal(deliveryRecord.data.delivery.name, 'Pista Secreta Tabletop');
  assert.equal(deliveryRecord.headerHex, '89504e47', 'PNG magic bytes signature 89 50 4E 47');

  // --- MODE EDIT (?handout=<id>) ---
  const editPopupPromise = pageTabletop.waitForEvent('popup');
  await pageTabletop.evaluate(({ atelieUrl, from, id, nonce }) => {
    window.open(`${atelieUrl}/?diagnostics&handout=${id}&from=${encodeURIComponent(from)}&nonce=${nonce}`, 'atelie_edit');
  }, { atelieUrl: atelieBaseUrl, from: tabletopOrigin, id: createdDoc.id, nonce: 'edit-nonce-xyz' });

  const editPopup = await editPopupPromise;
  await editPopup.waitForLoadState('domcontentloaded');
  await editPopup.waitForFunction(() => !!window.__atelie?.editor?.state);

  // Verify stamp "Ligado ao Tabletop"
  const stamp = editPopup.locator('.at-handoff-stamp');
  await stamp.waitFor({ state: 'visible' });
  assert.ok(await stamp.isVisible());

  // Edit document name
  const nameInput = editPopup.locator('.at-doc-name-input');
  await nameInput.fill('Pista Secreta Editada');
  await nameInput.dispatchEvent('input');

  // Archive
  await editPopup.click('[data-action="archive"]');
  await editPopup.waitForTimeout(600);

  // Verify Fake Tabletop received second delivery on archive
  await pageTabletop.waitForFunction(() => (window.__deliveries || []).length >= 2);
  const editDeliveryRecord = await pageTabletop.evaluate(() => window.__deliveries[1]);

  assert.equal(editDeliveryRecord.data.app, 'atelie');
  assert.equal(editDeliveryRecord.data.contract, 1);
  assert.equal(editDeliveryRecord.data.type, 'delivered');
  assert.equal(editDeliveryRecord.data.nonce, 'edit-nonce-xyz');
  assert.equal(editDeliveryRecord.data.delivery.name, 'Pista Secreta Editada');
  assert.equal(editDeliveryRecord.data.delivery.revision, 2);
  assert.equal(editDeliveryRecord.headerHex, '89504e47');

  await editPopup.close();
});

