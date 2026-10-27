import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('start screen, welcome notes, presets, featured templates, templates drawer, and expansions e2e', { timeout: 90_000 }, async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-start-e2e-'));
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

  const context = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  try {
    // -------------------------------------------------------------------------
    // 1. Primeira Visita: os 3 bilhetes sequenciais de boas-vindas
    // -------------------------------------------------------------------------
    await page.goto(`http://127.0.0.1:${port}/?diagnostics&start`);
    await page.waitForFunction(() => !!window.__atelie && !!window.__atelie.editor);
    await page.waitForSelector('.welcome-overlay', { state: 'visible' });

    // Bilhete 1
    const noteTitle = page.locator('.welcome-note .welcome-title');
    assert.match(await noteTitle.innerText(), /Escolha um ponto de partida/i);
    assert.match(await page.locator('.welcome-note .welcome-desc').innerText(), /Um modelo pronto ou uma folha em branco/i);

    // Avançar para Bilhete 2
    await page.locator('.welcome-note [data-action="welcome-next"]').click();
    await page.waitForTimeout(200);
    assert.match(await noteTitle.innerText(), /Preencha/i);
    assert.match(await page.locator('.welcome-note .welcome-desc').innerText(), /Os campos do modelo ficam na aba Preencher/i);

    // Avançar para Bilhete 3
    await page.locator('.welcome-note [data-action="welcome-next"]').click();
    await page.waitForTimeout(200);
    assert.match(await noteTitle.innerText(), /Leve para a mesa/i);
    assert.match(await page.locator('.welcome-note .welcome-desc').innerText(), /Exporte em PNG, imprima, ou use no Tabletop/i);

    // Concluir / Começar fecha o diálogo e grava atelie-welcome = 'done'
    await page.locator('.welcome-note [data-action="welcome-next"]').click();
    await page.waitForSelector('.welcome-overlay', { state: 'detached' });

    const welcomeStatus = await page.evaluate(() => localStorage.getItem('atelie-welcome'));
    assert.equal(welcomeStatus, 'done');

    // Recarregar e conferir que NÃO aparece novamente
    await page.reload();
    await page.waitForFunction(() => !!window.__atelie && !!window.__atelie.editor);
    await page.waitForTimeout(300);
    const overlayCount = await page.locator('.welcome-overlay').count();
    assert.equal(overlayCount, 0, 'welcome overlay não deve reaparecer após concluído');

    // -------------------------------------------------------------------------
    // 2. Tela de Início: Folhas em branco (COMEÇAR) e Modelos em Destaque (MODELOS)
    // -------------------------------------------------------------------------
    const startScreen = page.locator('.at-start-screen');
    await startScreen.waitFor({ state: 'visible' });

    // 9 presets de página
    const presetCards = page.locator('.start-presets-row .start-preset-card');
    assert.equal(await presetCards.count(), 9, 'deve ter 9 cartões de presets em branco');

    // 8 modelos em destaque (um por categoria)
    const featuredCards = page.locator('.start-featured-row .start-featured-card');
    await page.waitForFunction(() => document.querySelectorAll('.start-featured-row .start-featured-card').length === 8);
    assert.equal(await featuredCards.count(), 8, 'deve ter 8 modelos em destaque');

    // Sem recentes no início
    const recentsCount = await page.locator('.start-recents-row .start-recent-card').count();
    assert.equal(recentsCount, 0, 'não deve haver recentes antes de criar/abrir documentos');

    // -------------------------------------------------------------------------
    // 3. Clicar na folha "Polaroide" cria documento 880 × 1070
    // -------------------------------------------------------------------------
    const polaroidCard = page.locator('.start-presets-row [data-preset="polaroid"]');
    await polaroidCard.click();
    await page.waitForFunction(() => !!window.__atelie.editor.state);

    const docDimensions = await page.evaluate(() => {
      const doc = window.__atelie.editor.state.handout;
      return { width: doc.page.width, height: doc.page.height, name: doc.name };
    });
    assert.equal(docDimensions.width, 880);
    assert.equal(docDimensions.height, 1070);

    // Arquivar o documento com nome customizado para virar recente
    await page.locator('.at-doc-name-input').fill('Foto do Armazém');
    await page.locator('[data-action="archive"]').click();
    await page.waitForTimeout(600);

    // -------------------------------------------------------------------------
    // 4. Retornar ao início e verificar fileira CONTINUAR
    // -------------------------------------------------------------------------
    // Retornar ao início via método do editor ou Ctrl+K
    await page.evaluate(() => {
      window.__atelie.editor.showStartScreen();
    });
    await startScreen.waitFor({ state: 'visible' });

    // Agora a fileira CONTINUAR deve existir e mostrar "Foto do Armazém"
    await page.waitForSelector('.start-recents-row .start-recent-card', { state: 'visible' });
    const recentCardTitle = page.locator('.start-recents-row .start-recent-card .start-recent-title');
    assert.match(await recentCardTitle.first().innerText(), /Foto do Armazém/);

    // -------------------------------------------------------------------------
    // 5. Clicar num modelo em destaque abre cópia na aba Preencher
    // -------------------------------------------------------------------------
    const firstFeaturedCard = page.locator('.start-featured-row .start-featured-card').first();
    const featuredName = await firstFeaturedCard.locator('.start-featured-title').innerText();
    await firstFeaturedCard.click();

    // Espera abrir no editor
    await page.waitForFunction(() => !!window.__atelie.editor.state);
    const openedDocName = await page.evaluate(() => window.__atelie.editor.state.handout.name);
    assert.equal(openedDocName, featuredName);

    // Aba Preencher ativada
    const fillTabActive = await page.evaluate(() => {
      return document.querySelector('.inspector-tab[data-tab="fill"]')?.classList.contains('active');
    });
    assert.equal(fillTabActive, true, 'a aba Preencher deve estar ativa ao instanciar modelo');

    // -------------------------------------------------------------------------
    // 6. Gaveta Modelos: busca, filtro por categoria e prévia com campos
    // -------------------------------------------------------------------------
    // Abrir gaveta Modelos pelo trilho lateral
    await page.locator('.app-rail [data-action="templates"]').click();
    await page.waitForFunction(() => document.querySelector('#app-drawer')?.classList.contains('open'));

    // Filtrar por categoria 'Médico'
    const medicoChip = page.locator('.templates-drawer-view .filter-chip[data-filter-group="category"][data-filter-value="Médico"]');
    await medicoChip.click();
    await page.waitForTimeout(200);

    // Verificar que os modelos exibidos na grade são da categoria Médico
    const medicoCards = page.locator('.templates-grid .template-card');
    const medicoCount = await medicoCards.count();
    assert.ok(medicoCount >= 1, 'deve listar modelos médicos');
    for (let i = 0; i < medicoCount; i++) {
      assert.match(await medicoCards.nth(i).locator('.template-card-cat').innerText(), /Médico/i);
    }

    // Clicar no primeiro modelo médico para abrir a prévia interna (Detail View)
    await medicoCards.first().click();
    await page.waitForSelector('.template-detail-view', { state: 'visible' });

    // Conferir botões e lista de campos na prévia
    const useBtn = page.locator('.template-detail-view [data-action="use-template"]');
    assert.equal(await useBtn.count(), 1, 'deve ter botão Usar este modelo');
    assert.match(await useBtn.innerText(), /Usar este modelo/i);

    const fieldsList = page.locator('.template-detail-view .template-fields-list li');
    assert.ok((await fieldsList.count()) >= 1, 'deve listar os campos editáveis do modelo');

    // Voltar para a grade
    await page.locator('.template-detail-back-btn').click();
    await page.waitForSelector('.templates-grid', { state: 'visible' });

    // Fechar gaveta (Esc tira primeiro a seleção; o segundo fecha a gaveta)
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#app-drawer')?.classList.contains('open'));

    // -------------------------------------------------------------------------
    // 7. Expansão de teste: fileira EXPANSÕES aparece na tela de início
    // -------------------------------------------------------------------------
    // Mockar retorno da biblioteca com uma expansão
    await page.route('**/api/atelie/library', async (route) => {
      const res = await route.fetch();
      const json = await res.json();
      json.sources.push({
        id: 'exp-confidencial',
        name: 'Arquivos Confidenciais (Expansão)',
        description: 'Dossiês secretos e registros censurados',
      });
      json.items.push(
        {
          id: 'exp-tpl-dossie',
          name: 'Dossiê Interrogatório',
          category: 'Polícia e investigação',
          kind: 'template',
          source: 'exp-confidencial',
          preview: 'previews/casa-tpl-boletim-ocorrencia.webp',
          fields: ['Suspeito', 'Agente', 'Depoimento'],
        },
        {
          id: 'exp-elem-carimbo',
          name: 'Carimbo Top Secret',
          category: 'Carimbos',
          kind: 'image',
          source: 'exp-confidencial',
        }
      );
      await route.fulfill({ json });
    });

    // Voltar para a tela de início e recarregar dados
    await page.evaluate(() => {
      window.__atelie.editor.showStartScreen();
    });
    await page.waitForSelector('.start-expansions-row .start-expansion-card', { state: 'visible' });

    const expCard = page.locator('.start-expansions-row .start-expansion-card');
    assert.match(await expCard.locator('.expansion-name').innerText(), /Arquivos Confidenciais/i);
    assert.match(await expCard.locator('.expansion-meta').innerText(), /1 modelo/i);
    assert.match(await expCard.locator('.expansion-meta').innerText(), /1 elemento/i);

    const exploreBtn = expCard.locator('[data-action="explore-expansion"]');
    assert.equal(await exploreBtn.count(), 1, 'deve ter botão Explorar');

    // Clicar em Explorar abre a gaveta filtrada pela origem
    await exploreBtn.click();
    await page.waitForFunction(() => document.querySelector('#app-drawer')?.classList.contains('open'));

    assert.equal(errors.length, 0, `Nenhum erro de página esperado: ${errors.join('; ')}`);
  } finally {
    await browser.close();
    server.close();
    await rm(tmpDir, { recursive: true, force: true });
  }
});

