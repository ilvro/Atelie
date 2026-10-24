import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('shell opens with title and app label without console errors', { timeout: 60_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-shell-'));
  const distDir = path.join(projectDir, 'dist');
  const app = await createApp({ dataDir, distDir });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  t.after(async () => {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.setDefaultTimeout(15_000);
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`http://127.0.0.1:${server.address().port}/`);

  const title = await page.title();
  assert.equal(title, 'Ateliê de documentos');

  const content = await page.textContent('body');
  assert.match(content, /Ateliê/);

  assert.deepEqual(errors, []);
});

