import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { loadRecipes, generatePaper } from '../scripts/colecao/papers.js';

test('colecao-papers: cada receita de papers.json é válida', async () => {
  const recipes = await loadRecipes();
  assert.equal(recipes.length, 16, 'deve haver exatamente 16 receitas de papel');

  const slugs = new Set();
  for (const r of recipes) {
    assert.ok(r.slug && typeof r.slug === 'string', `receita sem slug válido: ${JSON.stringify(r)}`);
    assert.ok(!slugs.has(r.slug), `slug duplicado: ${r.slug}`);
    slugs.add(r.slug);

    assert.ok(r.name && typeof r.name === 'string', `receita ${r.slug} sem nome`);
    assert.ok(r.width >= 1000 && r.height >= 1000, `dimensões inválidas em ${r.slug}`);
    assert.ok(typeof r.seed === 'number', `seed inválida em ${r.slug}`);
    assert.ok(/^#[0-9a-fA-F]{6}$/.test(r.base), `cor base inválida em ${r.slug}: ${r.base}`);
    assert.ok(Array.isArray(r.tags) && r.tags.length > 0, `tags vazias em ${r.slug}`);
  }
});

test('colecao-papers: gerar um papel pequeno (256 px) duas vezes dá o mesmo hash', async () => {
  const recipes = await loadRecipes();
  const recipe = recipes[0]; // oficio-branco

  const r1 = generatePaper(recipe, 'novo', { width: 181, height: 256 });
  const r2 = generatePaper(recipe, 'novo', { width: 181, height: 256 });

  const hash1 = crypto.createHash('sha256').update(r1.toBuffer()).digest('hex');
  const hash2 = crypto.createHash('sha256').update(r2.toBuffer()).digest('hex');

  assert.equal(hash1, hash2, 'mesma receita e semente devem produzir o mesmo hash');
});

test('colecao-papers: papel antigo é mais amarelo e mais escuro nas bordas que o novo', async () => {
  const recipes = await loadRecipes();
  const recipe = recipes.find(r => r.slug === 'papel-jornal') || recipes[0];

  const w = 181;
  const h = 256;
  const rNovo = generatePaper(recipe, 'novo', { width: w, height: h });
  const rAntigo = generatePaper(recipe, 'antigo', { width: w, height: h });

  // Compute average center color (center 40x40 box)
  let novoCenterR = 0, novoCenterG = 0, novoCenterB = 0;
  let antigoCenterR = 0, antigoCenterG = 0, antigoCenterB = 0;
  let centerCount = 0;

  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  for (let dy = -20; dy <= 20; dy++) {
    for (let dx = -20; dx <= 20; dx++) {
      const pN = rNovo.get(cx + dx, cy + dy);
      const pA = rAntigo.get(cx + dx, cy + dy);
      novoCenterR += pN[0];
      novoCenterG += pN[1];
      novoCenterB += pN[2];
      antigoCenterR += pA[0];
      antigoCenterG += pA[1];
      antigoCenterB += pA[2];
      centerCount++;
    }
  }

  novoCenterR /= centerCount;
  novoCenterG /= centerCount;
  novoCenterB /= centerCount;
  antigoCenterR /= centerCount;
  antigoCenterG /= centerCount;
  antigoCenterB /= centerCount;

  // Yellowness metric: (R + G) / 2 - B
  const yellowNovo = (novoCenterR + novoCenterG) / 2 - novoCenterB;
  const yellowAntigo = (antigoCenterR + antigoCenterG) / 2 - antigoCenterB;

  assert.ok(
    yellowAntigo > yellowNovo,
    `papel antigo deve ser mais amarelo no centro: antigo=${yellowAntigo.toFixed(4)}, novo=${yellowNovo.toFixed(4)}`
  );

  // Compute average edge color (outer 6 px border)
  let novoEdgeLum = 0;
  let antigoEdgeLum = 0;
  let edgeCount = 0;

  for (let y = 10; y < h - 10; y++) {
    for (let x of [4, 5, w - 5, w - 6]) {
      const pN = rNovo.get(x, y);
      const pA = rAntigo.get(x, y);
      novoEdgeLum += (pN[0] + pN[1] + pN[2]) / 3;
      antigoEdgeLum += (pA[0] + pA[1] + pA[2]) / 3;
      edgeCount++;
    }
  }

  novoEdgeLum /= edgeCount;
  antigoEdgeLum /= edgeCount;

  assert.ok(
    antigoEdgeLum < novoEdgeLum,
    `papel antigo deve ser mais escuro nas bordas: antigo=${antigoEdgeLum.toFixed(4)}, novo=${novoEdgeLum.toFixed(4)}`
  );
});

