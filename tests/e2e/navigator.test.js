import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('navigator e2e: folders, drag/move, accent-insensitive search, pin, favorite, trash restore, draft recovery on reload, version restore, and Ctrl+K', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-navigator-e2e-'));
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

  t.after(async () => {
    await browser.close();
    await new Promise(r => server.close(r));
    await rm(dataDir, { recursive: true, force: true });
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  // 1. Initial page load
  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);

  // 2. Archive current document as "Relatório de Missão"
  const nameInput = page.locator('.at-doc-name-input');
  await nameInput.fill('Relatório de Missão');
  await nameInput.dispatchEvent('input');
  await page.click('[data-action="archive"]');
  await page.waitForTimeout(500);

  const initialDocId = await page.evaluate(() => window.__atelie.editor.state.handout.id);
  assert.ok(initialDocId, 'Document should have an ID after archiving');

  // 3. Open Documents Drawer
  await page.click('.rail-btn[data-action="documents"]');
  await page.waitForSelector('.docs-navigator', { state: 'visible' });

  // 4. Create two folders via UI
  page.once('dialog', dialog => dialog.accept('Campanha Paranormal'));
  await page.click('.nav-new-folder-btn');
  await page.waitForTimeout(300);

  page.once('dialog', dialog => dialog.accept('Evidências'));
  await page.click('.nav-new-folder-btn');
  await page.waitForTimeout(300);

  const folderNames = await page.locator('.nav-folder-name').allTextContents();
  assert.ok(folderNames.includes('Campanha Paranormal'), 'Folder Campanha Paranormal created');
  assert.ok(folderNames.includes('Evidências'), 'Folder Evidências created');

  // 5. Move document to "Campanha Paranormal" folder via context menu
  const docRow = page.locator(`.nav-doc-row[data-doc-id="${initialDocId}"]`).first();
  await docRow.click({ button: 'right' });
  await page.waitForSelector('.at-context-menu', { state: 'visible' });

  const moveItem = page.locator('.at-context-menu-item:has-text("Mover para: Campanha Paranormal")');
  await moveItem.click();
  await page.waitForTimeout(400);

  // Verify document is now inside Campanha Paranormal
  const docInFolder = page.locator(`.nav-folder-branch:has-text("Campanha Paranormal") .nav-doc-row[data-doc-id="${initialDocId}"]`);
  await docInFolder.waitFor({ state: 'visible' });

  // 6. Accent-insensitive Search
  const searchInput = page.locator('.nav-search-input');
  await searchInput.fill('relatorio missao');
  await page.waitForTimeout(200);
  assert.equal(await page.locator(`.nav-doc-row[data-doc-id="${initialDocId}"]`).count(), 1, 'Search finds document without accents');

  // Search by folder name
  await searchInput.fill('paranormal');
  await page.waitForTimeout(200);
  assert.equal(await page.locator(`.nav-doc-row[data-doc-id="${initialDocId}"]`).count(), 1, 'Search matches folder name');

  await page.click('.nav-search-clear');
  await page.waitForTimeout(200);

  // 7. Pin document
  const pinBtn = page.locator(`.nav-doc-row[data-doc-id="${initialDocId}"] .pin-btn`).first();
  await pinBtn.click();
  await page.waitForTimeout(200);

  const pinnedSection = page.locator('.nav-pinned-section');
  await pinnedSection.waitFor({ state: 'visible' });
  assert.ok(await pinnedSection.locator(`.nav-doc-row[data-doc-id="${initialDocId}"]`).isVisible(), 'Document is visible in pinned section');

  // 8. Favorite and filter
  const targetDocRow = page.locator(`.nav-doc-row[data-doc-id="${initialDocId}"]`).first();
  await targetDocRow.click({ button: 'right' });
  await page.waitForSelector('.at-context-menu', { state: 'visible' });
  await page.click('.at-context-menu-item:has-text("Favoritar")');
  await page.waitForTimeout(300);

  // Click "Favoritos" chip
  await page.click('.nav-chip[data-filter="favoritos"]');
  await page.waitForTimeout(200);
  assert.ok(await page.locator(`.nav-doc-row[data-doc-id="${initialDocId}"]`).isVisible(), 'Document is visible in Favoritos');

  // Back to "Todos"
  await page.click('.nav-chip[data-filter="todos"]');
  await page.waitForTimeout(200);

  // 9. Trash: Delete and restore
  const rowToDelete = page.locator(`.nav-doc-row[data-doc-id="${initialDocId}"]`).first();
  await rowToDelete.click({ button: 'right' });
  await page.waitForSelector('.at-context-menu', { state: 'visible' });
  await page.click('.at-context-menu-item:has-text("Excluir")');
  await page.waitForTimeout(400);

  // Switch to "Lixeira" chip
  await page.click('.nav-chip[data-filter="lixeira"]');
  await page.waitForTimeout(300);
  const trashRow = page.locator(`.nav-trash-row[data-trash-id="${initialDocId}"]`);
  await trashRow.waitFor({ state: 'visible' });

  // Restore document
  await trashRow.locator('.trash-restore-btn').click();
  await page.waitForTimeout(400);

  // Back to "Todos" chip
  await page.click('.nav-chip[data-filter="todos"]');
  await page.waitForTimeout(300);
  assert.ok(await page.locator(`.nav-doc-row[data-doc-id="${initialDocId}"]`).first().isVisible(), 'Document restored from trash');

  // Close drawer
  await page.click('.drawer-close-btn');
  await page.waitForTimeout(300);

  // 10. Draft recovery on reload
  // Ensure editor has the latest server document
  await page.evaluate(async (id) => {
    const doc = await window.__atelie.api.handouts.read(id);
    await window.__atelie.editor.loadHandout(doc, { skipDraftCheck: true });
  }, initialDocId);
  await page.waitForTimeout(300);

  // Make an unarchived edit:
  const docNameInput = page.locator('.at-doc-name-input');
  await docNameInput.fill('Relatório Modificado sem Arquivar');
  await docNameInput.dispatchEvent('input');
  // Wait for IndexedDB draft auto-save debounce (800ms)
  await page.waitForTimeout(1100);

  // Reload page
  await page.reload();
  await page.waitForSelector('.draft-recovery-modal', { state: 'visible' });
  await page.click('.draft-recover-btn');
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);
  await page.waitForTimeout(400);

  // Verify the edited name was recovered and draft bar is visible
  const recoveredName = await page.locator('.at-doc-name-input').inputValue();
  assert.equal(recoveredName, 'Relatório Modificado sem Arquivar', 'Draft edit was successfully recovered');
  assert.ok(await page.locator('.desk-draft-bar').isVisible(), 'Draft bar is visible');

  // Archive to create Rev 2
  await page.click('[data-action="archive"]');
  await page.waitForTimeout(600);

  // Make another edit and archive to create Rev 3
  await docNameInput.fill('Relatório Rev Três');
  await docNameInput.dispatchEvent('input');
  await page.click('[data-action="archive"]');
  await page.waitForTimeout(600);

  // 11. Archived Versions UI in Inspector
  await page.click('.inspector-tab[data-tab="history"]');
  await page.waitForSelector('.history-panel', { state: 'visible' });

  // Click "Versões arquivadas" tab
  await page.click('.history-tab-btn[data-tab="versions"]');
  await page.waitForSelector('.versions-panel', { state: 'visible' });

  // Select Rev 1
  const rev1Row = page.locator('.version-row[data-rev="1"]');
  await rev1Row.waitFor({ state: 'visible' });
  await rev1Row.click();
  await page.waitForSelector('.version-restore-btn', { state: 'visible' });

  // Click "Restaurar esta versão"
  await page.click('.version-restore-btn');
  await page.waitForTimeout(400);

  const afterRestoreName = await page.locator('.at-doc-name-input').inputValue();
  assert.equal(afterRestoreName, 'Relatório de Missão', 'Rev 1 name and content was restored');

  // 12. Ctrl+K Palette with document and folder search
  await page.keyboard.press('Control+k');
  await page.waitForSelector('#at-palette-modal', { state: 'visible' });

  const paletteInput = page.locator('#at-palette-input');
  await paletteInput.fill('Campanha');
  await page.waitForTimeout(200);

  const paletteResults = page.locator('#at-palette-results .at-palette-item');
  const count = await paletteResults.count();
  assert.ok(count > 0, 'Ctrl+K found results matching Campanha');

  await page.keyboard.press('Escape');
  await page.waitForSelector('#at-palette-modal', { state: 'detached' });

  assert.equal(errors.length, 0, `Page errors: ${errors.join('; ')}`);
});
