import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('help drawer, keyboard shortcut ?, search filtering, and reopen welcome notes', { timeout: 90_000 }, async (t) => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-help-e2e-'));
  const dataDir = path.join(tmpDir, 'data');
  const collectionDir = path.join(projectDir, 'public/colecao');
  const expansionsDir = path.join(tmpDir, 'expansoes');
  const distDir = path.join(projectDir, 'dist');

  await mkdir(dataDir, { recursive: true });
  await mkdir(expansionsDir, { recursive: true });

  const app = await createApp({
    dataDir,
    collection: collectionDir,
    expansionsDir,
    distDir,
  });

  const server = app.listen(0);
  await once(server, 'listening');
  const port = server.address().port;

  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox'],
  });

  t.after(async () => {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
    await rm(tmpDir, { recursive: true, force: true });
  });

  const context = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => !!window.__atelie);

  // 1. Fechar o overlay de boas-vindas inicial se estiver visível
  const initialOverlay = page.locator('.welcome-overlay');
  if (await initialOverlay.count() > 0 && await initialOverlay.isVisible()) {
    await page.locator('[data-action="welcome-skip"]').click();
    await page.waitForSelector('.welcome-overlay', { state: 'detached' });
  }

  // 2. Tecla "?" abre a gaveta de ajuda
  const drawer = page.locator('#app-drawer');
  const drawerTitle = page.locator('#drawer-title');

  await page.keyboard.press('?');
  await page.waitForFunction(() => document.querySelector('#app-drawer')?.classList.contains('open'));
  assert.match(await drawerTitle.innerText(), /AJUDA/i);

  // Verifica se as seções obrigatórias existem
  const helpContent = page.locator('.help-drawer-content');
  assert.equal(await helpContent.count(), 1);

  const comecarSec = page.locator('.help-section[data-section="comecar"]');
  const atalhosSec = page.locator('.help-section[data-section="atalhos"]');
  const camadasSec = page.locator('.help-section[data-section="camadas-mesclagem"]');
  const uvSec = page.locator('.help-section[data-section="luz-uv"]');
  const ttSec = page.locator('.help-section[data-section="tabletop"]');
  const colSec = page.locator('.help-section[data-section="colecao-expansoes"]');

  assert.equal(await comecarSec.count(), 1, 'seção Como Começar');
  assert.equal(await atalhosSec.count(), 1, 'seção Atalhos');
  assert.equal(await camadasSec.count(), 1, 'seção Camadas e Mesclagem');
  assert.equal(await uvSec.count(), 1, 'seção Luz UV');
  assert.equal(await ttSec.count(), 1, 'seção Usar no Tabletop');
  assert.equal(await colSec.count(), 1, 'seção Coleção e Expansões');

  // 3. Busca por "uv" filtra as seções e mantém Luz UV visível
  const searchInput = page.locator('#help-search-input');
  await searchInput.fill('uv');

  await page.waitForFunction(() => {
    const uv = document.querySelector('.help-section[data-section="luz-uv"]');
    const comecar = document.querySelector('.help-section[data-section="comecar"]');
    return uv && uv.style.display !== 'none' && comecar && comecar.style.display === 'none';
  });

  assert.equal(await uvSec.isVisible(), true, 'seção Luz UV deve estar visível');
  assert.equal(await comecarSec.isVisible(), false, 'seção Como Começar deve estar oculta');

  // Limpar busca restaura todas as seções
  await searchInput.fill('');
  await page.waitForFunction(() => {
    const comecar = document.querySelector('.help-section[data-section="comecar"]');
    return comecar && comecar.style.display !== 'none';
  });
  assert.equal(await comecarSec.isVisible(), true, 'todas as seções devem reaparecer');

  // 4. "Mostrar de novo" reabre os bilhetes da primeira visita
  const reopenBtn = page.locator('.help-reopen-welcome');
  assert.equal(await reopenBtn.count(), 1);
  await reopenBtn.click();

  await page.waitForSelector('.welcome-overlay', { state: 'visible' });
  const badge = page.locator('.welcome-note .welcome-step-badge');
  assert.match(await badge.innerText(), /1\s*\/\s*3/);
  assert.match(
    await page.locator('.welcome-note .welcome-desc').innerText(),
    /Um modelo pronto ou uma folha em branco/i
  );

  // Fechar o bilhete com Pular
  await page.locator('.welcome-note [data-action="welcome-skip"]').click();
  await page.waitForSelector('.welcome-overlay', { state: 'detached' });

  // 5. Fechar gaveta com Escape
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#app-drawer')?.classList.contains('open'));

  // 6. Clicar no botão Ajuda do trilho reabre a gaveta
  await page.locator('.app-rail [data-action="help"]').click();
  await page.waitForFunction(() => document.querySelector('#app-drawer')?.classList.contains('open'));
  assert.match(await drawerTitle.innerText(), /AJUDA/i);

  assert.equal(errors.length, 0, `erros de página detectados: ${errors.join(', ')}`);
});

