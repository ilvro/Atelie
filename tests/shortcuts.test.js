import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHORTCUTS, getShortcutsByCategory } from '../src/ui/shortcuts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

test('shortcuts: estrutura e propriedades obrigatórias', () => {
  assert.ok(Array.isArray(SHORTCUTS) && SHORTCUTS.length > 0, 'SHORTCUTS deve ser um array não vazio');

  const ids = new Set();
  const validCategories = ['Navegação', 'Documento', 'Edição', 'Leitura'];

  for (const s of SHORTCUTS) {
    assert.ok(s.id && typeof s.id === 'string', `atalho sem id válido: ${JSON.stringify(s)}`);
    assert.ok(!ids.has(s.id), `id de atalho duplicado: "${s.id}"`);
    ids.add(s.id);

    assert.ok(s.key && typeof s.key === 'string', `atalho ${s.id} sem key`);
    assert.ok(s.label && typeof s.label === 'string', `atalho ${s.id} sem label`);
    assert.ok(s.description && typeof s.description === 'string', `atalho ${s.id} sem description`);
    assert.ok(
      validCategories.includes(s.category),
      `categoria inválida "${s.category}" no atalho ${s.id}`
    );
    assert.ok(
      Array.isArray(s.handledIn) && s.handledIn.length > 0,
      `atalho ${s.id} deve declarar ao menos um arquivo em handledIn`
    );
  }
});

test('shortcuts: cada atalho listado aparece num manipulador de teclado nos arquivos indicados', async () => {
  const fileCache = new Map();

  async function getFileContent(relPath) {
    if (fileCache.has(relPath)) return fileCache.get(relPath);
    const fullPath = path.join(projectRoot, relPath);
    const content = await fs.readFile(fullPath, 'utf8');
    fileCache.set(relPath, content);
    return content;
  }

  for (const shortcut of SHORTCUTS) {
    for (const fileRelPath of shortcut.handledIn) {
      const content = await getFileContent(fileRelPath);
      assert.ok(content, `arquivo ${fileRelPath} vazio ou inacessível`);

      // Verifica se algum token do atalho é verificado no manipulador de teclado do arquivo
      const tokens = shortcut.tokens || [shortcut.key];
      const foundToken = tokens.some(token => content.includes(token));

      assert.ok(
        foundToken,
        `atalho "${shortcut.id}" (${shortcut.key}) não encontrado no arquivo ${fileRelPath}. Tokens procurados: ${JSON.stringify(tokens)}`
      );
    }
  }
});

test('shortcuts: todos os botões do trilho com data-key estão registrados', async () => {
  const shellContent = await fs.readFile(path.join(projectRoot, 'src/ui/shell.js'), 'utf8');
  const dataKeyMatches = Array.from(shellContent.matchAll(/data-key="([^"]+)"/g)).map(m => m[1]);

  assert.ok(dataKeyMatches.length > 0, 'nenhum data-key encontrado em src/ui/shell.js');

  const registeredKeys = new Set(SHORTCUTS.map(s => s.key.toUpperCase()));

  for (const key of dataKeyMatches) {
    assert.ok(
      registeredKeys.has(key.toUpperCase()),
      `tecla do trilho "${key}" não está registrada em src/ui/shortcuts.js`
    );
  }
});

test('shortcuts: agrupamento por categoria funciona corretamente', () => {
  const grouped = getShortcutsByCategory();
  assert.ok(grouped['Navegação']?.length > 0, 'deve haver atalhos de Navegação');
  assert.ok(grouped['Documento']?.length > 0, 'deve haver atalhos de Documento');
  assert.ok(grouped['Edição']?.length > 0, 'deve haver atalhos de Edição');
  assert.ok(grouped['Leitura']?.length > 0, 'deve haver atalhos de Leitura');

  const total = Object.values(grouped).reduce((sum, list) => sum + list.length, 0);
  assert.equal(total, SHORTCUTS.length, 'total de atalhos agrupados deve ser igual a SHORTCUTS.length');
});

