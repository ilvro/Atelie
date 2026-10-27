import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

const FONT = path.join(projectDir, 'public/colecao/fontes/apache/rocksalt/RockSalt-Regular.ttf');

test('user fonts e2e: send a font, see its card, apply it to text, survive reload, reject garbage, remove', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-userfonts-e2e-'));
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
  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);

  await page.click('.rail-btn[data-action="library"]');
  await page.click('.library-type-chips [data-type="fonts"]');
  await page.waitForSelector('[data-action="upload-font"]');

  // Garbage is refused with a note, not stored
  const [chooser0] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-action="upload-font"]'),
  ]);
  await chooser0.setFiles({ name: 'quebrada.ttf', mimeType: 'font/ttf', buffer: Buffer.from('isto não é uma fonte') });
  await page.waitForFunction(() => /Não consegui ler/.test(document.body.innerText));
  assert.equal(await page.locator('.font-upload-modal').count(), 0);

  // A real font: the dialog suggests the name from the file name
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-action="upload-font"]'),
  ]);
  await chooser.setFiles(FONT);
  await page.waitForSelector('.font-upload-modal', { state: 'visible' });
  assert.equal(await page.inputValue('[data-font-name]'), 'Rock Salt');
  await page.fill('[data-font-name]', 'Minha Rock Salt');
  await page.click('.font-upload-confirm');
  await page.waitForSelector('.library-font-card[data-family="Minha Rock Salt"]');
  assert.ok(await page.locator('.filter-chip[data-filter-value="Minhas fontes"]').count() > 0, 'category “Minhas fontes” exists');

  // Apply it to a text layer: the layer points to the user font and the canvas gets drawn with it
  await page.evaluate(() => {
    const ed = window.__atelie.editor;
    const doc = ed.state.handout;
    const txt = { id: 'tx', name: 'T', kind: 'text', visible: true, locked: false, x: 100, y: 100, width: 600, height: 200, rotation: 0, opacity: 1, blend: 'normal', light: 'both',
      text: { content: 'Querida Lia', font: { family: 'IM Fell English', library: null, weight: 400, italic: false }, size: 80, color: '#000000', align: 'left', valign: 'top', lineHeight: 1.2, letterSpacing: 0, box: 'area', fit: 'overflow', highlight: null, ink: { style: 'clean', wear: 0, seed: 1 } } };
    ed.loadHandout({ ...doc, layers: [...doc.layers, txt] }, { skipDraftCheck: true });
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__atelie.editor.state.select('tx'));
  await page.click('.library-font-card[data-family="Minha Rock Salt"]');
  const font = await page.evaluate(() => window.__atelie.editor.state.handout.layers.find(l => l.id === 'tx').text.font);
  assert.equal(font.family, 'Minha Rock Salt');
  assert.match(font.library, /^usuario-font-/);
  const loaded = await page.evaluate(async (f) => {
    await window.__atelie.editor.stage && 0;
    return [...document.fonts].some(ff => ff.family.replace(/"/g, '') === f.family && ff.status === 'loaded');
  }, font);
  assert.ok(loaded, 'the FontFace for the user font is loaded');

  // It survives a reload, in the library and in the selector
  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);
  const items = await page.evaluate(async () => (await window.__atelie.api.library.list()).items.filter(i => i.source === 'usuario'));
  assert.equal(items.length, 1);
  assert.equal(items[0].category, 'Minhas fontes');

  // Remove it from the context menu (only user fonts have one)
  await page.click('.rail-btn[data-action="library"]');
  await page.click('.library-type-chips [data-type="fonts"]');
  await page.locator('.library-font-card[data-family="Minha Rock Salt"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.locator('.library-font-card[data-family="Minha Rock Salt"]').click({ button: 'right' });
  await page.click('text=Remover fonte');
  await page.waitForFunction(() => !document.querySelector('.library-font-card[data-family="Minha Rock Salt"]'));
  const left = await page.evaluate(async () => (await window.__atelie.api.library.list()).items.filter(i => i.source === 'usuario').length);
  assert.equal(left, 0);

  assert.deepEqual(errors, []);
});
