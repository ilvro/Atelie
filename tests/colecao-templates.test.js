import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHandout } from '../src/domain/handouts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const colecaoDir = path.join(projectRoot, 'public/colecao');
const libraryPath = path.join(colecaoDir, 'library.json');

test('colecao-templates: todos os modelos existem, são válidos e cumprem as regras', async () => {
  const rawLib = await fs.readFile(libraryPath, 'utf8');
  const lib = JSON.parse(rawLib);
  const items = lib.items || [];

  const templates = items.filter(i => i.kind === 'template');
  assert.ok(templates.length >= 36, `A coleção deve conter ao menos 36 modelos (encontrados: ${templates.length})`);

  const templateMap = new Map(templates.map(t => [t.id, t]));

  for (const tpl of templates) {
    assert.ok(tpl.file, `Modelo ${tpl.id} deve ter propriedade "file"`);
    assert.ok(tpl.preview, `Modelo ${tpl.id} deve ter propriedade "preview"`);

    const filePath = path.join(colecaoDir, tpl.file);
    const previewPath = path.join(colecaoDir, tpl.preview);

    const fileStat = await fs.stat(filePath);
    assert.ok(fileStat.isFile(), `Arquivo do modelo deve existir: ${tpl.file}`);

    const previewStat = await fs.stat(previewPath);
    assert.ok(previewStat.isFile(), `Prévia do modelo deve existir: ${tpl.preview}`);

    const rawHandout = await fs.readFile(filePath, 'utf8');
    const handout = JSON.parse(rawHandout);

    // 1. validateHandout passes
    assert.doesNotThrow(() => validateHandout(handout), `validateHandout falhou para ${tpl.id}`);

    // 2. Contains >= 1 field
    assert.ok(Array.isArray(handout.fields) && handout.fields.length >= 1, `Modelo ${tpl.id} deve ter ao menos 1 campo`);
    assert.deepEqual(
      tpl.fields,
      handout.fields.map(f => f.label),
      `Campos no library.json devem coincidir com handout.fields para ${tpl.id}`
    );

    // 3. Only house assets (casa-) and fonts (casa-)
    for (const layer of handout.layers) {
      if (layer.kind === 'image') {
        assert.ok(!layer.image?.src?.upload, `Camada "${layer.name}" em ${tpl.id} usa upload, proibido`);
        if (layer.image?.src?.library) {
          assert.ok(
            layer.image.src.library.startsWith('casa-'),
            `Camada "${layer.name}" em ${tpl.id} usa biblioteca não-casa: ${layer.image.src.library}`
          );
        }
      }

      if (layer.kind === 'text') {
        const fontLib = layer.text?.font?.library;
        if (fontLib) {
          assert.ok(
            fontLib.startsWith('casa-'),
            `Fonte da camada "${layer.name}" em ${tpl.id} não pertence à coleção da casa: ${fontLib}`
          );
        }
      }
    }

    // 4. backTemplate cross-reference
    if (tpl.backTemplate) {
      assert.ok(
        templateMap.has(tpl.backTemplate),
        `backTemplate "${tpl.backTemplate}" do modelo ${tpl.id} deve existir no catálogo`
      );
      const backItem = templateMap.get(tpl.backTemplate);
      assert.equal(
        backItem.backTemplate,
        tpl.id,
        `backTemplate de ${backItem.id} deve apontar de volta para ${tpl.id}`
      );
    }
  }

  // Check specific requirements:
  // UV layer in diario-culto-uv
  const uvTemplate = templates.find(t => t.id === 'casa-tpl-diario-culto-uv');
  assert.ok(uvTemplate, 'Modelo casa-tpl-diario-culto-uv deve existir');
  const uvDoc = JSON.parse(await fs.readFile(path.join(colecaoDir, uvTemplate.file), 'utf8'));
  const uvLayer = uvDoc.layers.find(l => l.light === 'uv');
  assert.ok(uvLayer, 'casa-tpl-diario-culto-uv deve conter ao menos uma camada com light: "uv"');

  // Double-sided templates check
  const pairs = [
    ['casa-tpl-cartao-postal-frente', 'casa-tpl-cartao-postal-verso'],
    ['casa-tpl-carta-envelope-frente', 'casa-tpl-carta-envelope-verso'],
    ['casa-tpl-polaroide-frente', 'casa-tpl-polaroide-verso'],
  ];

  for (const [frenteId, versoId] of pairs) {
    const frente = templateMap.get(frenteId);
    const verso = templateMap.get(versoId);
    assert.ok(frente, `Modelo ${frenteId} deve existir`);
    assert.ok(verso, `Modelo ${versoId} deve existir`);
    assert.equal(frente.backTemplate, versoId, `${frenteId} deve ter backTemplate apontando para ${versoId}`);
    assert.equal(verso.backTemplate, frenteId, `${versoId} deve ter backTemplate apontando para ${frenteId}`);
  }
});


