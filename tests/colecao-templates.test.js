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
  const { readLock, entryProblems, sha256, licensesSection } = await import('../scripts/colecao/externos/fetch.js');
  const entries = await readLock();
  assert.ok(entries.length >= 8, 'ao menos 8 fotos');
  const lib = JSON.parse(await fs.readFile(libraryPath, 'utf8'));
  for (const entry of entries) {
    assert.deepEqual(entryProblems(entry), [], entry.id);
    assert.match(entry.sha256, /^[0-9a-f]{64}$/, `${entry.id}: SHA-256 do original`);
    const out = await fs.readFile(path.join(colecaoDir, 'fotos', `${entry.id}.webp`));
    assert.equal(sha256(out), entry.outputSha256, `${entry.id}: arquivo gravado confere com o lock`);
    const item = lib.items.find(i => i.id === entry.id);
    assert.equal(item?.category, 'Fotografias', `${entry.id} está na biblioteca`);
    assert.ok(['Retratos', 'Lugares', 'Mapas'].includes(item.subcategory));
  }
  const licencas = await fs.readFile(path.join(projectRoot, 'docs/LICENCAS.md'), 'utf8');
  for (const entry of entries) assert.ok(licencas.includes(`\`${entry.id}\``), `${entry.id} está em docs/LICENCAS.md`);
  assert.match(licensesSection(entries), /Material de terceiros \(CC0 e domínio público\)/);
  assert.deepEqual(entryProblems({ ...entries[0], license: 'CC-BY-NC-4.0' }).length > 0, true, 'licença NC é recusada');
  assert.equal(entryProblems({ ...entries[0], id: 'foto-solta' }).length > 0, true);
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
