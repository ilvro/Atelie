import test from 'node:test';
import assert from 'node:assert/strict';

import * as stamps from '../scripts/colecao/vectors/stamps.js';
import * as seals from '../scripts/colecao/vectors/seals.js';
import * as fasteners from '../scripts/colecao/vectors/fasteners.js';
import * as tape from '../scripts/colecao/vectors/tape.js';
import * as labels from '../scripts/colecao/vectors/labels.js';
import * as waxSeals from '../scripts/colecao/vectors/wax-seals.js';
import * as frames from '../scripts/colecao/vectors/frames.js';
import * as ornaments from '../scripts/colecao/vectors/ornaments.js';
import * as emblems from '../scripts/colecao/vectors/emblems.js';
import * as symbols from '../scripts/colecao/vectors/symbols.js';
import * as marks from '../scripts/colecao/vectors/marks.js';

const MODULES = [
  { name: 'stamps', mod: stamps, minCount: 24 },
  { name: 'seals', mod: seals, minCount: 8 },
  { name: 'fasteners', mod: fasteners, minCount: 10 },
  { name: 'tape', mod: tape, minCount: 11 },
  { name: 'labels', mod: labels, minCount: 8 },
  { name: 'waxSeals', mod: waxSeals, minCount: 8 },
  { name: 'frames', mod: frames, minCount: 13 },
  { name: 'ornaments', mod: ornaments, minCount: 14 },
  { name: 'emblems', mod: emblems, minCount: 6 },
  { name: 'symbols', mod: symbols, minCount: 18 },
  { name: 'marks', mod: marks, minCount: 19 },
];

test('colecao-vectors: módulos exportam items() com itens válidos e seguros', () => {
  const seenIds = new Set();
  let grandTotal = 0;

  for (const { name, mod, minCount } of MODULES) {
    assert.equal(typeof mod.items, 'function', `módulo ${name} deve exportar items()`);
    const items = mod.items();
    assert.ok(Array.isArray(items), `items() em ${name} deve retornar um array`);
    assert.ok(
      items.length >= minCount,
      `módulo ${name} deve ter pelo menos ${minCount} itens, retornou ${items.length}`
    );

    for (const item of items) {
      grandTotal++;

      // 1. ID com prefixo casa- e único
      assert.ok(item.id, `item em ${name} sem id`);
      assert.ok(
        item.id.startsWith('casa-'),
        `item ${item.id} deve ter prefixo "casa-"`
      );
      assert.ok(
        !seenIds.has(item.id),
        `id duplicado encontrado: ${item.id}`
      );
      seenIds.add(item.id);

      // 2. Metadados básicos
      assert.ok(item.name && typeof item.name === 'string', `item ${item.id} sem name`);
      assert.ok(item.category && typeof item.category === 'string', `item ${item.id} sem category`);
      assert.ok(Array.isArray(item.tags) && item.tags.length > 0, `item ${item.id} sem tags`);

      // 3. SVG estruturado e válido
      assert.ok(typeof item.svg === 'string', `item ${item.id} deve ter svg como string`);
      const svg = item.svg.trim();
      assert.ok(svg.startsWith('<svg'), `item ${item.id} deve começar com <svg`);
      assert.ok(svg.endsWith('</svg>'), `item ${item.id} deve terminar com </svg>`);

      // 4. Atributos obrigatórios no <svg>
      assert.ok(
        svg.includes('xmlns="http://www.w3.org/2000/svg"'),
        `item ${item.id} deve conter xmlns="http://www.w3.org/2000/svg"`
      );
      assert.ok(svg.includes('viewBox='), `item ${item.id} deve conter viewBox`);
      assert.ok(svg.includes('width='), `item ${item.id} deve conter width`);
      assert.ok(svg.includes('height='), `item ${item.id} deve conter height`);

      // 5. Sem tags <text> nem fontes
      assert.ok(
        !/<text[\s>]/i.test(svg),
        `item ${item.id} NÃO pode conter tags <text> (letras devem ser contornos <path>)`
      );

      // 6. Sem URLs externas exceto o próprio namespace SVG
      const cleanSvg = svg.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '');
      assert.ok(
        !/https?:/i.test(cleanSvg),
        `item ${item.id} contém URL externa http:/https: não permitida`
      );

      // 7. Segurança: sem scripts, manipuladores de evento ou foreignObject
      assert.ok(!/<script[\s>]/i.test(svg), `item ${item.id} contém <script>`);
      assert.ok(!/\son[a-z]+=/i.test(svg), `item ${item.id} contém atributo on...=`);
      assert.ok(!/<foreignObject[\s>]/i.test(svg), `item ${item.id} contém <foreignObject>`);
    }
  }

  assert.ok(grandTotal >= 135, `total de itens (${grandTotal}) deve ser >= 135`);
});

