import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('perf e2e: 15-layer A4 open < 400ms, drag at 60fps (< 16.7ms/frame), and identical pixel release', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-perf-e2e-'));
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
  page.on('console', msg => console.log('[BROWSER]', msg.text()));
  page.on('response', res => {
    if (res.status() >= 400) console.log('[HTTP ERROR]', res.status(), res.url());
  });
  page.on('requestfailed', req => {
    console.log('[FAILED REQ]', req.url(), req.failure()?.errorText);
  });

  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);

  // 1. Construct an A4 document with 15 diverse layers
  const perfResults = await page.evaluate(async () => {
    const editor = window.__atelie.editor;
    const a4 = {
      id: 'doc-perf-15-layers',
      name: 'Documento Teste 15 Camadas',
      schemaVersion: 1,
      revision: 1,
      page: {
        width: 1240,
        height: 1754,
        background: '#f2ecd9',
      },
      layers: [
        // 1. Paper texture layer
        {
          id: 'l-paper-base',
          name: 'Papel Base',
          kind: 'shape',
          visible: true,
          locked: false,
          x: 0,
          y: 0,
          width: 1240,
          height: 1754,
          rotation: 0,
          opacity: 1,
          blend: 'normal',
          light: 'both',
          shape: { type: 'rect', fill: '#ede3cd', stroke: null, strokeWidth: 0 },
        },
        // 2. Procedural stain
        {
          id: 'l-effect-stain',
          name: 'Manchas Café',
          kind: 'effect',
          visible: true,
          locked: false,
          x: 200,
          y: 150,
          width: 600,
          height: 500,
          rotation: 12,
          opacity: 0.6,
          blend: 'multiply',
          light: 'both',
          effect: { type: 'stain', amount: 0.5, seed: 42, params: { count: 4, color: '#7a4a1e' } },
        },
        // 3. Header text
        {
          id: 'l-text-title',
          name: 'Título',
          kind: 'text',
          visible: true,
          locked: false,
          x: 120,
          y: 80,
          width: 1000,
          height: 100,
          rotation: 0,
          opacity: 1,
          blend: 'normal',
          light: 'both',
          text: { content: 'RELATÓRIO CONFIDENCIAL DE INVESTIGAÇÃO', size: 36, font: { family: 'IM Fell English', weight: 400 } },
        },
        // 4. Subtitle text
        {
          id: 'l-text-subtitle',
          name: 'Subtítulo',
          kind: 'text',
          visible: true,
          locked: false,
          x: 120,
          y: 190,
          width: 800,
          height: 60,
          rotation: 0,
          opacity: 0.85,
          blend: 'normal',
          light: 'both',
          text: { content: 'Caso 042 — Arquivo Geral da Polícia Técnica', size: 20, font: { family: 'Courier Prime', weight: 400 } },
        },
        // 5. Divider shape
        {
          id: 'l-shape-divider',
          name: 'Separador',
          kind: 'shape',
          visible: true,
          locked: false,
          x: 120,
          y: 260,
          width: 1000,
          height: 6,
          rotation: 0,
          opacity: 0.9,
          blend: 'multiply',
          light: 'both',
          shape: { type: 'line', stroke: '#2e2518', strokeWidth: 2 },
        },
        // 6. Main body paragraph text
        {
          id: 'l-text-body-1',
          name: 'Corpo do Texto 1',
          kind: 'text',
          visible: true,
          locked: false,
          x: 120,
          y: 290,
          width: 480,
          height: 400,
          rotation: 0,
          opacity: 1,
          blend: 'normal',
          light: 'both',
          text: {
            content: 'Os registros encontrados no local indicam movimentação anômala na madrugada de 14 de outubro. Foram colhidas amostras de grafite e fibras de papel pergaminho com traços de calcário.',
            size: 18,
            font: { family: 'IM Fell English', weight: 400 },
          },
        },
        // 7. Second column text
        {
          id: 'l-text-body-2',
          name: 'Corpo do Texto 2',
          kind: 'text',
          visible: true,
          locked: false,
          x: 640,
          y: 290,
          width: 480,
          height: 400,
          rotation: 0,
          opacity: 1,
          blend: 'normal',
          light: 'both',
          text: {
            content: 'Testemunhas relatam que as luzes do terceiro pavimento permaneceram acesas até as quatro horas. Não foram encontradas violações nas fechaduras nem nos selos de cera aplicados.',
            size: 18,
            font: { family: 'IM Fell English', weight: 400 },
          },
        },
        // 8. Box frame shape
        {
          id: 'l-shape-box',
          name: 'Caixa de Destaque',
          kind: 'shape',
          visible: true,
          locked: false,
          x: 120,
          y: 730,
          width: 1000,
          height: 250,
          rotation: 0,
          opacity: 0.9,
          blend: 'multiply',
          light: 'both',
          shape: { type: 'rect', fill: 'rgba(0,0,0,0.03)', stroke: '#3d3020', strokeWidth: 2, radius: 4 },
        },
        // 9. Text inside box
        {
          id: 'l-text-box',
          name: 'Anotação Importante',
          kind: 'text',
          visible: true,
          locked: false,
          x: 150,
          y: 760,
          width: 940,
          height: 190,
          rotation: 0,
          opacity: 1,
          blend: 'normal',
          light: 'both',
          text: {
            content: 'AVISO: Documento reservado sob custódia do Departamento Central. Qualquer reprodução mecânica sem autorização expressa ensejará abertura de processo disciplinar sumário.',
            size: 17,
            font: { family: 'Courier Prime', weight: 700 },
          },
        },
        // 10. Procedural crumple
        {
          id: 'l-effect-crumple',
          name: 'Efeito Amassado',
          kind: 'effect',
          visible: true,
          locked: false,
          x: 0,
          y: 0,
          width: 1240,
          height: 1754,
          rotation: 0,
          opacity: 0.45,
          blend: 'soft-light',
          light: 'both',
          effect: { type: 'crumple', amount: 0.4, seed: 10, params: { creases: 12 } },
        },
        // 11. Circular Stamp
        {
          id: 'l-stamp-circle',
          name: 'Selo Oficial',
          kind: 'shape',
          visible: true,
          locked: false,
          x: 750,
          y: 1100,
          width: 280,
          height: 280,
          rotation: -6,
          opacity: 0.8,
          blend: 'multiply',
          light: 'both',
          shape: { type: 'ellipse', fill: null, stroke: '#8c1d1d', strokeWidth: 4 },
        },
        // 12. Text inside stamp
        {
          id: 'l-stamp-text',
          name: 'Texto do Selo',
          kind: 'text',
          visible: true,
          locked: false,
          x: 770,
          y: 1210,
          width: 240,
          height: 80,
          rotation: -6,
          opacity: 0.85,
          blend: 'multiply',
          light: 'both',
          text: { content: 'ARQUIVADO\n1924', align: 'center', size: 22, font: { family: 'IM Fell English', weight: 700 } },
        },
        // 13. Moving target layer (text)
        {
          id: 'l-target-moving',
          name: 'Camada de Movimento',
          kind: 'text',
          visible: true,
          locked: false,
          x: 200,
          y: 1150,
          width: 450,
          height: 120,
          rotation: 0,
          opacity: 0.95,
          blend: 'normal',
          light: 'both',
          text: { content: 'Observação móvel do perito encarregado.', size: 20, font: { family: 'Courier Prime', weight: 400 } },
        },
        // 14. Bottom signature text
        {
          id: 'l-signature-text',
          name: 'Assinatura',
          kind: 'text',
          visible: true,
          locked: false,
          x: 200,
          y: 1550,
          width: 500,
          height: 80,
          rotation: 0,
          opacity: 1,
          blend: 'normal',
          light: 'both',
          text: { content: 'Delegado Chefe Titular — Comarca Central', size: 16, font: { family: 'IM Fell English', italic: true } },
        },
        // Free cuts (phase C1): a torn top, a scissors corner and a burn trail must not slow opening down
        { id: 'l-cut-1', name: 'Rasgo', kind: 'effect', visible: true, locked: false, x: 0, y: 0, width: 1240, height: 1754, rotation: 0, opacity: 1, blend: 'normal', light: 'both',
          effect: { type: 'cut', amount: 1, seed: 4, params: { rough: 0.7 }, edge: 'rasgado', remove: [[[0, 0], [1, 0], [1, 0.05], [0, 0.07]]], holes: [], char: 0.5, fiber: 0.6 } },
        { id: 'l-cut-2', name: 'Corte · tesoura', kind: 'effect', visible: true, locked: false, x: 0, y: 0, width: 1240, height: 1754, rotation: 0, opacity: 1, blend: 'normal', light: 'both',
          effect: { type: 'cut', amount: 1, seed: 5, params: { rough: 0.5 }, edge: 'tesoura', remove: [[[1, 1], [0.9, 1], [1, 0.93]]], holes: [], char: 0.5, fiber: 0.5 } },
        { id: 'l-cut-3', name: 'Queimado', kind: 'effect', visible: true, locked: false, x: 0, y: 0, width: 1240, height: 1754, rotation: 0, opacity: 1, blend: 'multiply', light: 'both',
          effect: { type: 'cut', amount: 1, seed: 6, params: { rough: 0.5 }, edge: 'queimado', remove: [], holes: [[[0.1, 0.9, 20], [0.14, 0.92, 30], [0.2, 0.93, 40]]], char: 0.5, fiber: 0.5 } },
        // 15. Procedural grain layer
        {
          id: 'l-effect-grain',
          name: 'Grão Fino',
          kind: 'effect',
          visible: true,
          locked: false,
          x: 0,
          y: 0,
          width: 1240,
          height: 1754,
          rotation: 0,
          opacity: 0.25,
          blend: 'overlay',
          light: 'both',
          effect: { type: 'grain', amount: 0.3, seed: 99, params: { size: 1.5 } },
        },
      ],
    };

    // Measure time to open 15-layer A4
    const t0 = performance.now();
    await editor.loadHandout(a4);
    if (document.fonts?.ready) await document.fonts.ready;
    const openTimeMs = performance.now() - t0;

    const initialCanvas = document.querySelector('.stage-canvas');
    const initialStagePixels = initialCanvas.getContext('2d').getImageData(0, 0, initialCanvas.width, initialCanvas.height).data;
    const initialRef = await window.__atelie.renderHandout(a4, { scale: editor.stage.getZoom() * (window.devicePixelRatio || 1) });
    const initialRefPixels = initialRef.canvas.getContext('2d').getImageData(0, 0, initialCanvas.width, initialCanvas.height).data;
    let initialDiff = 0;
    for (let p = 0; p < initialStagePixels.length; p += 4) {
      if (Math.abs(initialStagePixels[p] - initialRefPixels[p]) > 2 || Math.abs(initialStagePixels[p+1] - initialRefPixels[p+1]) > 2 || Math.abs(initialStagePixels[p+2] - initialRefPixels[p+2]) > 2) {
        initialDiff++;
      }
    }

    // Measure 60 drag events
    const movingLayer = a4.layers.find(l => l.id === 'l-target-moving');
    editor.state.select(movingLayer.id);

    const desk = document.getElementById('desk-stage');
    const outline = document.querySelector('.stage-selection-outline');
    const canvas = document.querySelector('.stage-canvas');

    // Begin move gesture on outline
    const outlineRect = outline.getBoundingClientRect();
    const startX = outlineRect.left + outlineRect.width / 2;
    const startY = outlineRect.top + outlineRect.height / 2;

    outline.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: startX,
      clientY: startY,
      pointerId: 1,
    }));

    // Perform 60 drag move events
    const frameTimes = [];
    for (let i = 1; i <= 60; i++) {
      const curX = startX + (i % 20) * 3;
      const curY = startY + Math.floor(i / 2) * 2;
      const f0 = performance.now();
      window.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: curX,
        clientY: curY,
        pointerId: 1,
      }));
      const fTime = performance.now() - f0;
      frameTimes.push(fTime);
    }

    // End gesture (mouse release)
    window.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      clientX: startX + 40,
      clientY: startY + 60,
      pointerId: 1,
    }));

    // Wait for the full render after gesture end
    await new Promise(r => setTimeout(r, 600));

    // Calculate metrics
    const avgFrameTimeMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const maxFrameTimeMs = Math.max(...frameTimes);

    // Pixel check: compare released canvas pixels with a clean fresh render
    const currentDoc = editor.state.handout;
    const dpr = window.devicePixelRatio || 1;
    const scale = editor.stage.getZoom() * dpr;

    const currentCanvas = document.querySelector('.stage-canvas');
    const ctx = currentCanvas.getContext('2d');
    const stagePixels = ctx.getImageData(0, 0, currentCanvas.width, currentCanvas.height).data;

    // Fresh reference render 1
    const res = await window.__atelie.renderHandout(currentDoc, { scale });
    const refCanvas = res.canvas;
    const refCtx = refCanvas.getContext('2d');
    const refPixels = refCtx.getImageData(0, 0, currentCanvas.width, currentCanvas.height).data;

    // Compare pixels
    let pixelDiffCount = 0;
    for (let p = 0; p < stagePixels.length; p += 4) {
      const dr = Math.abs(stagePixels[p] - refPixels[p]);
      const dg = Math.abs(stagePixels[p + 1] - refPixels[p + 1]);
      const db = Math.abs(stagePixels[p + 2] - refPixels[p + 2]);
      const da = Math.abs(stagePixels[p + 3] - refPixels[p + 3]);
      const maxD = Math.max(dr, dg, db, da);
      if (maxD > 2) {
        pixelDiffCount++;
      }
    }

    return {
      openTimeMs,
      initialDiff,
      avgFrameTimeMs,
      maxFrameTimeMs,
      pixelDiffCount,
      totalPixels: stagePixels.length / 4,
    };
  });

  console.log(`[PERF METRICS] 15-layer A4 open: ${perfResults.openTimeMs.toFixed(1)} ms (Target: < 400 ms)`);
  console.log(`[PERF METRICS] Initial diff vs ref: ${perfResults.initialDiff} (Target: 0)`);
  console.log(`[PERF METRICS] Drag 60 frames avg: ${perfResults.avgFrameTimeMs.toFixed(2)} ms/frame (Target: < 16.7 ms for 60fps)`);
  console.log(`[PERF METRICS] Drag 60 frames max: ${perfResults.maxFrameTimeMs.toFixed(2)} ms`);
  console.log(`[PERF METRICS] Pixel difference after drop: ${perfResults.pixelDiffCount} / ${perfResults.totalPixels}`);

  assert.ok(perfResults.openTimeMs < 400, `A4 open time should be < 400 ms (was ${perfResults.openTimeMs.toFixed(1)} ms)`);
  assert.equal(perfResults.initialDiff, 0, 'Initial stage render must be identical to reference render');
  assert.ok(perfResults.avgFrameTimeMs < 16.7, `Average frame time should be < 16.7 ms for 60fps (was ${perfResults.avgFrameTimeMs.toFixed(2)} ms)`);
  assert.equal(perfResults.pixelDiffCount, 0, 'Canvas pixels after releasing drag must be identical to fresh render');

  // The lighter on the busy A4: the work per frame while the flame is held and moved over the paper
  await page.evaluate(() => {
    const ed = window.__atelie.editor;
    ed.state.select(null);
    ed.stage.zoom('fit');
    ed.stage.setTool('lighter');
  });
  await page.waitForTimeout(400);
  const rect = await page.evaluate(() => {
    const r = document.querySelector('.stage-page-wrap').getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  await page.evaluate(() => window.__atelie.editor.stage.clearCutFrameStats());
  const x0 = rect.x + rect.w * 0.3;
  const y0 = rect.y + rect.h * 0.5;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 0; i < 60; i++) {
    await page.mouse.move(x0 + i * 5, y0 + Math.sin(i / 5) * 40);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(500);
  const flame = await page.evaluate(() => window.__atelie.editor.stage.cutFrameStats());
  await page.mouse.up();
  console.log(`[PERF METRICS] Lighter frame work: median ${flame.median.toFixed(2)} ms, p95 ${flame.p95.toFixed(2)} ms, max ${flame.max.toFixed(2)} ms over ${flame.count} frames`);
  assert.ok(flame.count > 30, 'the lighter drew frames');
  assert.ok(flame.median < 8, `lighter median frame work should be < 8 ms (was ${flame.median.toFixed(2)})`);
  assert.ok(flame.p95 < 20, `lighter p95 frame work should be < 20 ms (was ${flame.p95.toFixed(2)})`);

  await page.close();
  assert.deepEqual(errors, []);
});
