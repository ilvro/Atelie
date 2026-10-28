import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('reading e2e: a cut sheet casts its shadow by its outline, a plain one keeps the box shadow', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-reading-cut-'));
  const app = await createApp({ dataDir, distDir: path.join(projectDir, 'dist') });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  t.after(async () => { await browser.close(); await new Promise(r => server.close(r)); await rm(dataDir, { recursive: true, force: true }); });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  const sheetInfo = async url => {
    await page.goto(url);
    await page.waitForFunction(() => !!window.__atelie?.editor?.state && !!window.__atelie?.reading);
    await page.waitForTimeout(600);
    await page.keyboard.press('p');
    await page.waitForSelector('#at-reader', { state: 'visible' });
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => {
      const sheet = document.querySelector('.reader-sheet');
      const canvas = document.querySelector('.reader-face.is-front .reader-canvas');
      return { cut: sheet.classList.contains('has-cut'), boxShadow: getComputedStyle(sheet).boxShadow, filter: getComputedStyle(canvas).filter };
    });
    await page.keyboard.press('Escape');
    return info;
  };

  const cut = await sheetInfo(`${baseUrl}/?diagnostics&template=casa-tpl-bilhete-caderno-rasgado`);
  assert.equal(cut.cut, true, 'the torn note is a cut sheet');
  assert.equal(cut.boxShadow, 'none', 'no box shadow around the rectangle');
  assert.match(cut.filter, /drop-shadow/, 'the shadow follows the outline');

  const plain = await sheetInfo(`${baseUrl}/?diagnostics&template=casa-tpl-recibo`);
  assert.equal(plain.cut, false);
  assert.notEqual(plain.boxShadow, 'none', 'the plain sheet keeps its box shadow');
  assert.deepEqual(errors, []);
});
