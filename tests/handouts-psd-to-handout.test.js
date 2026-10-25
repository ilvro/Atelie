import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createBuffer } from '../scripts/library/lib/raster.js';
import { psdToHandout } from '../scripts/library/lib/psd-to-handout.js';
import { matchFont } from '../scripts/library/lib/font-match.js';
import { validateHandout } from '../src/domain/handouts.js';

function makePixelBuffer(w, h, r = 1, g = 0, b = 0, a = 1) {
  const buf = createBuffer(w, h);
  for (let i = 0; i < w * h; i++) {
    buf.data[i * 4] = r;
    buf.data[i * 4 + 1] = g;
    buf.data[i * 4 + 2] = b;
    buf.data[i * 4 + 3] = a;
  }
  return buf;
}

describe('PSD to Handout Template Conversion (Etapa 25)', () => {
  // Test 1: Grupo pass-through "Com Rasgo" com um pixel soft-light -> camada image "Com Rasgo · <nome>" com blend: 'soft-light'
  it('1. pass-through group "Com Rasgo" with soft-light pixel produces image layer "Com Rasgo · <name>" with soft-light blend', async () => {
    const pixelBuf = makePixelBuffer(20, 20);
    const tree = {
      width: 100,
      height: 100,
      nodes: [
        {
          id: 'g1',
          name: 'Com Rasgo',
          kind: 'group',
          blend: 'pass-through',
          opacity: 1,
          visible: true,
          children: [
            {
              id: 'p1',
              name: 'Rasgo Inferior',
              kind: 'pixel',
              blend: 'soft-light',
              opacity: 1,
              visible: true,
              bounds: { left: 0, top: 0, right: 20, bottom: 20 },
              buffer: pixelBuf,
            },
          ],
        },
      ],
    };

    const pixels = async (n) => ({ buffer: n.buffer || null, mask: null });
    const { handout } = await psdToHandout(tree, pixels, {
      tplId: 'ac-tpl-test-1',
      scale: 1,
    });

    const layer = handout.layers.find(l => l.name.includes('Com Rasgo'));
    assert.ok(layer, 'Layer with "Com Rasgo" should exist');
    assert.equal(layer.kind, 'image');
    assert.equal(layer.name, 'Com Rasgo · Rasgo Inferior');
    assert.equal(layer.blend, 'soft-light');
  });

  // Test 2: Dois grupos irmãos de variação, um oculto -> as camadas do oculto vêm com visible: false e prefixo "Variação ·"
  it('2. two sibling variant groups, one hidden -> hidden variant layers get visible: false and "Variação ·" prefix', async () => {
    const buf1 = makePixelBuffer(10, 10);
    const buf2 = makePixelBuffer(10, 10);

    const tree = {
      width: 100,
      height: 100,
      nodes: [
        {
          id: 'v1',
          name: 'Foto Colorida',
          kind: 'group',
          blend: 'pass-through',
          opacity: 1,
          visible: true,
          children: [
            {
              id: 'p1',
              name: 'Foto',
              kind: 'pixel',
              blend: 'normal',
              opacity: 1,
              visible: true,
              bounds: { left: 0, top: 0, right: 10, bottom: 10 },
              buffer: buf1,
            },
          ],
        },
        {
          id: 'v2',
          name: 'Foto P&B',
          kind: 'group',
          blend: 'pass-through',
          opacity: 1,
          visible: false,
          children: [
            {
              id: 'p2',
              name: 'Foto PB',
              kind: 'pixel',
              blend: 'normal',
              opacity: 1,
              visible: true,
              bounds: { left: 0, top: 0, right: 10, bottom: 10 },
              buffer: buf2,
            },
          ],
        },
      ],
    };

    const pixels = async (n) => ({ buffer: n.buffer || null, mask: null });
    const { handout } = await psdToHandout(tree, pixels, {
      tplId: 'ac-tpl-test-2',
      scale: 1,
    });

    const activeLayer = handout.layers.find(l => l.name.includes('Foto Colorida'));
    const hiddenLayer = handout.layers.find(l => l.name.includes('Foto P&B'));

    assert.ok(activeLayer, 'Active variant layer should exist');
    assert.ok(hiddenLayer, 'Hidden variant layer should exist');

    assert.ok(activeLayer.name.startsWith('Variação · Foto Colorida'));
    assert.ok(hiddenLayer.name.startsWith('Variação · Foto P&B'));

    assert.equal(activeLayer.visible, true);
    assert.equal(hiddenLayer.visible, false);
  });

  // Test 3: Grupo "Efeito de UV" -> as camadas vêm com light: 'uv'
  it('3. group "Efeito de UV" -> child layers get light: "uv"', async () => {
    const uvBuf = makePixelBuffer(30, 30);
    const tree = {
      width: 100,
      height: 100,
      nodes: [
        {
          id: 'uvGroup',
          name: 'Efeito de UV',
          kind: 'group',
          blend: 'pass-through',
          opacity: 1,
          visible: true,
          children: [
            {
              id: 'uvLayer',
              name: 'Mancha Secreta',
              kind: 'pixel',
              blend: 'normal',
              opacity: 1,
              visible: true,
              bounds: { left: 5, top: 5, right: 35, bottom: 35 },
              buffer: uvBuf,
            },
          ],
        },
      ],
    };

    const pixels = async (n) => ({ buffer: n.buffer || null, mask: null });
    const { handout } = await psdToHandout(tree, pixels, {
      tplId: 'ac-tpl-test-3',
      scale: 1,
    });

    const layer = handout.layers.find(l => l.name.includes('Mancha Secreta'));
    assert.ok(layer, 'UV layer should exist');
    assert.equal(layer.light, 'uv');
  });

  // Test 4: Objeto inteligente afim (escala 2) com um texto e um pixel dentro -> uma image sem o texto, transformada, e uma text com size dobrado, no lugar certo, com o modo do objeto; o texto virou campo
  it('4. affine smart object (scale 2) with text and pixel inside produces non-text image and doubled-size text field', async () => {
    const pixelBuf = makePixelBuffer(50, 50);

    const innerTree = {
      width: 100,
      height: 100,
      nodes: [
        {
          id: 'innerPixel',
          name: 'Fundo do Selo',
          kind: 'pixel',
          blend: 'normal',
          opacity: 1,
          visible: true,
          bounds: { left: 0, top: 0, right: 50, bottom: 50 },
          buffer: pixelBuf,
        },
        {
          id: 'innerText',
          name: 'Número do Selo',
          kind: 'text',
          blend: 'normal',
          opacity: 1,
          visible: true,
          text: {
            content: '12345',
            size: 16,
            shape: 'point',
            matrix: [1, 0, 0, 1, 10, 20],
          },
        },
      ],
    };

    // Smart object corners representing width 100 scaled 2x to width 200, positioned at x=30, y=40
    // corners: [x0,y0, x1,y1, x2,y2, x3,y3]
    const corners = [30, 40, 230, 40, 230, 240, 30, 240];

    const tree = {
      width: 400,
      height: 400,
      nodes: [
        {
          id: 'smart1',
          name: 'Selo Oficial',
          kind: 'smart',
          blend: 'multiply',
          opacity: 0.9,
          visible: true,
          bounds: { left: 30, top: 40, right: 230, bottom: 240 },
          smart: {
            linkedId: 'selo-inner',
            width: 100,
            height: 100,
            corners,
            content: innerTree,
          },
        },
      ],
    };

    const pixels = async (n) => ({ buffer: n.buffer || null, mask: null });
    const { handout } = await psdToHandout(tree, pixels, {
      tplId: 'ac-tpl-test-4',
      scale: 1,
    });

    const imgLayer = handout.layers.find(l => l.kind === 'image');
    const txtLayer = handout.layers.find(l => l.kind === 'text');

    assert.ok(imgLayer, 'Image layer from non-text smart object content should exist');
    assert.ok(txtLayer, 'Text layer extracted from smart object should exist');

    assert.equal(imgLayer.blend, 'multiply');
    assert.equal(txtLayer.blend, 'multiply');

    // Font size should be doubled (16 * 2 = 32)
    assert.equal(txtLayer.text.size, 32);

    // Text layer should be a field in handout.fields
    const field = handout.fields.find(f => f.layerId === txtLayer.id);
    assert.ok(field, 'Text should become a field');
    assert.ok(field.label.includes('Número do Selo'));
  });

  // Test 5: hue/saturation com saturação −50 -> adjust com saturation: -.5; levels -> curve com 9 pontos crescentes
  it('5. hue/saturation with saturation -50 produces saturation: -0.5; levels produces curve with 9 strictly increasing points', async () => {
    const tree = {
      width: 100,
      height: 100,
      nodes: [
        {
          id: 'adj1',
          name: 'Desaturar',
          kind: 'adjust',
          blend: 'normal',
          opacity: 1,
          visible: true,
          adjust: {
            type: 'hue/saturation',
            master: { saturation: -50, hue: 0, lightness: 0 },
          },
        },
        {
          id: 'adj2',
          name: 'Contraste Niveis',
          kind: 'adjust',
          blend: 'normal',
          opacity: 1,
          visible: true,
          adjust: {
            type: 'levels',
            rgb: {
              shadowInput: 10,
              highlightInput: 240,
              midtoneInput: 1.2,
              shadowOutput: 0,
              highlightOutput: 255,
            },
          },
        },
      ],
    };

    const pixels = async () => ({ buffer: null, mask: null });
    const { handout } = await psdToHandout(tree, pixels, {
      tplId: 'ac-tpl-test-5',
      scale: 1,
    });

    const hsLayer = handout.layers.find(l => l.name === 'Desaturar');
    assert.ok(hsLayer);
    assert.equal(hsLayer.kind, 'adjust');
    assert.equal(hsLayer.adjust.saturation, -0.5);

    const levelsLayer = handout.layers.find(l => l.name === 'Contraste Niveis');
    assert.ok(levelsLayer);
    assert.equal(levelsLayer.kind, 'adjust');
    assert.ok(Array.isArray(levelsLayer.adjust.curve));
    assert.equal(levelsLayer.adjust.curve.length, 9);

    // Check that curve inputs are strictly increasing
    for (let i = 1; i < levelsLayer.adjust.curve.length; i++) {
      assert.ok(
        levelsLayer.adjust.curve[i][0] > levelsLayer.adjust.curve[i - 1][0],
        'Curve inputs must be strictly increasing'
      );
    }
  });

  // Test 6: Três image normal seguidas no fundo viram uma só "Fundo"
  it('6. three consecutive normal image layers at background merge into a single "Fundo" layer', async () => {
    const b1 = makePixelBuffer(100, 100, 0.9, 0.9, 0.9);
    const b2 = makePixelBuffer(100, 100, 0.8, 0.8, 0.8);
    const b3 = makePixelBuffer(100, 100, 0.7, 0.7, 0.7);

    const tree = {
      width: 100,
      height: 100,
      nodes: [
        {
          id: 'l1',
          name: 'Textura Base',
          kind: 'pixel',
          blend: 'normal',
          opacity: 1,
          visible: true,
          clipping: false,
          bounds: { left: 0, top: 0, right: 100, bottom: 100 },
          buffer: b1,
        },
        {
          id: 'l2',
          name: 'Papel Fibra',
          kind: 'pixel',
          blend: 'normal',
          opacity: 1,
          visible: true,
          clipping: false,
          bounds: { left: 0, top: 0, right: 100, bottom: 100 },
          buffer: b2,
        },
        {
          id: 'l3',
          name: 'Borda Suave',
          kind: 'pixel',
          blend: 'normal',
          opacity: 1,
          visible: true,
          clipping: false,
          bounds: { left: 0, top: 0, right: 100, bottom: 100 },
          buffer: b3,
        },
        {
          id: 'l4',
          name: 'Texto Título',
          kind: 'text',
          blend: 'normal',
          opacity: 1,
          visible: true,
          text: { content: 'Título', size: 24, shape: 'point' },
        },
      ],
    };

    const pixels = async (n) => ({ buffer: n.buffer || null, mask: null });
    const { handout } = await psdToHandout(tree, pixels, {
      tplId: 'ac-tpl-test-6',
      scale: 1,
    });

    const imageLayers = handout.layers.filter(l => l.kind === 'image');
    assert.equal(imageLayers.length, 1, 'The 3 normal background image layers should merge into 1');
    assert.equal(imageLayers[0].name, 'Fundo');
    assert.equal(imageLayers[0].blend, 'normal');
  });

  // Test 7: matchFont('Lora-Bold', [...]) -> o de peso 700; 'Nada' -> null
  it('7. matchFont matches weight 700 for "Lora-Bold" and returns null for unknown font', () => {
    const libraryFonts = [
      { family: 'Lora', postscript: 'Lora-Regular', weight: 400 },
      { family: 'Lora', postscript: 'Lora-Bold', weight: 700 },
    ];

    const match1 = matchFont('Lora-Bold', libraryFonts);
    assert.ok(match1);
    assert.equal(match1.weight, 700);

    const match2 = matchFont('Nada', libraryFonts);
    assert.equal(match2, null);
  });

  // Test 8: O documento gerado passa em validateHandout
  it('8. generated handout passes validateHandout without throwing', async () => {
    const pixelBuf = makePixelBuffer(100, 100);
    const tree = {
      width: 1240,
      height: 1754,
      nodes: [
        {
          id: 'bg',
          name: 'Fundo',
          kind: 'pixel',
          blend: 'normal',
          opacity: 1,
          visible: true,
          bounds: { left: 0, top: 0, right: 1240, bottom: 1754 },
          buffer: pixelBuf,
        },
        {
          id: 'txt',
          name: 'Corpo do Texto',
          kind: 'text',
          blend: 'normal',
          opacity: 1,
          visible: true,
          text: {
            content: 'Este é um documento de teste oficial.',
            size: 20,
            shape: 'box',
            box: [100, 100, 800, 600],
          },
        },
      ],
    };

    const pixels = async (n) => ({ buffer: n.buffer || null, mask: null });
    const { handout } = await psdToHandout(tree, pixels, {
      tplId: 'ac-tpl-test-8',
      scale: 1,
    });

    // Should not throw ValidationError
    assert.doesNotThrow(() => validateHandout(handout));
  });
});

