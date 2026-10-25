import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateLicensesDoc } from '../scripts/licenses.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const docPath = path.join(projectRoot, 'docs/LICENCAS.md');
const libraryJsonPath = path.join(projectRoot, 'public/colecao/library.json');

test('licenses: docs/LICENCAS.md está atualizado (gerar de novo não muda o arquivo)', async () => {
  const diskContent = await fs.readFile(docPath, 'utf8');
  const generated = generateLicensesDoc();
  assert.equal(
    diskContent,
    generated,
    'docs/LICENCAS.md está desatualizado. Execute `node scripts/licenses.js` para atualizar.'
  );
});

test('licenses: toda fonte tem licença válida e conhecida', async () => {
  const raw = await fs.readFile(libraryJsonPath, 'utf8');
  const library = JSON.parse(raw);
  const fontItems = library.items.filter(i => i.kind === 'font');

  assert.ok(fontItems.length >= 26, `deve haver ao menos 26 fontes na coleção (encontrados: ${fontItems.length})`);

  for (const font of fontItems) {
    assert.ok(font.family, `fonte ${font.id} sem família`);
    assert.ok(font.license, `fonte ${font.id} sem licença`);
    assert.ok(
      ['OFL-1.1', 'Apache-2.0'].includes(font.license),
      `licença desconhecida em ${font.id}: "${font.license}"`
    );
  }
});

test('licenses: todo item da coleção possui propriedade license definida', async () => {
  const raw = await fs.readFile(libraryJsonPath, 'utf8');
  const library = JSON.parse(raw);
  assert.ok(Array.isArray(library.items) && library.items.length > 0, 'library.items deve ser um array não vazio');

  for (const item of library.items) {
    assert.ok(
      item.license && typeof item.license === 'string' && item.license.trim().length > 0,
      `item da coleção ${item.id} (${item.name}) sem licença definida`
    );
  }
});

