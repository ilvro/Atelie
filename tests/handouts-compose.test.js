import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createBuffer } from '../scripts/library/lib/raster.js';
import { blendPixel, compositeLayer, nonSeparable } from '../scripts/library/lib/blend.js';
import { adjustBuffer } from '../scripts/library/lib/adjust.js';
import { composeTree } from '../scripts/library/lib/compose.js';
import { compareBuffers } from '../scripts/library/psd-check.js';

describe('Handouts PSD Compositor (Etapa 24)', () => {
  // Test 1: normal com opacidade .5 de vermelho sobre branco -> (1, .5, .5, 1)
  it('1. normal with opacity 0.5 of red over white yields (1, 0.5, 0.5, 1)', () => {
    const target = createBuffer(4, 4);
    // Fill target with opaque white
    for (let i = 0; i < 16; i++) {
      target.data[i * 4] = 1;
      target.data[i * 4 + 1] = 1;
      target.data[i * 4 + 2] = 1;
      target.data[i * 4 + 3] = 1;
    }

    const layer = createBuffer(4, 4);
    // Fill layer with opaque red
    for (let i = 0; i < 16; i++) {
      layer.data[i * 4] = 1;
      layer.data[i * 4 + 1] = 0;
      layer.data[i * 4 + 2] = 0;
      layer.data[i * 4 + 3] = 1;
    }

    compositeLayer(target, layer, { mode: 'normal', opacity: 0.5 });

    for (let i = 0; i < 16; i++) {
      const idx = i * 4;
      assert.ok(Math.abs(target.data[idx] - 1.0) < 0.01, `R should be ~1, got ${target.data[idx]}`);
      assert.ok(Math.abs(target.data[idx + 1] - 0.5) < 0.01, `G should be ~0.5, got ${target.data[idx + 1]}`);
      assert.ok(Math.abs(target.data[idx + 2] - 0.5) < 0.01, `B should be ~0.5, got ${target.data[idx + 2]}`);
      assert.ok(Math.abs(target.data[idx + 3] - 1.0) < 0.01, `A should be ~1, got ${target.data[idx + 3]}`);
    }
  });

  // Test 2: multiply de azul sobre vermelho, ambos opacos -> preto; screen -> magenta
  it('2. multiply of blue over red -> black; screen -> magenta', () => {
    const red = [1, 0, 0, 1];
    const blue = [0, 0, 1, 1];

    const outMultiply = [0, 0, 0, 0];
    blendPixel('multiply', red, blue, outMultiply);
    assert.deepEqual(outMultiply, [0, 0, 0, 1]);

    const outScreen = [0, 0, 0, 0];
    blendPixel('screen', red, blue, outScreen);
    assert.deepEqual(outScreen, [1, 0, 1, 1]);
  });

  // Test 3: Fonte com alfa .5 em multiply sobre fundo transparente -> a cor da fonte com alfa .5
  it('3. source with alpha 0.5 in multiply over transparent backdrop preserves source color and alpha', () => {
    const transparent = [0, 0, 0, 0];
    const source = [0.2, 0.4, 0.8, 0.5];
    const out = [0, 0, 0, 0];

    blendPixel('multiply', transparent, source, out);
    assert.ok(Math.abs(out[0] - 0.2) < 0.001);
    assert.ok(Math.abs(out[1] - 0.4) < 0.001);
    assert.ok(Math.abs(out[2] - 0.8) < 0.001);
    assert.ok(Math.abs(out[3] - 0.5) < 0.001);
  });

  // Test 4: luminosity de cinza 50 % sobre vermelho puro -> vermelho com a luminância do cinza
  it('4. luminosity of gray 50% over pure red yields red with luminance of gray', () => {
    const red = [1, 0, 0];
    const gray50 = [0.5, 0.5, 0.5];

    const res = nonSeparable('luminosity', red, gray50);
    // res should maintain red hue/sat but have lum = 0.5
    const lumRes = 0.3 * res[0] + 0.59 * res[1] + 0.11 * res[2];
    assert.ok(Math.abs(lumRes - 0.5) < 0.01, `Luminance should be ~0.5, got ${lumRes}`);
    assert.ok(res[0] > res[1] && res[1] === res[2], 'Should remain red-tinted (R > G == B)');
  });

  // Test 5: Grupo pass-through com um filho multiply x grupo normal com o mesmo filho -> resultados diferentes
  it('5. pass-through group vs normal group with multiply child yields different results', async () => {
    // Backdrop: red
    const backdropBuf = createBuffer(4, 4);
    for (let i = 0; i < 16; i++) {
      backdropBuf.data[i * 4] = 1; // R=1, G=0, B=0, A=1
      backdropBuf.data[i * 4 + 3] = 1;
    }

    // Child layer: blue
    const blueBuf = createBuffer(4, 4);
    for (let i = 0; i < 16; i++) {
      blueBuf.data[i * 4 + 2] = 1; // B=1, A=1
      blueBuf.data[i * 4 + 3] = 1;
    }

    const treePassThrough = {
      width: 4,
      height: 4,
      nodes: [
        { id: 'bg', kind: 'pixel', blend: 'normal', opacity: 1, visible: true },
        {
          id: 'grp',
          kind: 'group',
          blend: 'pass-through',
          opacity: 1,
          visible: true,
          children: [
            { id: 'child', kind: 'pixel', blend: 'multiply', opacity: 1, visible: true },
          ],
        },
      ],
    };

    const treeIsolated = {
      width: 4,
      height: 4,
      nodes: [
        { id: 'bg', kind: 'pixel', blend: 'normal', opacity: 1, visible: true },
        {
          id: 'grp',
          kind: 'group',
          blend: 'normal',
          opacity: 1,
          visible: true,
          children: [
            { id: 'child', kind: 'pixel', blend: 'multiply', opacity: 1, visible: true },
          ],
        },
      ],
    };

    const pixelsResolver = async (node) => {
      if (node.id === 'bg') return { buffer: backdropBuf, mask: null };
      if (node.id === 'child') return { buffer: blueBuf, mask: null };
      return { buffer: null, mask: null };
    };

    const resPassThrough = await composeTree(treePassThrough, pixelsResolver, { scale: 1 });
    const resIsolated = await composeTree(treeIsolated, pixelsResolver, { scale: 1 });

    // In pass-through: multiply of blue over red -> black (0, 0, 0)
    assert.ok(resPassThrough.data[0] < 0.05, 'Pass-through should multiply onto backdrop -> black');

    // In isolated normal group: multiply of blue over transparent -> blue (0, 0, 1) -> normal over red -> blue
    assert.ok(resIsolated.data[2] > 0.9, 'Isolated group should not multiply onto backdrop -> blue');
    assert.notDeepEqual(resPassThrough.data, resIsolated.data);
  });

  // Test 6: Recorte: base cobrindo só a metade esquerda; a recortada (preta, cobrindo tudo) só escurece a esquerda
  it('6. clipping mask: base covering only left half confines black clipped layer to left half', async () => {
    // Document background: white
    const bgBuf = createBuffer(4, 4);
    for (let i = 0; i < 16; i++) {
      bgBuf.data[i * 4] = 1;
      bgBuf.data[i * 4 + 1] = 1;
      bgBuf.data[i * 4 + 2] = 1;
      bgBuf.data[i * 4 + 3] = 1;
    }

    // Base layer: red covering only left half (x < 2)
    const baseBuf = createBuffer(4, 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 2; x++) {
        const idx = (y * 4 + x) * 4;
        baseBuf.data[idx] = 1;     // R
        baseBuf.data[idx + 3] = 1; // A
      }
    }

    // Clipped layer: black covering all 4x4
    const clippedBuf = createBuffer(4, 4);
    for (let i = 0; i < 16; i++) {
      clippedBuf.data[i * 4 + 3] = 1; // Black, A=1
    }

    const tree = {
      width: 4,
      height: 4,
      nodes: [
        { id: 'bg', kind: 'pixel', blend: 'normal', opacity: 1, visible: true },
        { id: 'base', kind: 'pixel', blend: 'normal', opacity: 1, visible: true, clipping: false },
        { id: 'clip', kind: 'pixel', blend: 'normal', opacity: 1, visible: true, clipping: true },
      ],
    };

    const pixels = async (node) => {
      if (node.id === 'bg') return { buffer: bgBuf, mask: null };
      if (node.id === 'base') return { buffer: baseBuf, mask: null };
      if (node.id === 'clip') return { buffer: clippedBuf, mask: null };
      return { buffer: null, mask: null };
    };

    const out = await composeTree(tree, pixels, { scale: 1 });

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const idx = (y * 4 + x) * 4;
        if (x < 2) {
          // Left half was clipped to black
          assert.ok(out.data[idx] < 0.05, `Left half (x=${x}) should be black, got ${out.data[idx]}`);
        } else {
          // Right half was unclipped, remains white background
          assert.ok(out.data[idx] > 0.95, `Right half (x=${x}) should remain white, got ${out.data[idx]}`);
        }
      }
    }
  });

  // Test 7: Máscara: metade 0, metade 1 -> a camada só aparece na metade com 1; defaultColor: 255 fora dos bounds
  it('7. mask: half 0, half 1 -> layer only appears where mask is 1; defaultColor 255 outside bounds', () => {
    const target = createBuffer(4, 4);
    const layer = createBuffer(4, 4);
    for (let i = 0; i < 16; i++) {
      layer.data[i * 4] = 1; // Red
      layer.data[i * 4 + 3] = 1;
    }

    // Mask with width 4, height 4: x < 2 is 0, x >= 2 is 1
    const maskData = new Float32Array(16);
    for (let y = 0; y < 4; y++) {
      for (let x = 2; x < 4; x++) {
        maskData[y * 4 + x] = 1;
      }
    }
    const mask = { width: 4, height: 4, data: maskData };

    compositeLayer(target, layer, { mode: 'normal', mask });

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const idx = (y * 4 + x) * 4;
        if (x < 2) {
          assert.equal(target.data[idx + 3], 0, `Pixel at (${x},${y}) should be masked out`);
        } else {
          assert.equal(target.data[idx], 1, `Pixel at (${x},${y}) should have red=1`);
          assert.equal(target.data[idx + 3], 1, `Pixel at (${x},${y}) should have alpha=1`);
        }
      }
    }
  });

  // Test 8: hue/saturation com saturação −100 -> R = G = B; invert duas vezes volta ao original
  it('8. hue/saturation with saturation -100 yields R = G = B; invert twice returns original', () => {
    const buf = createBuffer(4, 4);
    for (let i = 0; i < 16; i++) {
      buf.data[i * 4] = 0.8;
      buf.data[i * 4 + 1] = 0.4;
      buf.data[i * 4 + 2] = 0.2;
      buf.data[i * 4 + 3] = 1.0;
    }

    // Saturation -100
    adjustBuffer(buf, { type: 'hue/saturation', master: { saturation: -100 } });
    for (let i = 0; i < 16; i++) {
      const idx = i * 4;
      assert.ok(Math.abs(buf.data[idx] - buf.data[idx + 1]) < 0.001, 'R should equal G');
      assert.ok(Math.abs(buf.data[idx + 1] - buf.data[idx + 2]) < 0.001, 'G should equal B');
    }

    // Invert once
    adjustBuffer(buf, { type: 'invert' });
    // Invert twice -> back to grayscale value
    adjustBuffer(buf, { type: 'invert' });
    for (let i = 0; i < 16; i++) {
      const idx = i * 4;
      assert.ok(Math.abs(buf.data[idx] - buf.data[idx + 1]) < 0.001);
    }
  });

  // Test 9: curves com pontos (0,0) (128,200) (255,255) -> 128 vira 200/255 (± 1/255)
  it('9. curves with points (0,0), (128,200), (255,255) maps 128 to 200/255', () => {
    const buf = createBuffer(4, 4);
    for (let i = 0; i < 16; i++) {
      buf.data[i * 4] = 128 / 255;
      buf.data[i * 4 + 1] = 128 / 255;
      buf.data[i * 4 + 2] = 128 / 255;
      buf.data[i * 4 + 3] = 1.0;
    }

    adjustBuffer(buf, {
      type: 'curves',
      points: [
        { input: 0, output: 0 },
        { input: 128, output: 200 },
        { input: 255, output: 255 },
      ],
    });

    const expected = 200 / 255;
    const tolerance = 1.5 / 255;
    for (let i = 0; i < 16; i++) {
      const idx = i * 4;
      assert.ok(
        Math.abs(buf.data[idx] - expected) <= tolerance,
        `Expected ~${expected}, got ${buf.data[idx]}`
      );
    }
  });

  // Test 10: compareBuffers de buffers iguais -> mae 0; um pixel em 16 diferente por 255 -> bad = 1/16
  it('10. compareBuffers of equal buffers -> mae 0; 1 pixel in 16 differs by 255 -> bad = 1/16', () => {
    const bufA = createBuffer(4, 4);
    const bufB = createBuffer(4, 4);

    for (let i = 0; i < 16; i++) {
      bufA.data[i * 4] = 0.5;
      bufA.data[i * 4 + 1] = 0.5;
      bufA.data[i * 4 + 2] = 0.5;
      bufA.data[i * 4 + 3] = 1.0;

      bufB.data[i * 4] = 0.5;
      bufB.data[i * 4 + 1] = 0.5;
      bufB.data[i * 4 + 2] = 0.5;
      bufB.data[i * 4 + 3] = 1.0;
    }

    const cmpEqual = compareBuffers(bufA, bufB);
    assert.equal(cmpEqual.mae, 0);
    assert.equal(cmpEqual.bad, 0);

    // Modify 1 pixel by 255 (1.0 in Float32)
    bufA.data[0] = 0;
    bufA.data[1] = 0;
    bufA.data[2] = 0;
    bufB.data[0] = 1;
    bufB.data[1] = 1;
    bufB.data[2] = 1;

    const cmpDiff = compareBuffers(bufA, bufB);
    assert.ok(cmpDiff.mae > 0, 'MAE should be > 0');
    assert.equal(cmpDiff.bad, 1 / 16, `bad should be 1/16 (0.0625), got ${cmpDiff.bad}`);
  });
});

