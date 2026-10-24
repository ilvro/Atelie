import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('tabs e2e: same document in two tabs makes second tab read-only and allows claiming edit', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-tabs-e2e-'));
  const distDir = path.join(projectDir, 'dist');
  const app = await createApp({ dataDir, distDir });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });

  t.after(async () => {
    await browser.close();
    await new Promise(r => server.close(r));
    await rm(dataDir, { recursive: true, force: true });
  });

  // 1. Tab 1 opens and archives a document
  const page1 = await context.newPage();
  await page1.goto(`${baseUrl}/?diagnostics`);
  await page1.waitForFunction(() => !!window.__atelie?.editor?.state);

  const nameInput1 = page1.locator('.at-doc-name-input');
  await nameInput1.fill('Documento Concorrente');
  await nameInput1.dispatchEvent('input');
  await page1.click('[data-action="archive"]');
  await page1.waitForTimeout(500);

  const docId = await page1.evaluate(() => window.__atelie.editor.state.handout.id);
  assert.ok(docId, 'Document archived in tab 1');

  // Verify tab 1 is NOT in read-only mode
  assert.equal(await page1.locator('.desk-readonly-banner').isVisible(), false, 'Tab 1 should not be read-only');

  // 2. Tab 2 opens the SAME document
  const page2 = await context.newPage();
  await page2.goto(`${baseUrl}/?diagnostics&handout=${docId}`);
  await page2.waitForFunction(() => !!window.__atelie?.editor?.state);
  await page2.waitForTimeout(600);

  // 3. Tab 2 should be in read-only mode with the banner visible
  const banner2 = page2.locator('.desk-readonly-banner');
  await banner2.waitFor({ state: 'visible' });
  assert.ok(await banner2.isVisible(), 'Tab 2 should display read-only banner');

  // Input and buttons should be disabled in tab 2
  const nameInput2 = page2.locator('.at-doc-name-input');
  assert.ok(await nameInput2.isDisabled(), 'Document name should be disabled in read-only tab');
  const archiveBtn2 = page2.locator('[data-action="archive"]');
  assert.ok(await archiveBtn2.isDisabled(), 'Archive button should be disabled in read-only tab');

  // 4. Tab 2 clicks "Editar aqui" to claim editing rights
  await page2.click('.claim-edit-btn');
  await page2.waitForTimeout(400);

  // Tab 2 banner should now be hidden and controls enabled
  assert.equal(await banner2.isVisible(), false, 'Tab 2 should no longer be read-only');
  assert.equal(await nameInput2.isDisabled(), false, 'Tab 2 name input should now be enabled');

  // 5. Tab 1 should now receive notification and become read-only!
  const banner1 = page1.locator('.desk-readonly-banner');
  await banner1.waitFor({ state: 'visible' });
  assert.ok(await banner1.isVisible(), 'Tab 1 should now display read-only banner');
  assert.ok(await nameInput1.isDisabled(), 'Tab 1 name input should now be disabled');
});
