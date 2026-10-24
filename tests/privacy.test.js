import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { defaultExpansionsDir, expansionDir, collectionDir, projectDir } from '../server/paths.js';

test('privacy and boundaries between public and private collections', async () => {
  const gitignore = await readFile(path.join(projectDir, '.gitignore'), 'utf8');
  assert.match(gitignore, /^data-private\//m);

  assert.ok(defaultExpansionsDir({}).endsWith(path.join('data-private', 'expansoes')));
  assert.equal(defaultExpansionsDir({ ATELIE_EXPANSIONS_DIR: '/custom/expansions' }), path.resolve('/custom/expansions'));
  assert.ok(expansionDir('x', {}).endsWith(path.join('data-private', 'expansoes', 'x')));

  assert.ok(collectionDir.endsWith(path.join('public', 'colecao')));

  const viteConfig = await readFile(path.join(projectDir, 'vite.config.js'), 'utf8');
  assert.doesNotMatch(viteConfig, /data-private/);

  const srcDir = path.join(projectDir, 'src');
  async function scan(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (/\.(js|ts|css|html)$/.test(entry.name)) {
        const content = await readFile(fullPath, 'utf8');
        assert.doesNotMatch(content, /from\s+['"]ag-psd['"]/);
        assert.doesNotMatch(content, /from\s+['"]sharp['"]/);
        assert.doesNotMatch(content, /from\s+['"]fflate['"]/);
      }
    }
  }
  await scan(srcDir);
});

