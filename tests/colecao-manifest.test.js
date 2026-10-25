import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const colecaoDir = path.join(projectRoot, 'public/colecao');
const manifestPath = path.join(colecaoDir, 'library.json');

test('colecao-manifest: validação estrutural e integridade do acervo', async () => {
  const raw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);

  assert.equal(manifest.schema, 1);
  assert.ok(manifest.generatedAt, 'manifest deve ter generatedAt');
  assert.ok(Array.isArray(manifest.items) && manifest.items.length >= 101, 'deve conter pelo menos 101 itens');

  const citedFiles = new Set();

  for (const item of manifest.items) {
    // 1. Prefixo casa-
    assert.ok(item.id.startsWith('casa-'), `item com id fora do prefixo casa-: ${item.id}`);

    // 2. Licença
    assert.ok(item.license && typeof item.license === 'string', `item ${item.id} sem licença`);

    // 3. Arquivo principal
    assert.ok(item.file, `item ${item.id} sem file`);
    const fullFilePath = path.join(colecaoDir, item.file);
    try {
      const st = await fs.stat(fullFilePath);
      assert.ok(st.isFile() && st.size > 0, `arquivo vazio ou ausente: ${item.file}`);
      citedFiles.add(path.normalize(item.file));
    } catch {
      assert.fail(`arquivo citado não existe: ${item.file} (item ${item.id})`);
    }

    // 4. Prévia
    if (item.preview) {
      const fullPrevPath = path.join(colecaoDir, item.preview);
      try {
        const st = await fs.stat(fullPrevPath);
        assert.ok(st.isFile() && st.size > 0, `prévia vazia ou ausente: ${item.preview}`);
        citedFiles.add(path.normalize(item.preview));
      } catch {
        assert.fail(`prévia citada não existe: ${item.preview} (item ${item.id})`);
      }
    }
  }

  // 5. Todo arquivo na pasta (exceto library.json, README.md, licenças) deve estar no manifesto
  const ignoredFiles = new Set(['library.json', 'README.md', 'LICENSE', 'LICENSE.txt', 'LICENCA.md', 'LICENCAS.md', 'OFL.txt']);

  async function checkDir(dir, relPath = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const subRel = relPath ? `${relPath}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        await checkDir(path.join(dir, ent.name), subRel);
      } else {
        if (!ignoredFiles.has(ent.name) && !ent.name.startsWith('.')) {
          const norm = path.normalize(subRel);
          assert.ok(
            citedFiles.has(norm),
            `arquivo em public/colecao/ não citado no manifesto: ${norm}`
          );
        }
      }
    }
  }

  await checkDir(colecaoDir);
});

