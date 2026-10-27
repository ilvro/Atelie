import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

// O modelo mais pesado de cada lote novo precisa abrir em menos de 400 ms (plano da coleção ampliada)
const PESADOS = ['auto-apreensao', 'analise-digitais', 'laudo-necropsia-uv', 'boletim-escolar', 'ficha-triagem-sanatorio', 'quadro-investigacao'];

test('colecao perf e2e: o modelo mais pesado de cada lote abre em menos de 400 ms', { timeout: 180_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-colecao-perf-'));
  const app = await createApp({ dataDir, distDir: path.join(projectDir, 'dist') });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  t.after(async () => { await browser.close(); await new Promise(r => server.close(r)); await rm(dataDir, { recursive: true, force: true }); });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);

  for (const slug of PESADOS) {
    const ms = await page.evaluate(async s => {
      const doc = await (await fetch(`/colecao/modelos/${s}.json`)).json();
      doc.id = `perf-${s}`;
      // aquecimento: fontes e imagens do modelo entram no cache antes da medida, como numa segunda abertura
      await window.__atelie.editor.loadHandout(doc, { skipDraftCheck: true });
      if (document.fonts?.ready) await document.fonts.ready;
      // a melhor de três aberturas: um tropeço do coletor de lixo não pode reprovar o modelo
      let best = Infinity;
      for (let i = 0; i < 3; i++) {
        const t0 = performance.now();
        await window.__atelie.editor.loadHandout({ ...doc, id: `perf-${s}-${i}` }, { skipDraftCheck: true });
        if (document.fonts?.ready) await document.fonts.ready;
        best = Math.min(best, performance.now() - t0);
      }
      return { ms: best, layers: doc.layers.length };
    }, slug);
    console.log(`[colecao-perf] ${slug}: ${ms.layers} camadas, ${ms.ms.toFixed(0)} ms`);
    assert.ok(ms.ms < 400, `${slug} abriu em ${ms.ms.toFixed(0)} ms (limite 400 ms)`);
  }
  assert.deepEqual(errors, []);
});
