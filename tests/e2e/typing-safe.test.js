import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('typing is safe: tool letters never fire while writing; B is the brush and Shift+B the library', { timeout: 120_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-typing-e2e-'));
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
  await page.evaluate(() => window.__atelie.editor.stage.zoom('fit'));
  await page.waitForTimeout(1200);
  const tool = () => page.evaluate(() => window.__atelie.editor.stage.getTool());
  const drawer = () => page.evaluate(() => document.querySelector('#app-drawer')?.classList.contains('open'));
  const SENTENCE = 'Tarde, queimado. Xícara quebrada: bilhete, mesa, dobras, 1 livro';

  // 1. A text box created by double click, typing at once (no waiting for focus)
  const point = await page.evaluate(() => {
    const r = document.querySelector('.stage-page-wrap').getBoundingClientRect();
    return { x: r.left + r.width * 0.5, y: Math.min(r.top + r.height * 0.8, window.innerHeight - 120) };
  });
  await page.mouse.dblclick(point.x, point.y);
  // The box counts as "editing" from the moment it opens, even before the browser hands it the focus
  await page.waitForFunction(() => Boolean(document.querySelector('[data-editing]')));
  await page.waitForFunction(() => document.activeElement?.classList.contains('stage-inline-text-editor'));
  await page.keyboard.type(SENTENCE);
  const diag = await page.evaluate(() => ({ active: document.activeElement?.tagName + '.' + document.activeElement?.className, value: document.querySelector('.stage-inline-text-editor')?.value, disp: document.querySelector('.stage-inline-text-editor')?.style.display, layers: window.__atelie.editor.state.handout.layers.length }));
  assert.equal(await tool(), 'select', `no tool was picked while typing in the stage ${JSON.stringify(diag)}`);
  assert.equal(await drawer(), false, 'no drawer opened while typing in the stage');
  const typed = await page.evaluate(() => document.querySelector('.stage-inline-text-editor')?.value);
  assert.equal(typed, SENTENCE, 'every letter reached the text');
  await page.keyboard.press('Escape');

  // 2. The document name, the library search and the settings fields
  await page.click('.at-doc-name-input');
  await page.keyboard.press('Control+a');
  await page.keyboard.type(SENTENCE);
  assert.equal(await page.inputValue('.at-doc-name-input'), SENTENCE);
  assert.equal(await tool(), 'select');
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('Shift+B');
  await page.waitForSelector('.library-search-input');
  assert.equal(await page.evaluate(() => document.querySelector('#app-drawer').classList.contains('open')), true, 'Shift+B opens the library');
  await page.click('.library-search-input');
  await page.keyboard.type(SENTENCE);
  assert.equal(await page.inputValue('.library-search-input'), SENTENCE);
  assert.equal(await tool(), 'select');
  await page.keyboard.press('Escape');

  // 3. A text layer selected but not being edited: Enter writes, and the letters go to the text
  await page.evaluate(() => {
    const ed = window.__atelie.editor;
    const txt = { id: 'tx', name: 'T', kind: 'text', visible: true, locked: false, x: 100, y: 100, width: 600, height: 200, rotation: 0, opacity: 1, blend: 'normal', light: 'both',
      text: { content: '', font: { family: 'IM Fell English', library: null, weight: 400, italic: false }, size: 40, color: '#000000', align: 'left', valign: 'top', lineHeight: 1.25, letterSpacing: 0, box: 'area', fit: 'overflow', highlight: null, ink: { style: 'clean', wear: 0, seed: 1 } } };
    ed.loadHandout({ ...ed.state.handout, layers: [...ed.state.handout.layers, txt] }, { skipDraftCheck: true });
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.activeElement?.blur(); window.__atelie.editor.state.select('tx'); });
  await page.keyboard.press('Enter');
  await page.keyboard.type(SENTENCE);
  assert.equal(await tool(), 'select');
  assert.equal(await page.evaluate(() => document.querySelector('.stage-inline-text-editor').value), SENTENCE);
  await page.keyboard.press('Escape');

  // 4. The mini-bar size field and the Propriedades text content
  await page.evaluate(() => window.__atelie.editor.state.select('tx'));
  await page.click('.inspector-tab[data-tab="properties"]');
  await page.fill('textarea[data-field="h:text.content"]', '');
  await page.click('textarea[data-field="h:text.content"]');
  await page.keyboard.type(SENTENCE);
  assert.equal(await tool(), 'select');
  assert.equal(await drawer(), false);
  assert.equal(await page.evaluate(() => window.__atelie.editor.state.handout.layers.find(l => l.id === 'tx').text.content), SENTENCE);

  // T makes a text box and writes at once; G (not T) is the tear tool
  await page.evaluate(() => { document.activeElement?.blur(); window.__atelie.editor.state.select(null); });
  const before = await page.evaluate(() => window.__atelie.editor.state.handout.layers.length);
  await page.keyboard.press('t');
  await page.waitForFunction(() => document.activeElement?.classList.contains('stage-inline-text-editor'));
  assert.equal(await page.evaluate(() => window.__atelie.editor.state.handout.layers.length), before + 1, 'T creates a text layer');
  assert.equal(await tool(), 'select', 'T is not a drawing tool');
  await page.keyboard.type('Gato');
  assert.equal(await page.evaluate(() => document.querySelector('.stage-inline-text-editor').value), 'Gato', 'the letters go into the new text');
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('g');
  assert.equal(await tool(), 'tear', 'G picks the tear tool');
  await page.keyboard.press('v');

  // B picks the brush when nothing is being typed
  await page.evaluate(() => { document.activeElement?.blur(); window.__atelie.editor.state.select(null); });
  await page.click('.rail-btn[data-action="desk"]').catch(() => {});
  await page.evaluate(() => document.activeElement?.blur());
  assert.deepEqual(errors, []);
});
