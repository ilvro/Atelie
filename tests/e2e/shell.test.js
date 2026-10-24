import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('shell layout, rail, drawers, palette, settings, context menu and reduced motion', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-shell-e2e-'));
  const distDir = path.join(projectDir, 'dist');
  const app = await createApp({ dataDir, distDir });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  t.after(async () => {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.setDefaultTimeout(15_000);
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => !!window.__atelie);

  // 1. Page title and shell root
  assert.equal(await page.title(), 'Ateliê de documentos');
  assert.equal(await page.locator('#app-shell').count(), 1);

  // 2. Rail buttons and labels
  const railActions = ['desk', 'documents', 'library', 'templates', 'reader', 'export', 'settings', 'help'];
  for (const action of railActions) {
    const btn = page.locator(`.app-rail [data-action="${action}"]`);
    assert.equal(await btn.count(), 1, `rail button [data-action="${action}"]`);
    assert.ok((await btn.getAttribute('aria-label'))?.length > 0, `aria-label on ${action}`);
  }

  // 3. Opening and closing each drawer
  const drawer = page.locator('#app-drawer');
  const drawerTitle = page.locator('#drawer-title');

  // Open documents drawer
  await page.locator('.app-rail [data-action="documents"]').click();
  await page.waitForFunction(() => document.querySelector('#app-drawer')?.classList.contains('open'));
  assert.match(await drawerTitle.innerText(), /DOCUMENTOS/i);

  // Close with Escape
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#app-drawer')?.classList.contains('open'));

  // Open library drawer
  await page.locator('.app-rail [data-action="library"]').click();
  await page.waitForFunction(() => document.querySelector('#app-drawer')?.classList.contains('open'));
  assert.match(await drawerTitle.innerText(), /BIBLIOTECA/i);

  // Close with drawer close button
  await page.locator('[data-action="drawer-close"]').click();
  await page.waitForFunction(() => !document.querySelector('#app-drawer')?.classList.contains('open'));

  // Open templates drawer
  await page.locator('.app-rail [data-action="templates"]').click();
  await page.waitForFunction(() => document.querySelector('#app-drawer')?.classList.contains('open'));
  assert.match(await drawerTitle.innerText(), /MODELOS/i);

  // Toggle close by clicking same rail button
  await page.locator('.app-rail [data-action="templates"]').click();
  await page.waitForFunction(() => !document.querySelector('#app-drawer')?.classList.contains('open'));

  // 4. Ctrl+K opens, filters, and Enter executes action "Abrir Ajustes"
  await page.keyboard.press('Control+k');
  await page.locator('#at-palette-modal').waitFor({ state: 'visible' });

  await page.locator('#at-palette-input').fill('ajustes');
  const results = page.locator('#at-palette-results .at-palette-item');
  await page.waitForFunction(() => document.querySelectorAll('#at-palette-results .at-palette-item').length === 1);
  assert.match(await results.first().innerText(), /Ajustes da mesa/i);

  await page.keyboard.press('Enter');
  await page.locator('#at-palette-modal').waitFor({ state: 'detached' });
  await page.locator('#at-settings-modal').waitFor({ state: 'visible' });

  // 5. Settings: change desk material to 'feltro', verify CSS var and persistence
  await page.locator('[data-material="feltro"]').click();
  const currentMaterial = await page.evaluate(() => document.documentElement.style.getPropertyValue('--at-desk-material'));
  assert.equal(currentMaterial, 'feltro');

  // Close settings
  await page.keyboard.press('Escape');
  await page.locator('#at-settings-modal').waitFor({ state: 'detached' });

  // Reload page and check persistence
  await page.reload();
  await page.waitForFunction(() => !!window.__atelie);
  const reloadedMaterial = await page.evaluate(() => document.documentElement.style.getPropertyValue('--at-desk-material'));
  assert.equal(reloadedMaterial, 'feltro');

  // 6. Notify: shows and auto-dismisses or has elements
  await page.evaluate(() => {
    window.__atelie.notify('Documento arquivado no cofre', { tone: 'ok' });
  });
  const note = page.locator('.notify-item.is-ok');
  await note.waitFor({ state: 'visible' });
  assert.match(await note.innerText(), /Documento arquivado/);

  // 7. Context menu: right click on desk, arrow down, escape to close
  await page.locator('#at-desk').click({ button: 'right', position: { x: 300, y: 300 } });
  const menu = page.locator('.at-context-menu');
  await menu.waitFor({ state: 'visible' });

  await page.keyboard.press('ArrowDown');
  const focusedItem = await page.evaluate(() => document.activeElement?.className);
  assert.match(focusedItem || '', /at-context-menu-item/);

  await page.keyboard.press('Escape');
  await menu.waitFor({ state: 'detached' });

  // 8. Reduced motion: no running animations
  const reducedPage = await browser.newPage({
    viewport: { width: 1200, height: 800 },
    reducedMotion: 'reduce',
  });
  reducedPage.on('pageerror', (err) => errors.push(err.message));
  await reducedPage.goto(`http://127.0.0.1:${server.address().port}/`);
  await reducedPage.waitForFunction(() => !!window.__atelie);

  await reducedPage.evaluate(() => {
    window.__atelie.notify('Nota sob movimento reduzido', { tone: 'info' });
  });
  await reducedPage.locator('.notify-item').waitFor({ state: 'visible' });

  const runningAnimationsCount = await reducedPage.evaluate(() => {
    return document.getAnimations().filter(a => a.playState === 'running').length;
  });
  assert.equal(runningAnimationsCount, 0, 'No animations should be actively running when reduced motion is requested');
  await reducedPage.close();

  assert.deepEqual(errors, []);
});
