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

  assert.deepEqual(errors, []);
});