test('colecao-templates: nenhum modelo da casa tem foto vazia (a não ser allowEmpty) e as fotos ligadas existem', async () => {
  const lib = JSON.parse(await fs.readFile(libraryPath, 'utf8'));
  const ids = new Set(lib.items.map(i => i.id));
  const templates = lib.items.filter(i => i.kind === 'template');
  let linkedPhotos = 0;
  for (const tpl of templates) {
    const doc = JSON.parse(await fs.readFile(path.join(colecaoDir, tpl.file), 'utf8'));
    for (const layer of doc.layers) {
      if (layer.kind !== 'image') continue;
      const src = layer.image?.src;
      if (!src) {
        assert.ok(layer.allowEmpty === true, `${tpl.id}: a camada de imagem "${layer.name}" está vazia (src: null); ligue uma foto da coleção ou marque allowEmpty`);
        continue;
      }
      if (src.library) {
        assert.ok(ids.has(src.library), `${tpl.id}: "${layer.name}" aponta para ${src.library}, que não existe na biblioteca`);
        if (src.library.startsWith('casa-foto-')) linkedPhotos++;
      }
    }
  }
  assert.ok(linkedPhotos >= 8, `os 8 campos de foto usam fotos da coleção (encontrados: ${linkedPhotos})`);
});

test('colecao-externos: o lock registra origem, licença aceita e SHA-256 batendo com os arquivos gravados', async () => {
  const { readLock, entryProblems, sha256, licensesSection, kindOf } = await import('../scripts/colecao/externos/fetch.js');
  const entries = await readLock();
  assert.ok(entries.length >= 8, 'ao menos 8 entradas');
  const lib = JSON.parse(await fs.readFile(libraryPath, 'utf8'));
  for (const entry of entries) {
    assert.deepEqual(entryProblems(entry), [], entry.id);
    assert.match(entry.sha256, /^[0-9a-f]{64}$/, `${entry.id}: SHA-256 do original`);
    const out = await fs.readFile(path.join(colecaoDir, kindOf(entry).dir, `${entry.id}.webp`));
    assert.equal(sha256(out), entry.outputSha256, `${entry.id}: arquivo gravado confere com o lock`);
    const item = lib.items.find(i => i.id === entry.id);
    assert.equal(item?.category, kindOf(entry).category, `${entry.id} está na biblioteca`);
    if (!entry.kind) assert.ok(['Retratos', 'Lugares', 'Mapas'].includes(item.subcategory));
  }
  const licencas = await fs.readFile(path.join(projectRoot, 'docs/LICENCAS.md'), 'utf8');
  for (const entry of entries) assert.ok(licencas.includes(`\`${entry.id}\``), `${entry.id} está em docs/LICENCAS.md`);
  assert.match(licensesSection(entries), /Material de terceiros \(CC0 e domínio público\)/);
  assert.deepEqual(entryProblems({ ...entries[0], license: 'CC-BY-NC-4.0' }).length > 0, true, 'licença NC é recusada');
  assert.equal(entryProblems({ ...entries[0], id: 'foto-solta' }).length > 0, true);
});

test('colecao-externos: papéis, superfícies e microtexturas CC0 da C3 estão no lock com zip e arquivo de dentro', async () => {
  const { readLock, KINDS } = await import('../scripts/colecao/externos/fetch.js');
  const entries = await readLock();
  const by = kind => entries.filter(e => e.kind === kind);
  assert.ok(by('papel').length >= 10 && by('superficie').length >= 8 && by('micro').length >= 6);
  for (const e of entries.filter(e => e.kind)) {
    assert.ok(KINDS[e.kind], e.id);
    assert.match(e.sourceUrl, /\.zip$/, `${e.id}: ambientCG entrega .zip`);
    assert.match(e.zipMember, /_Color\.jpg$|_Opacity\.jpg$|_Roughness\.jpg$/, `${e.id}: mapa de dentro do zip`);
    assert.equal(e.license, 'CC0-1.0');
  }
});

