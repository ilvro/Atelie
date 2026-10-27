import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('document tabs e2e: open in tabs, keep edits across tabs, Mesa keeps tabs, close asks when dirty, reload restores', { timeout: 120_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-doctabs-e2e-'));
  const app = await createApp({ dataDir, distDir: path.join(projectDir, 'dist') });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  t.after(async () => {
    await browser.close();
    await new Promise(r => server.close(r));
    await rm(dataDir, { recursive: true, force: true });
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto(`${baseUrl}/?diagnostics&start`);
  await page.waitForSelector('.desk-start-wrapper', { state: 'visible' });

  // Two documents created straight from the Mesa → two tabs
  const created = await page.evaluate(async () => {
    const mk = async (name) => {
      const doc = window.__atelie.editor.createHandout({ name, preset: 'a4' });
      const saved = await window.__atelie.api.handouts.create(doc);
      return saved.id;
    };
    return [await mk('Primeiro'), await mk('Segundo')];
  });
  assert.ok(created.every(Boolean), 'server created the two documents');

  // The first opens from the Mesa (new tab); the second with Ctrl+click in the Documentos drawer (another tab)
  await page.evaluate(id => window.__atelie.editor.openDocumentById(id), created[0]);
  await page.waitForSelector('.desk-doc-bar', { state: 'visible' });
  await page.click('.rail-btn[data-action="documents"]');
  await page.waitForSelector(`.nav-doc-row[data-doc-id="${created[1]}"]`);
  await page.click(`.nav-doc-row[data-doc-id="${created[1]}"]`, { modifiers: ['Control'] });
  await page.waitForFunction(() => document.querySelectorAll('.desk-tab-list .desk-tab').length === 2);

  const tabs = await page.locator('.desk-tab-list .desk-tab').allTextContents();
  assert.equal(tabs.length, 2);

  // Edit the second document (active), switch to the first and back: the edit and history stay
  await page.fill('.at-doc-name-input', 'Segundo editado');
  await page.waitForTimeout(100);
  await page.click(`.desk-tab[data-tab-id="${created[0]}"]`);
  await page.waitForFunction(id => window.__atelie.editor.state?.handout.id === id, created[0]);
  await page.click(`.desk-tab[data-tab-id="${created[1]}"]`);
  await page.waitForFunction(id => window.__atelie.editor.state?.handout.id === id, created[1]);
  const back = await page.evaluate(() => ({ name: window.__atelie.editor.state.handout.name, canUndo: window.__atelie.editor.state.canUndo }));
  assert.equal(back.name, 'Segundo editado');
  assert.equal(back.canUndo, true, 'history survives the tab switch');
  assert.ok(await page.locator(`.desk-tab[data-tab-id="${created[1]}"] .desk-tab-dirty`).count() > 0, 'dirty dot on the edited tab');

  // The Mesa shows the start screen and the tabs stay
  await page.click('.rail-btn[data-action="desk"]');
  await page.waitForSelector('.desk-start-wrapper', { state: 'visible' });
  assert.equal(await page.locator('.desk-tab-list .desk-tab').count(), 2, 'tabs stay after going to the Mesa');
  await page.click('.desk-tab.is-mesa');
  await page.click(`.desk-tab[data-tab-id="${created[1]}"]`);
  await page.waitForSelector('.desk-doc-bar', { state: 'visible' });

  // Reload restores the tabs (the edited one comes back from its draft)
  await page.waitForTimeout(1000);
  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => document.querySelectorAll('.desk-tab-list .desk-tab').length === 2);
  const restored = await page.evaluate(() => window.__atelie.editor.tabs.map(x => ({ name: x.name, active: x.active })));
  assert.deepEqual(restored.map(x => x.name), ['Primeiro', 'Segundo editado']);
  assert.equal(restored[1].active, true);

  // Closing a dirty tab asks first; cancel keeps it, discard closes it
  await page.click(`.desk-tab[data-tab-id="${created[1]}"] .desk-tab-close`);
  await page.waitForSelector('.at-modal-backdrop .at-modal', { state: 'visible' });
  await page.click('.modal-cancel-btn');
  assert.equal(await page.locator('.desk-tab-list .desk-tab').count(), 2);
  await page.click(`.desk-tab[data-tab-id="${created[1]}"] .desk-tab-close`);
  await page.click('.modal-discard-btn');
  await page.waitForFunction(() => document.querySelectorAll('.desk-tab-list .desk-tab').length === 1);
  assert.equal(await page.evaluate(() => window.__atelie.editor.activeTabId) != null, true, 'the neighbour tab becomes active');

  // Closing the last tab goes to the Mesa
  await page.keyboard.press('Control+w');
  await page.waitForSelector('.desk-start-wrapper', { state: 'visible' });

  assert.deepEqual(errors, []);
});
