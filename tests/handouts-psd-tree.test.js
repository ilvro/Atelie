import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { cornersToAffine, composeAffine, applyAffine, textBoxInDocument } from '../scripts/library/lib/psd-geometry.js';
import { normalizeTree, textNodes, variantGroups, looksLikeUv, PSD_BLENDS } from '../scripts/library/lib/psd-tree.js';

describe('Handouts PSD Tree & Geometry (Etapa 23)', () => {
  it('1. Grupo pass through com um pixel multiply opacidade .5, fillOpacity .5, clipping: true', () => {
    const rawPsd = {
      width: 1000,
      height: 800,
      children: [
        {
          name: 'Com Rasgo',
          blendMode: 'pass through',
          opacity: 1,
          children: [
            {
              name: 'Camada Pixel',
              blendMode: 'multiply',
              opacity: 0.5,
              fillOpacity: 0.5,
              clipping: true,
            },
          ],
        },
      ],
    };

    const tree = normalizeTree(rawPsd);
    assert.equal(tree.width, 1000);
    assert.equal(tree.height, 800);
    assert.equal(tree.nodes.length, 1);

    const groupNode = tree.nodes[0];
    assert.equal(groupNode.kind, 'group');
    assert.equal(groupNode.blend, 'pass-through');
    assert.equal(groupNode.opacity, 1);
    assert.equal(groupNode.path, '');
    assert.equal(groupNode.children.length, 1);

    const pixelNode = groupNode.children[0];
    assert.equal(pixelNode.kind, 'pixel');
    assert.equal(pixelNode.blend, 'multiply');
    assert.equal(pixelNode.opacity, 0.25);
    assert.equal(pixelNode.clipping, true);
    assert.equal(pixelNode.path, 'Com Rasgo');
  });

  it('2. Mesclagem "vivid light" → blend "unsupported:vivid light" e aviso', () => {
    const rawPsd = {
      width: 500,
      height: 500,
      children: [
        {
          name: 'Camada Misteriosa',
          blendMode: 'vivid light',
          opacity: 1,
        },
      ],
    };

    const tree = normalizeTree(rawPsd);
    const node = tree.nodes[0];
    assert.equal(node.blend, 'unsupported:vivid light');
    assert.equal(tree.warnings.length, 1);
    assert.match(tree.warnings[0], /sem equivalente.*vivid light/i);
  });

  it('3. Texto box com matrix [1,0,0,1,100,200] e boxBounds [0,0,300,50] → x 100, y 200, largura 300, cor #000000', () => {
    const rawPsd = {
      width: 800,
      height: 600,
      children: [
        {
          name: 'Titulo Principal',
          text: {
            text: 'Relatório Policial',
            shapeType: 'box',
            transform: [1, 0, 0, 1, 100, 200],
            boxBounds: [0, 0, 300, 50],
            style: {
              fontSize: 18,
              font: { name: 'SpecialElite-Regular' },
              // cor ausente
            },
          },
        },
      ],
    };

    const tree = normalizeTree(rawPsd);
    const texts = textNodes(tree);
    assert.equal(texts.length, 1);

    const t = texts[0];
    assert.equal(t.x, 100);
    assert.equal(t.y, 200);
    assert.equal(t.width, 300);
    assert.equal(t.largura, 300);
    assert.equal(t.color, '#000000');
    assert.equal(t.cor, '#000000');
    assert.equal(t.content, 'Relatório Policial');
    assert.equal(t.postscript, 'SpecialElite-Regular');
  });

  it('4. Objeto inteligente escalado 2x e deslocado contendo texto em (5,5) tamanho 10 → caixa em (20,30) e scale 2', () => {
    const innerPsb = {
      width: 100,
      height: 50,
      children: [
        {
          name: 'Texto Interno',
          text: {
            text: 'Segredo',
            shapeType: 'box',
            transform: [1, 0, 0, 1, 5, 5],
            boxBounds: [0, 0, 40, 15],
            style: {
              fontSize: 10,
            },
          },
        },
      ],
    };

    const rawPsd = {
      width: 500,
      height: 400,
      children: [
        {
          name: 'Smart Object Layer',
          placedLayer: {
            id: 'smart-doc-1',
            transform: [10, 20, 210, 20, 210, 120, 10, 120], // 100x50 scaled 2x to 200x100, translated to (10, 20)
            width: 100,
            height: 50,
          },
        },
      ],
    };

    const linked = (id) => (id === 'smart-doc-1' ? innerPsb : null);
    const tree = normalizeTree(rawPsd, { linked });
    const texts = textNodes(tree);

    assert.equal(texts.length, 1);
    const t = texts[0];
    assert.equal(t.x, 20);
    assert.equal(t.y, 30);
    assert.equal(t.scale, 2);
    assert.equal(t.box.x, 20);
    assert.equal(t.box.y, 30);
    assert.equal(t.box.scale, 2);
  });

  it('5. Cantos não paralelos → { perspective: true }', () => {
    // Quadrilateral where opposite edges are not parallel
    const distortedCorners = [10, 20, 200, 10, 220, 150, 5, 120];
    const affine = cornersToAffine(distortedCorners, 100, 100);
    assert.deepEqual(affine, { perspective: true });
  });

  it('6. variantGroups: dois grupos irmãos, um oculto → uma variante com os dois nomes', () => {
    const rawPsd = {
      width: 800,
      height: 600,
      children: [
        {
          name: 'Com Sangue',
          hidden: false,
          children: [{ name: 'Layer 1' }],
        },
        {
          name: 'Sem Sangue',
          hidden: true,
          children: [{ name: 'Layer 2' }],
        },
      ],
    };

    const tree = normalizeTree(rawPsd);
    const variants = variantGroups(tree);
    assert.equal(variants.length, 1);
    assert.deepEqual(variants[0].names, ['Com Sangue', 'Sem Sangue']);
    assert.equal(variants[0].visible, 'Com Sangue');
  });

  it('7. looksLikeUv("Efeito de UV") e looksLikeUv("Luz negra") são verdadeiros; "Uva" é falso', () => {
    assert.equal(looksLikeUv('Efeito de UV'), true);
    assert.equal(looksLikeUv('Luz negra'), true);
    assert.equal(looksLikeUv('Luz Negra'), true);
    assert.equal(looksLikeUv({ name: 'Efeito de UV' }), true);
    assert.equal(looksLikeUv({ name: 'Luz negra' }), true);

    assert.equal(looksLikeUv('Uva'), false);
    assert.equal(looksLikeUv('chuva'), false);
    assert.equal(looksLikeUv({ name: 'Uva' }), false);
    assert.equal(looksLikeUv(''), false);
    assert.equal(looksLikeUv(null), false);
  });
});