test('colecao-externos: o tamanho da coleção continua dentro do orçamento de 60 MB', async () => {
  let total = 0;
  async function walk(dir) {
    for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) await walk(full); else total += (await fs.stat(full)).size;
    }
  }
  await walk(colecaoDir);
  assert.ok(total < 60 * 1024 * 1024, `public/colecao tem ${(total / 1048576).toFixed(1)} MB (limite 60 MB)`);
});

test('colecao-c2: o universo e o kit têm só recursos da coleção e a auditoria passa (fora do legado)', async () => {
  const { INSTITUICOES, FONT_ERAS, RETRATOS, fontFitsEra } = await import('../scripts/colecao/universo.js');
  const kit = await import('../scripts/colecao/kit.js');
  const { auditCollection } = await import('../scripts/colecao/audit.js');
  const lib = JSON.parse(await fs.readFile(libraryPath, 'utf8'));
  const ids = new Set(lib.items.map(i => i.id));

  assert.equal(Object.keys(INSTITUICOES).length, 13);
  for (const org of Object.values(INSTITUICOES)) {
    assert.ok(org.elenco.length >= 4 && org.elenco.length <= 6, `${org.id}: elenco de 4 a 6 pessoas`);
    for (const p of org.elenco) assert.ok(ids.has(p.retrato), `${org.id}: retrato ${p.retrato} existe na coleção`);
    for (const f of org.fontes) assert.ok(FONT_ERAS[f], `${org.id}: fonte ${f} está na tabela de épocas`);
  }
  assert.equal(fontFitsEra('Share Tech Mono', '1890'), false);
  assert.ok(Object.values(RETRATOS).flat().length >= 6);

  const demo = [
    kit.aging('antigo', { seed: 3 }), kit.stamp('casa-carimbo-pago', { x: 1, y: 1, seed: 2 }),
    kit.tape('topo', { x: 10, y: 10, width: 100, height: 100 }), kit.clip('topo', { x: 1, y: 1, width: 5, height: 5 }),
    kit.photo({ x: 0, y: 0, width: 9, height: 9 }, { default: 'casa-foto-retrato-rapaz-cdv' }),
  ].flat();
  for (const l of demo) if (l.image?.src?.library) assert.ok(ids.has(l.image.src.library), `kit usa recurso inexistente ${l.image.src.library}`);
  assert.deepEqual(kit.stamp('casa-carimbo-pago', { x: 0, y: 0, seed: 5 }), kit.stamp('casa-carimbo-pago', { x: 0, y: 0, seed: 5 }), 'carimbo é determinístico');
  assert.ok(Math.abs(kit.stamp('casa-carimbo-pago', { x: 0, y: 0, seed: 9 }).rotation) <= 4, 'inclinação do carimbo dentro de ±4°');
  assert.throws(() => kit.photo({ x: 0, y: 0, width: 1, height: 1 }, {}), /foto padrão/);

  const { erros } = await auditCollection();
  assert.deepEqual(erros.map(e => `${e.modelo}:${e.regra}`), [], 'auditoria sem erros fora do legado');
  for (const item of lib.items.filter(i => i.kind === 'template')) {
    assert.ok(item.era && item.tom && Array.isArray(item.tags), `${item.id}: manifesto com era, tom e tags`);
  }
});

test('colecao-c2: compare-private recusa gravar fora da pasta privada de comparação', async () => {
  const { assertPrivateOutput, saidaDir } = await import('../scripts/colecao/compare-private.js');
  assert.ok(assertPrivateOutput(path.join(saidaDir, 'x.png')).startsWith(saidaDir));
  for (const bad of [path.join(projectRoot, 'docs/referencias/x.png'), path.join(saidaDir, '../x.png'), path.join(projectRoot, 'public/colecao/x.png'), saidaDir]) {
    assert.throws(() => assertPrivateOutput(bad), /só grava/);
  }
});

