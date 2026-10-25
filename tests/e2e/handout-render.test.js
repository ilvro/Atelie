import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('handout rendering: multiply blend, clipping masks, adjustments, UV light, missing images, and text', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-render-e2e-'));
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

  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie && typeof window.__atelie.renderHandout === 'function');

  // 1. Multiply blend mode
  const res1 = await page.evaluate(async () => {
    const doc = {
      schema: 1,
      id: '00000000-0000-0000-0000-000000000001',
      revision: 0,
      name: 'Blend Test',
      category: '',
      tags: [],
      page: { width: 400, height: 400, background: '#ffffff' },
      layers: [
        {
          id: 'red',
          name: 'Red',
          kind: 'shape',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 0,
          y: 0,
          width: 200,
          height: 400,
          rotation: 0,
          clip: false,
          light: 'both',
          shape: { type: 'rect', fill: '#ff0000', stroke: null, strokeWidth: 0, radius: 0, dash: [] },
        },
        {
          id: 'blue',
          name: 'Blue',
          kind: 'shape',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'multiply',
          x: 100,
          y: 0,
          width: 200,
          height: 400,
          rotation: 0,
          clip: false,
          light: 'both',
          shape: { type: 'rect', fill: '#0000ff', stroke: null, strokeWidth: 0, radius: 0, dash: [] },
        },
      ],
      fields: [],
      source: { kind: 'blank' },
      back: null,
    };
    return await window.__atelie.renderHandout(doc, {
      scale: 1,
      at: [
        [150, 200], // overlap: red * blue = black
        [50, 200],  // only red
        [250, 200], // only blue
      ],
    });
  });

  const [blackPixel, redPixel, bluePixel] = res1.pixels;
  assert.ok(blackPixel[0] <= 8 && blackPixel[1] <= 8 && blackPixel[2] <= 8, `pixel (150, 200) should be black: ${blackPixel}`);
  assert.ok(redPixel[0] >= 240 && redPixel[1] <= 15 && redPixel[2] <= 15, `pixel (50, 200) should be red: ${redPixel}`);
  assert.ok(bluePixel[0] <= 15 && bluePixel[1] <= 15 && bluePixel[2] >= 240, `pixel (250, 200) should be blue: ${bluePixel}`);

  // 2. Clipping mask
  const res2 = await page.evaluate(async () => {
    const doc = {
      schema: 1,
      id: '00000000-0000-0000-0000-000000000002',
      revision: 0,
      name: 'Clip Test',
      category: '',
      tags: [],
      page: { width: 400, height: 400, background: '#ffffff' },
      layers: [
        {
          id: 'green-base',
          name: 'Green Base',
          kind: 'shape',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          clip: false,
          light: 'both',
          shape: { type: 'rect', fill: '#00ff00', stroke: null, strokeWidth: 0, radius: 0, dash: [] },
        },
        {
          id: 'black-clip',
          name: 'Black Clipped',
          kind: 'shape',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 0,
          y: 0,
          width: 400,
          height: 400,
          rotation: 0,
          clip: true,
          light: 'both',
          shape: { type: 'rect', fill: '#000000', stroke: null, strokeWidth: 0, radius: 0, dash: [] },
        },
      ],
      fields: [],
      source: { kind: 'blank' },
      back: null,
    };
    return await window.__atelie.renderHandout(doc, {
      scale: 1,
      at: [
        [50, 50],   // inside green base -> black
        [300, 300], // outside green base -> white background
      ],
    });
  });

  const [clippedPixel, outsidePixel] = res2.pixels;
  assert.ok(clippedPixel[0] <= 10 && clippedPixel[1] <= 10 && clippedPixel[2] <= 10, `inside clip must be black: ${clippedPixel}`);
  assert.ok(outsidePixel[0] >= 240 && outsidePixel[1] >= 240 && outsidePixel[2] >= 240, `outside clip must remain white: ${outsidePixel}`);

  // 3. Grayscale adjustment without clip
  const res3 = await page.evaluate(async () => {
    const doc = {
      schema: 1,
      id: '00000000-0000-0000-0000-000000000003',
      revision: 0,
      name: 'Adjust Test',
      category: '',
      tags: [],
      page: { width: 400, height: 400, background: '#ffffff' },
      layers: [
        {
          id: 'red',
          name: 'Red',
          kind: 'shape',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 0,
          y: 0,
          width: 200,
          height: 400,
          rotation: 0,
          clip: false,
          light: 'both',
          shape: { type: 'rect', fill: '#ff0000', stroke: null, strokeWidth: 0, radius: 0, dash: [] },
        },
        {
          id: 'gray-adj',
          name: 'Grayscale Adjustment',
          kind: 'adjust',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 0,
          y: 0,
          width: 400,
          height: 400,
          rotation: 0,
          clip: false,
          light: 'both',
          adjust: {
            grayscale: 1,
            sepia: 0,
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            invert: false,
            curve: null,
          },
        },
      ],
      fields: [],
      source: { kind: 'blank' },
      back: null,
    };
    return await window.__atelie.renderHandout(doc, {
      scale: 1,
      at: [[50, 200]],
    });
  });

  const [grayPixel] = res3.pixels;
  assert.ok(Math.abs(grayPixel[0] - grayPixel[1]) <= 6, `R and G should match in gray: ${grayPixel}`);
  assert.ok(Math.abs(grayPixel[1] - grayPixel[2]) <= 6, `G and B should match in gray: ${grayPixel}`);
  assert.ok(Math.abs(grayPixel[0] - 54) <= 12, `Luminance of red under grayscale should be ~54: ${grayPixel}`);

  // 4. UV Light
  const res4Normal = await page.evaluate(async () => {
    const doc = {
      schema: 1,
      id: '00000000-0000-0000-0000-000000000004',
      revision: 0,
      name: 'UV Test',
      category: '',
      tags: [],
      page: { width: 400, height: 400, background: '#ffffff' },
      layers: [
        {
          id: 'uv-layer',
          name: 'UV Layer',
          kind: 'shape',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 0,
          y: 0,
          width: 400,
          height: 400,
          rotation: 0,
          clip: false,
          light: 'uv',
          shape: { type: 'rect', fill: '#800080', stroke: null, strokeWidth: 0, radius: 0, dash: [] },
        },
      ],
      fields: [],
      source: { kind: 'blank' },
      back: null,
    };
    return await window.__atelie.renderHandout(doc, {
      scale: 1,
      light: 'normal',
      at: [[200, 200]],
    });
  });

  const res4UV = await page.evaluate(async () => {
    const doc = {
      schema: 1,
      id: '00000000-0000-0000-0000-000000000004',
      revision: 0,
      name: 'UV Test',
      category: '',
      tags: [],
      page: { width: 400, height: 400, background: '#ffffff' },
      layers: [
        {
          id: 'uv-layer',
          name: 'UV Layer',
          kind: 'shape',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 0,
          y: 0,
          width: 400,
          height: 400,
          rotation: 0,
          clip: false,
          light: 'uv',
          shape: { type: 'rect', fill: '#800080', stroke: null, strokeWidth: 0, radius: 0, dash: [] },
        },
      ],
      fields: [],
      source: { kind: 'blank' },
      back: null,
    };
    return await window.__atelie.renderHandout(doc, {
      scale: 1,
      light: 'uv',
      at: [[200, 200]],
    });
  });

  const [normalPixel] = res4Normal.pixels;
  const [uvPixel] = res4UV.pixels;
  assert.ok(normalPixel[0] >= 240 && normalPixel[1] >= 240 && normalPixel[2] >= 240, `under normal light UV layer is hidden (white): ${normalPixel}`);
  assert.ok(uvPixel[0] >= 100 && uvPixel[1] <= 30 && uvPixel[2] >= 100, `under UV light layer is visible (purple): ${uvPixel}`);

  // 4b. UV Light darkening & middle UV layer on top of darkening
  const res4b = await page.evaluate(async () => {
    const doc = {
      schema: 1,
      id: '00000000-0000-0000-0000-00000000004b',
      revision: 0,
      name: 'UV Middle Layer & Darkening Test',
      category: '',
      tags: [],
      page: {
        width: 400,
        height: 400,
        background: '#ffffff',
        uv: { tint: '#2b1d52', strength: 0.65 },
      },
      layers: [
        {
          id: 'gray-bg',
          name: 'Fundo Cinza',
          kind: 'shape',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 0,
          y: 0,
          width: 400,
          height: 400,
          rotation: 0,
          clip: false,
          light: 'both',
          shape: { type: 'rect', fill: '#808080', stroke: null, strokeWidth: 0, radius: 0, dash: [] },
        },
        {
          id: 'uv-white-text',
          name: 'Texto UV no Meio',
          kind: 'text',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 40,
          y: 140,
          width: 320,
          height: 120,
          rotation: 0,
          clip: false,
          light: 'uv',
          text: {
            content: 'SEGREDO',
            size: 50,
            color: '#ffffff',
            align: 'center',
            valign: 'middle',
            lineHeight: 1.2,
            letterSpacing: 0,
            box: 'area',
            fit: 'overflow',
            ink: { style: 'clean', wear: 0, seed: 1 },
          },
        },
        {
          id: 'top-both-marker',
          name: 'Marcador Both Acima',
          kind: 'shape',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 380,
          y: 380,
          width: 20,
          height: 20,
          rotation: 0,
          clip: false,
          light: 'both',
          shape: { type: 'rect', fill: '#808080', stroke: null, strokeWidth: 0, radius: 0, dash: [] },
        },
      ],
      fields: [],
      source: { kind: 'blank' },
      back: null,
    };

    const outNormal = await window.__atelie.renderHandout(doc, { scale: 1, light: 'normal', at: [[20, 20]] });
    const bgNormal = outNormal.pixels[0];
    const ctxNormal = outNormal.canvas.getContext('2d');

    // Check that inside text area under normal light there is NO white pixel
    const textDataNormal = ctxNormal.getImageData(50, 150, 200, 80).data;
    let whitePixelsNormal = 0;
    for (let i = 0; i < textDataNormal.length; i += 4) {
      if (textDataNormal[i] > 200 && textDataNormal[i + 1] > 200 && textDataNormal[i + 2] > 200) {
        whitePixelsNormal++;
      }
    }

    const outUV = await window.__atelie.renderHandout(doc, { scale: 1, light: 'uv', at: [[20, 20]] });
    const bgUV = outUV.pixels[0];
    const ctxUV = outUV.canvas.getContext('2d');

    // Check that inside text area under UV light there ARE bright white pixels (clear text)
    const textDataUV = ctxUV.getImageData(50, 150, 200, 80).data;
    let whitePixelsUV = 0;
    let maxLightUV = 0;
    for (let i = 0; i < textDataUV.length; i += 4) {
      const avg = (textDataUV[i] + textDataUV[i + 1] + textDataUV[i + 2]) / 3;
      if (avg > maxLightUV) maxLightUV = avg;
      if (textDataUV[i] > 220 && textDataUV[i + 1] > 220 && textDataUV[i + 2] > 220) {
        whitePixelsUV++;
      }
    }

    return {
      bgNormal,
      bgUV,
      whitePixelsNormal,
      whitePixelsUV,
      maxLightUV,
    };
  });

  // 1. Under normal light: text is hidden
  assert.equal(res4b.whitePixelsNormal, 0, 'under normal light white UV text is hidden');
  assert.ok(
    Math.abs(res4b.bgNormal[0] - 128) <= 4 &&
    Math.abs(res4b.bgNormal[1] - 128) <= 4 &&
    Math.abs(res4b.bgNormal[2] - 128) <= 4,
    `normal background should be gray ~128: ${res4b.bgNormal}`
  );

  // 2. Under UV light: background darkens and becomes purplish (darker than 128, B > R > G)
  assert.ok(
    res4b.bgUV[0] < res4b.bgNormal[0] &&
    res4b.bgUV[1] < res4b.bgNormal[1] &&
    res4b.bgUV[2] < res4b.bgNormal[2],
    `UV background must be darker than normal: normal=${res4b.bgNormal}, uv=${res4b.bgUV}`
  );
  assert.ok(
    res4b.bgUV[2] > res4b.bgUV[0] && res4b.bgUV[0] > res4b.bgUV[1],
    `UV background must be purplish (B > R > G): uv=${res4b.bgUV}`
  );

  // 3. Middle UV text is drawn on top of the darkening (appears clear / white > 220)
  assert.ok(res4b.whitePixelsUV > 10, `UV text must appear clearly (white pixels count: ${res4b.whitePixelsUV})`);
  assert.ok(res4b.maxLightUV >= 230, `UV text maximum brightness must be high (>230): ${res4b.maxLightUV}`);

  // 5. Missing image draws gray checkerboard
  const res5 = await page.evaluate(async () => {
    const doc = {
      schema: 1,
      id: '00000000-0000-0000-0000-000000000005',
      revision: 0,
      name: 'Missing Image Test',
      category: '',
      tags: [],
      page: { width: 400, height: 400, background: '#ffffff' },
      layers: [
        {
          id: 'missing-img',
          name: 'Missing Image',
          kind: 'image',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 50,
          y: 50,
          width: 200,
          height: 200,
          rotation: 0,
          clip: false,
          light: 'both',
          image: {
            src: { library: 'nao-existe' },
            fit: 'stretch',
            crop: null,
            flipX: false,
            flipY: false,
            filter: {},
            tint: null,
          },
        },
      ],
      fields: [],
      source: { kind: 'blank' },
      back: null,
    };
    return await window.__atelie.renderHandout(doc, {
      scale: 1,
      at: [[100, 100]],
    });
  });

  assert.equal(res5.missing.length, 1);
  assert.deepEqual(res5.missing[0], { library: 'nao-existe' });
  const [checkerPixel] = res5.pixels;
  assert.ok(checkerPixel[0] >= 100 && checkerPixel[0] <= 200, `checkerboard R between 100 and 200: ${checkerPixel[0]}`);
  assert.ok(checkerPixel[1] >= 100 && checkerPixel[1] <= 200, `checkerboard G between 100 and 200: ${checkerPixel[1]}`);
  assert.ok(checkerPixel[2] >= 100 && checkerPixel[2] <= 200, `checkerboard B between 100 and 200: ${checkerPixel[2]}`);

  // 6. Minimal text drawing
  const res6 = await page.evaluate(async () => {
    const doc = {
      schema: 1,
      id: '00000000-0000-0000-0000-000000000006',
      revision: 0,
      name: 'Text Test',
      category: '',
      tags: [],
      page: { width: 400, height: 400, background: '#ffffff' },
      layers: [
        {
          id: 'text-layer',
          name: 'Text Layer',
          kind: 'text',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 50,
          y: 50,
          width: 300,
          height: 200,
          rotation: 0,
          clip: false,
          light: 'both',
          text: {
            content: 'ABC',
            font: { family: 'serif', library: null, weight: 700, italic: false },
            size: 60,
            color: '#000000',
            align: 'left',
            valign: 'top',
            lineHeight: 1.25,
            letterSpacing: 0,
            box: 'area',
            fit: 'overflow',
            ink: { style: 'clean', wear: 0, seed: 1 },
          },
        },
      ],
      fields: [],
      source: { kind: 'blank' },
      back: null,
    };

    // Sample a grid of points inside the text area
    const samplePoints = [];
    for (let x = 60; x <= 160; x += 10) {
      for (let y = 60; y <= 120; y += 10) {
        samplePoints.push([x, y]);
      }
    }
    return await window.__atelie.renderHandout(doc, {
      scale: 1,
      at: samplePoints,
    });
  });

  const hasDarkPixel = res6.pixels.some(([r, g, b]) => r < 80 && g < 80 && b < 80);
  assert.ok(hasDarkPixel, 'At least one pixel in the text area should be dark (rendered glyph)');

  // 7. Texto "MMMM" em typewriter com wear: 1 renderizado duas vezes -> pixels idênticos em 20 pontos
  const resTypewriter = await page.evaluate(async () => {
    const doc = {
      schema: 1,
      id: '00000000-0000-0000-0000-000000000007',
      revision: 0,
      name: 'Typewriter Determinism Test',
      category: '',
      tags: [],
      page: { width: 400, height: 400, background: '#ffffff' },
      layers: [
        {
          id: 'tw-layer',
          name: 'Typewriter Layer',
          kind: 'text',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 50,
          y: 50,
          width: 300,
          height: 100,
          rotation: 0,
          clip: false,
          light: 'both',
          text: {
            content: 'MMMM',
            font: { family: 'Courier Prime', library: null, weight: 400, italic: false },
            size: 40,
            color: '#000000',
            align: 'left',
            valign: 'top',
            lineHeight: 1.25,
            letterSpacing: 0,
            box: 'area',
            fit: 'overflow',
            ink: { style: 'typewriter', wear: 1, seed: 123 },
          },
        },
      ],
      fields: [],
      source: { kind: 'blank' },
      back: null,
    };

    const points = [];
    for (let x = 60; x <= 160; x += 25) {
      for (let y = 60; y <= 100; y += 10) {
        points.push([x, y]);
      }
    }
    const samplePoints = points.slice(0, 20);

    const r1 = await window.__atelie.renderHandout(doc, { scale: 1, at: samplePoints });
    const r2 = await window.__atelie.renderHandout(doc, { scale: 1, at: samplePoints });
    return {
      pixels1: r1.pixels,
      pixels2: r2.pixels,
    };
  });

  assert.equal(resTypewriter.pixels1.length, 20);
  assert.deepEqual(resTypewriter.pixels1, resTypewriter.pixels2, 'Rendered pixels at 20 points should be 100% identical between renders');

  // 8. Texto centralizado numa caixa simétrica: a soma de pixels escuros na metade esquerda e na direita difere menos de 15%
  const resSymmetry = await page.evaluate(async () => {
    const doc = {
      schema: 1,
      id: '00000000-0000-0000-0000-000000000008',
      revision: 0,
      name: 'Centered Text Symmetry Test',
      category: '',
      tags: [],
      page: { width: 400, height: 200, background: '#ffffff' },
      layers: [
        {
          id: 'sym-layer',
          name: 'Symmetric Layer',
          kind: 'text',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 0,
          y: 0,
          width: 400,
          height: 200,
          rotation: 0,
          clip: false,
          light: 'both',
          text: {
            content: 'TESTE SIMETRICO',
            font: { family: 'serif', library: null, weight: 700, italic: false },
            size: 36,
            color: '#000000',
            align: 'center',
            valign: 'middle',
            lineHeight: 1.25,
            letterSpacing: 0,
            box: 'area',
            fit: 'overflow',
            ink: { style: 'clean', wear: 0, seed: 1 },
          },
        },
      ],
      fields: [],
      source: { kind: 'blank' },
      back: null,
    };

    const res = await window.__atelie.renderHandout(doc, { scale: 1 });
    const canvas = res.canvas;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, 400, 200).data;

    let leftDark = 0;
    let rightDark = 0;

    for (let y = 0; y < 200; y++) {
      for (let x = 0; x < 400; x++) {
        const idx = (y * 400 + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const isDark = r < 200 && g < 200 && b < 200;
        if (isDark) {
          if (x < 200) leftDark++;
          else rightDark++;
        }
      }
    }

    return { leftDark, rightDark };
  });

  assert.ok(resSymmetry.leftDark > 50, `left side should have dark pixels: ${resSymmetry.leftDark}`);
  assert.ok(resSymmetry.rightDark > 50, `right side should have dark pixels: ${resSymmetry.rightDark}`);
  const maxDark = Math.max(resSymmetry.leftDark, resSymmetry.rightDark);
  const diffPct = Math.abs(resSymmetry.leftDark - resSymmetry.rightDark) / maxDark;
  assert.ok(diffPct < 0.15, `difference between left and right dark pixels (${diffPct * 100}%) should be < 15%`);

  // 9. Procedural effects: determinism (each effect with seed: 7 rendered twice produces exact same pixels in 20 points)
  const effectTypes = ['crumple', 'fold', 'stain', 'burn', 'tear', 'damp', 'fade', 'blood', 'grain'];
  const testSamplePoints = [];
  for (let i = 0; i < 20; i++) {
    testSamplePoints.push([50 + (i * 17) % 300, 50 + (i * 23) % 300]);
  }

  for (const effType of effectTypes) {
    const resDet = await page.evaluate(async ({ effType, points }) => {
      const makeDoc = () => ({
        schema: 1,
        id: '00000000-0000-0000-0000-000000000009',
        revision: 0,
        name: `Effect Determinism ${effType}`,
        category: '',
        tags: [],
        page: { width: 400, height: 400, background: '#f5efe0' },
        layers: [
          {
            id: 'eff-1',
            name: effType,
            kind: 'effect',
            visible: true,
            locked: false,
            opacity: 1,
            blend: effType === 'fade' ? 'screen' : effType === 'crumple' ? 'soft-light' : effType === 'grain' ? 'overlay' : effType === 'burn' || effType === 'tear' ? 'normal' : 'multiply',
            x: 0,
            y: 0,
            width: 400,
            height: 400,
            rotation: 0,
            clip: false,
            light: 'both',
            effect: {
              type: effType,
              seed: 7,
              amount: 0.7,
              params: {},
            },
          },
        ],
        fields: [],
        source: { kind: 'blank' },
        back: null,
      });

      const r1 = await window.__atelie.renderHandout(makeDoc(), { scale: 1, at: points });
      const r2 = await window.__atelie.renderHandout(makeDoc(), { scale: 1, at: points });
      return { p1: r1.pixels, p2: r2.pixels };
    }, { effType, points: testSamplePoints });

    assert.deepEqual(resDet.p1, resDet.p2, `effect ${effType} with seed 7 should render identical pixels on both runs`);
  }

  // 10. Procedural effects: seed: 7 and seed: 8 of blood -> different pixels
  const resBloodDiff = await page.evaluate(async ({ points }) => {
    const makeBloodDoc = (seed) => ({
      schema: 1,
      id: '00000000-0000-0000-0000-000000000010',
      revision: 0,
      name: 'Blood Seed Test',
      category: '',
      tags: [],
      page: { width: 400, height: 400, background: '#ffffff' },
      layers: [
        {
          id: 'blood-1',
          name: 'Blood',
          kind: 'effect',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'multiply',
          x: 0,
          y: 0,
          width: 400,
          height: 400,
          rotation: 0,
          clip: false,
          light: 'both',
          effect: {
            type: 'blood',
            seed,
            amount: 0.8,
            params: { drops: 25, smear: true },
          },
        },
      ],
      fields: [],
      source: { kind: 'blank' },
      back: null,
    });

    const r7 = await window.__atelie.renderHandout(makeBloodDoc(7), { scale: 1, at: points });
    const r8 = await window.__atelie.renderHandout(makeBloodDoc(8), { scale: 1, at: points });
    return { p7: r7.pixels, p8: r8.pixels };
  }, { points: testSamplePoints });

  assert.notDeepEqual(resBloodDiff.p7, resBloodDiff.p8, 'blood effect with seed 7 vs seed 8 must produce different pixels');

  // 11. Procedural effects: amount: 0 in multiply does not change the page (all points equal to page without effect, ± 2)
  const resAmtZero = await page.evaluate(async ({ points }) => {
    const baseDoc = {
      schema: 1,
      id: '00000000-0000-0000-0000-000000000011',
      revision: 0,
      name: 'Amount Zero Test Base',
      category: '',
      tags: [],
      page: { width: 400, height: 400, background: '#e8dec8' },
      layers: [
        {
          id: 'paper-bg',
          name: 'Paper',
          kind: 'shape',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 0,
          y: 0,
          width: 400,
          height: 400,
          rotation: 0,
          clip: false,
          light: 'both',
          shape: { type: 'rect', fill: '#e8dec8', stroke: null, strokeWidth: 0, radius: 0, dash: [] },
        },
      ],
      fields: [],
      source: { kind: 'blank' },
      back: null,
    };

    const effectDoc = {
      ...baseDoc,
      layers: [
        ...baseDoc.layers,
        {
          id: 'stain-zero',
          name: 'Stain Zero',
          kind: 'effect',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'multiply',
          x: 0,
          y: 0,
          width: 400,
          height: 400,
          rotation: 0,
          clip: false,
          light: 'both',
          effect: {
            type: 'stain',
            seed: 42,
            amount: 0,
            params: { count: 8 },
          },
        },
      ],
    };

    const rBase = await window.__atelie.renderHandout(baseDoc, { scale: 1, at: points });
    const rEff = await window.__atelie.renderHandout(effectDoc, { scale: 1, at: points });
    return { basePixels: rBase.pixels, effPixels: rEff.pixels };
  }, { points: testSamplePoints });

  for (let i = 0; i < testSamplePoints.length; i++) {
    const pBase = resAmtZero.basePixels[i];
    const pEff = resAmtZero.effPixels[i];
    for (let c = 0; c < 4; c++) {
      const diff = Math.abs(pBase[c] - pEff[c]);
      assert.ok(diff <= 2, `point ${i} channel ${c} differs by ${diff} (> 2): base=${pBase}, eff=${pEff}`);
    }
  }

  // 12. Procedural effects: fold with 1 horizontal fold -> pixel on fold line is darker than at 100 px away
  const resFoldDark = await page.evaluate(async () => {
    const doc = {
      schema: 1,
      id: '00000000-0000-0000-0000-000000000012',
      revision: 0,
      name: 'Fold Darkness Test',
      category: '',
      tags: [],
      page: { width: 400, height: 400, background: '#ffffff' },
      layers: [
        {
          id: 'fold-layer',
          name: 'Fold',
          kind: 'effect',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'multiply',
          x: 0,
          y: 0,
          width: 400,
          height: 400,
          rotation: 0,
          clip: false,
          light: 'both',
          effect: {
            type: 'fold',
            seed: 1,
            amount: 0.8,
            params: { horizontal: 1, vertical: 0 },
          },
        },
      ],
      fields: [],
      source: { kind: 'blank' },
      back: null,
    };

    const res = await window.__atelie.renderHandout(doc, {
      scale: 1,
      at: [
        [200, 200], // fold line
        [200, 100], // 100px away
      ],
    });

    return res.pixels;
  });

  const [onFold, offFold] = resFoldDark;
  const brightnessFold = (onFold[0] + onFold[1] + onFold[2]) / 3;
  const brightnessOff = (offFold[0] + offFold[1] + offFold[2]) / 3;
  assert.ok(brightnessFold < brightnessOff, `pixel on fold (${brightnessFold}) must be darker than 100px away (${brightnessOff})`);

  // 13. Coleção da casa: camada com um carimbo SVG da coleção e tint vermelho -> pixels vermelhos dentro da caixa
  const resStampTint = await page.evaluate(async () => {
    const doc = {
      schema: 1,
      id: '00000000-0000-0000-0000-000000000013',
      revision: 0,
      name: 'Stamp Tint Test',
      category: '',
      tags: [],
      page: { width: 400, height: 400, background: '#ffffff' },
      layers: [
        {
          id: 'stamp-confidencial',
          name: 'Carimbo Confidencial',
          kind: 'image',
          visible: true,
          locked: false,
          opacity: 1,
          blend: 'normal',
          x: 50,
          y: 150,
          width: 300,
          height: 100,
          rotation: 0,
          clip: false,
          light: 'both',
          image: {
            src: { library: 'casa-carimbo-confidencial' },
            fit: 'contain',
            crop: null,
            flipX: false,
            flipY: false,
            filter: { brightness: 1, contrast: 1, saturation: 1, blur: 0 },
            tint: { color: '#ff0000', amount: 1 },
          },
        },
      ],
      fields: [],
      source: { kind: 'blank' },
      back: null,
    };

    const r = await window.__atelie.renderHandout(doc, { scale: 1 });
    const ctx = r.canvas.getContext('2d');
    const imgData = ctx.getImageData(50, 150, 300, 100);
    let redCount = 0;
    for (let i = 0; i < imgData.data.length; i += 4) {
      const red = imgData.data[i];
      const green = imgData.data[i + 1];
      const blue = imgData.data[i + 2];
      if (red > 200 && green < 60 && blue < 60) {
        redCount++;
      }
    }
    return {
      missing: r.missing,
      redCount,
      outsidePixel: Array.from(ctx.getImageData(10, 10, 1, 1).data),
    };
  });

  assert.deepEqual(resStampTint.missing, [], 'carimbo da coleção não deve constar como ausente');
  assert.ok(resStampTint.redCount > 50, `deve haver pixels vermelhos dentro da caixa do carimbo: ${resStampTint.redCount}`);
  assert.deepEqual(resStampTint.outsidePixel, [255, 255, 255, 255], 'fora da caixa do carimbo deve ser branco');

  assert.deepEqual(errors, []);
});

