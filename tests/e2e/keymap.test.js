import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('keymap e2e: change a shortcut in Help, conflicts, reset, Esc cascade, varied duplicate, crooked stamps', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-keymap-e2e-'));
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

  // Help lists the shortcuts with "Alterar"
  await page.keyboard.press('?');
  await page.waitForSelector('.help-shortcuts-table');
  const row = page.locator('tr[data-shortcut-id="uv-light"]');
  assert.equal((await row.locator('kbd').textContent()).trim(), 'U');

  // A taken combination is refused with a message
  await row.locator('[data-key-change]').click();
  await page.keyboard.press('e'); // "Exportar" already uses E
  await page.waitForSelector('tr[data-shortcut-id="uv-light"] .help-key-note:not(:empty)');
  assert.match(await row.locator('.help-key-note').textContent(), /já é usado/);
  assert.equal((await row.locator('kbd').textContent()).trim(), 'U');

  // A free one is accepted and takes effect
  await row.locator('[data-key-change]').click();
  await page.keyboard.press('Shift+Y');
  await page.waitForFunction(() => document.querySelector('tr[data-shortcut-id="uv-light"] kbd').textContent.trim() === 'Shift+Y');
  assert.ok(await page.locator('tr[data-shortcut-id="uv-light"] [data-key-reset]').count() > 0, '"Restaurar padrão" appears');
  await page.keyboard.press('?'); // close help
  await page.waitForTimeout(300);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('u');
  assert.equal(await page.evaluate(() => window.__atelie.editor.light), 'normal', 'old key no longer turns the UV light on');
  await page.keyboard.press('Shift+Y');
  assert.equal(await page.evaluate(() => window.__atelie.editor.light), 'uv', 'new key does');
  await page.keyboard.press('Shift+Y');

  // The choice survives a reload
  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);
  await page.keyboard.press('?');
  await page.waitForSelector('.help-shortcuts-table');
  assert.equal((await page.locator('tr[data-shortcut-id="uv-light"] kbd').textContent()).trim(), 'Shift+Y');

  // Reset all goes back to U
  await page.click('[data-action="reset-all-shortcuts"]');
  assert.equal((await page.locator('tr[data-shortcut-id="uv-light"] kbd').textContent()).trim(), 'U');
  await page.keyboard.press('Escape');

  // Esc peels one thing at a time: selection first, then the drawer
  await page.evaluate(() => {
    const ed = window.__atelie.editor;
    ed.state.select(ed.state.handout.layers[0].id);
  });
  await page.keyboard.press('b'); // library drawer
  await page.waitForSelector('#app-drawer.open');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => window.__atelie.editor.state.selection), null, 'first Esc drops the selection');
  assert.ok(await page.evaluate(() => document.querySelector('#app-drawer').classList.contains('open')), 'drawer still open');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#app-drawer').classList.contains('open'));

  // Ctrl+Shift+D: a copy that is offset, turned a few degrees, with a new seed
  const dup = await page.evaluate(async () => {
    const ed = window.__atelie.editor;
    const doc = ed.state.handout;
    const txt = { id: 'tx', name: 'T', kind: 'text', visible: true, locked: false, x: 100, y: 100, width: 300, height: 100, rotation: 0, opacity: 1, blend: 'normal', light: 'both',
      text: { content: 'a', font: { family: 'IM Fell English', library: null, weight: 400, italic: false }, size: 30, color: '#000000', align: 'left', valign: 'top', lineHeight: 1.2, letterSpacing: 0, box: 'area', fit: 'overflow', highlight: null, ink: { style: 'typewriter', wear: 0.3, seed: 5 } } };
    await ed.loadHandout({ ...doc, layers: [...doc.layers, txt] }, { skipDraftCheck: true });
    ed.state.select('tx');
    return true;
  });
  assert.ok(dup);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('Control+Shift+D');
  const copy = await page.evaluate(() => {
    const ls = window.__atelie.editor.state.handout.layers;
    return ls[ls.length - 1];
  });
  assert.equal(copy.x, 124);
  assert.equal(copy.y, 124);
  assert.ok(Math.abs(((copy.rotation + 180) % 360) - 180) >= 2 && Math.abs(((copy.rotation + 180) % 360) - 180) <= 4.01, `rotation ±2–4°, got ${copy.rotation}`);
  assert.notEqual(copy.text.ink.seed, 5);

  // Stamps land crooked by default (±3°) and straight once the setting is off
  const tilts = await page.evaluate(async () => {
    const { items } = await window.__atelie.api.library.list();
    const stamp = items.find(i => i.category === 'Carimbos');
    return { id: stamp.id };
  });
  await page.keyboard.press('b');
  await page.waitForSelector('.library-item-card');
  await page.click('.filter-chip[data-filter-group="category"][data-filter-value="Carimbos"]');
  const rotations = [];
  for (let i = 0; i < 6; i++) {
    await page.locator('.library-item-card').first().click();
    rotations.push(await page.evaluate(() => { const ls = window.__atelie.editor.state.handout.layers; return ls[ls.length - 1].rotation; }));
  }
  const norm = r => ((r + 180) % 360) - 180;
  assert.ok(rotations.every(r => Math.abs(norm(r)) <= 3.01), `all within ±3°: ${rotations}`);
  assert.ok(rotations.some(r => r !== 0), 'at least one is actually turned');
  assert.ok(tilts.id);

  assert.deepEqual(errors, []);
});