test('colecao-c4: silhuetas são camadas cut válidas, determinísticas pela semente', async () => {
  const { silhouette, SILHOUETTES } = await import('../scripts/colecao/kit.js');
  const { cutError } = await import('../src/domain/cut.js');
  assert.equal(SILHOUETTES.length, 8);
  for (const kind of SILHOUETTES) {
    const a = silhouette(kind, { seed: 5 });
    assert.deepEqual(a, silhouette(kind, { seed: 5 }), `${kind}: mesma semente, mesmo corte`);
    assert.notDeepEqual(a.effect, silhouette(kind, { seed: 6 }).effect, `${kind}: outra semente, outro corte`);
    assert.equal(a.kind, 'effect');
    assert.equal(a.effect.type, 'cut');
    assert.equal(cutError(a.effect, 1240, 1754), null, `${kind}: corte válido`);
    assert.ok(a.effect.remove.length || a.effect.holes.length, `${kind}: remove ou queima algo`);
  }
  assert.throws(() => silhouette('inexistente'), /desconhecida/);
});

test('colecao-c4: receitas de envelhecimento só usam itens da casa, são determinísticas e o corte vai por último', async () => {
  const { aging, AGING_PRESETS } = await import('../scripts/colecao/kit.js');
  const lib = JSON.parse(await fs.readFile(libraryPath, 'utf8'));
  const ids = new Set(lib.items.map(i => i.id));
  assert.deepEqual(Object.keys(AGING_PRESETS).sort(), ['antigo', 'arquivo-morto', 'destruido', 'ensanguentado', 'molhado', 'novo', 'queimado', 'usado']);
  for (const preset of Object.keys(AGING_PRESETS)) {
    const layers = aging(preset, { seed: 7 });
    assert.deepEqual(layers, aging(preset, { seed: 7 }), `${preset}: determinístico`);
    assert.ok(layers.length >= 1);
    for (const l of layers) {
      if (l.image?.src?.library) assert.ok(ids.has(l.image.src.library) && l.image.src.library.startsWith('casa-'), `${preset}: ${l.image.src.library} existe na coleção`);
      assert.ok(l.name, `${preset}: camada com nome`);
    }
    const cuts = layers.map((l, i) => (l.effect?.type === 'cut' ? i : -1)).filter(i => i >= 0);
    for (const i of cuts) assert.equal(i, layers.length - 1, `${preset}: o corte é a última camada`);
  }
  const light = aging('usado', { seed: 1, intensity: 0.5 });
  const strong = aging('usado', { seed: 1, intensity: 1 });
  assert.ok(light[0].opacity < strong[0].opacity, 'intensity escala a opacidade');
});

test('colecao-c4: papéis fotográficos (25 receitas × 3 idades) e papéis novos estão na biblioteca', async () => {
  const recipes = JSON.parse(await fs.readFile(path.join(projectRoot, 'scripts/colecao/papers.json'), 'utf8'));
  const lib = JSON.parse(await fs.readFile(libraryPath, 'utf8'));
  assert.equal(recipes.length, 25);
  for (const slug of ['planta-azul', 'papel-de-arroz', 'papelao', 'papel-de-fax', 'formulario-continuo', 'almaco-de-prova', 'papel-de-embrulho', 'papel-timbrado-bancario', 'papel-de-recibo']) {
    for (const age of ['novo', 'usado', 'antigo']) assert.ok(lib.items.some(i => i.id === `casa-papel-${slug}-${age}`), `${slug} ${age}`);
  }
  for (const r of recipes) {
    assert.ok(r.scan, `${r.slug}: receita ligada a um escaneamento`);
    assert.ok(lib.items.some(i => i.id === r.scan), `${r.slug}: escaneamento ${r.scan} existe`);
  }
  assert.ok(lib.items.some(i => i.id.startsWith('casa-scan-')), 'a reconstrução dos papéis não apagou o material de terceiros');
});

test('colecao-c4: a montagem de modelos carrega os campos de um corte', async () => {
  const { buildHandoutFromSpec } = await import('../scripts/colecao/templates.js');
  const { silhouette } = await import('../scripts/colecao/kit.js');
  const doc = buildHandoutFromSpec({ slug: 'x', name: 'X', category: 'Teste', page: { width: 100, height: 100 }, layers: [silhouette('canto-arrancado', { seed: 2, page: { width: 100, height: 100 } })], fields: [] });
  assert.equal(doc.layers[0].effect.type, 'cut');
  assert.ok(doc.layers[0].effect.remove.length > 0);
  assert.equal(doc.layers[0].effect.edge, 'rasgado');
});
