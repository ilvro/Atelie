import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('colecao e2e: filtros de época e tom, busca por texto, família de variações, conjunto em abas e novidades', { timeout: 240_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-colecao-e2e-'));
  const app = await createApp({ dataDir, distDir: path.join(projectDir, 'dist') });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  t.after(async () => { await browser.close(); await new Promise(r => server.close(r)); await rm(dataDir, { recursive: true, force: true }); });

  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);
  const items = await page.evaluate(async () => (await window.__atelie.api.library.list()).items);
  const byId = new Map(items.map(i => [i.id, i]));
  const gridIds = () => page.$$eval('.templates-grid .template-card', cards => cards.map(c => c.dataset.id));

  // 1. Época 1920 + Tom horror: só modelos coerentes
  await page.click('.rail-btn[data-action="templates"]');
  await page.waitForSelector('.templates-filter-slot .filter-chip');
  for (const g of ['era', 'tom', 'org']) assert.ok(await page.locator(`.filter-chip[data-filter-group="${g}"]`).count() > 1, `grupo ${g}`);
  await page.click('.filter-chip[data-filter-group="era"][data-filter-value="1920"]');
  await page.click('.filter-chip[data-filter-group="tom"][data-filter-value="horror"]');
  const filtrados = await gridIds();
  assert.ok(filtrados.length >= 2, `${filtrados.length} modelos de horror nos anos 1920`);
  for (const id of filtrados) {
    const i = byId.get(id);
    const alvo = i.family ? byId.get(`casa-tpl-${i.family}`) : i;
    assert.equal(alvo.era, '1920', `${id}: época`);
    assert.equal(alvo.tom, 'horror', `${id}: tom`);
  }
  assert.ok(!filtrados.some(id => byId.get(id).family), 'a grade mostra só as bases');
  await page.click('.filter-clear-btn');

  // 2. A busca cobre tags, instituição e o texto de exemplo dos campos
  const buscar = async q => { await page.fill('.templates-search-input', q); await page.waitForTimeout(150); return gridIds(); };
  assert.ok((await buscar('halden')).length >= 3, 'busca pela instituição');
  assert.ok((await buscar('luz negra')).length >= 1, 'busca por etiqueta');
  assert.ok((await buscar('vigia noturno')).length >= 1, 'busca pelo texto de exemplo');
  await buscar('');

  // 3. A família mostra as variações no detalhe
  await page.click('.template-card[data-id="casa-tpl-carta-envelhecida"]');
  await page.waitForSelector('.template-family-thumb');
  assert.ok(await page.locator('.template-family-thumb').count() >= 3, 'base + variações');
  await page.click('.template-family-thumb:not(.is-active)');
  await page.waitForFunction(() => /ensanguentad|queimad/i.test(document.querySelector('.template-detail-title')?.textContent || ''));
  await page.click('[data-action="back-to-grid"]');

  // 3b. "Um documento policial dos anos 50 manchado de sangue" em até três cliques de filtro
  await page.click('.filter-chip[data-filter-group="era"][data-filter-value="1950"]');
  await page.click('.filter-chip[data-filter-group="category"][data-filter-value="Polícia e investigação"]');
  assert.ok(await page.locator('.template-card[data-id="casa-tpl-relatorio-policial"] .is-family').count() === 1, 'o relatório policial mostra que tem variações');
  await page.click('.template-card[data-id="casa-tpl-relatorio-policial"]');
  await page.click('.template-family-thumb[data-family-id="casa-tpl-relatorio-policial-ensanguentado"]');
  await page.waitForFunction(() => /ensanguentad/i.test(document.querySelector('.template-detail-title')?.textContent || ''));
  await page.click('[data-action="back-to-grid"]');
  await page.click('.filter-clear-btn');

  // 4. Conjunto: "Usar conjunto" abre N abas
  await page.click('.filter-chip[data-filter-group="category"][data-filter-value="Conjuntos"]');
  const conjuntos = await gridIds();
  assert.ok(conjuntos.length >= 3, `${conjuntos.length} conjuntos`);
  const setId = 'casa-set-arquivos-instituto-halden';
  const n = byId.get(setId).templates.length;
  await page.click(`.template-card[data-id="${setId}"]`);
  assert.ok(await page.locator('.template-family-thumb').count() === n, 'o detalhe lista os modelos do conjunto');
  const antes = await page.locator('.desk-tab-list .desk-tab').count();
  await page.click('[data-action="use-set"]');
  await page.waitForFunction(({ antes, n }) => document.querySelectorAll('.desk-tab-list .desk-tab').length >= antes + n, { antes, n }, { timeout: 60_000 });
  const ativa = await page.textContent('.desk-tab-list .desk-tab.is-active .desk-tab-title').catch(() => '');
  assert.match(ativa, /Relatório de experimento/i, 'a aba ativa é a do primeiro modelo');

  // 5. Tela inicial: Novidades
  await page.click('.desk-tab.is-mesa');
  await page.waitForSelector('.start-news-row .start-featured-card');
  assert.ok(await page.locator('.start-news-row .start-featured-card').count() >= 4, 'fileira Novidades');
  assert.ok(await page.locator('.start-featured-row .start-featured-card').count() === 8, 'oito modelos em destaque');

  // 6. A biblioteca de elementos não mostra os conjuntos
  await page.click('.rail-btn[data-action="library"]');
  await page.waitForSelector('.library-item-card');
  assert.equal(await page.locator('.library-item-card', { hasText: 'Conjunto' }).count(), 0);
  assert.deepEqual(errors, []);
});
