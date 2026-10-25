import test from 'node:test';
import assert from 'node:assert/strict';
import { stat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distPagesDir = path.join(rootDir, 'dist-pages');

async function getFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      await getFiles(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

test('dist-pages: não contém dados privados, respeita limite de tamanho e tem coleção íntegra', async () => {
  const distStat = await stat(distPagesDir).catch(() => null);
  assert.ok(distStat && distStat.isDirectory(), 'dist-pages/ deve existir. Execute "npm run build:pages" antes do teste.');

  const allFiles = await getFiles(distPagesDir);
  assert.ok(allFiles.length > 0, 'dist-pages/ deve conter arquivos');

  let totalBytes = 0;
  for (const file of allFiles) {
    const rel = path.relative(distPagesDir, file);
    assert.ok(!rel.includes('data-private'), `Arquivo proibido encontrado em dist-pages: ${rel}`);
    assert.ok(!rel.includes('expansoes'), `Pasta privada encontrada em dist-pages: ${rel}`);
    const st = await stat(file);
    totalBytes += st.size;
  }

  const maxBytes = 80 * 1024 * 1024; // 80 MB
  assert.ok(
    totalBytes < maxBytes,
    `Tamanho total do build Pages (${(totalBytes / (1024 * 1024)).toFixed(2)} MB) deve ser menor que 80 MB`
  );

  // Validação da coleção pública
  const libPath = path.join(distPagesDir, 'colecao', 'library.json');
  const libRaw = await readFile(libPath, 'utf8');
  const manifest = JSON.parse(libRaw);

  assert.ok(Array.isArray(manifest.items), 'library.json deve conter lista de items');
  assert.ok(manifest.items.length > 0, 'library.json deve conter itens da coleção');

  for (const item of manifest.items) {
    assert.ok(
      !item.id.startsWith('ac-'),
      `Item com ID privado "ac-" encontrado no manifesto do Pages: ${item.id}`
    );
    if (item.file) {
      const fullItemPath = path.join(distPagesDir, 'colecao', item.file);
      const exists = await stat(fullItemPath).catch(() => null);
      assert.ok(exists, `Arquivo referenciado pelo item ${item.id} não existe: ${item.file}`);
    }
  }
});

