import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('library and templates e2e: wrapping filters, stable scroll, real-size drag ghost, recents', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-libtpl-e2e-'));
  const app = await createApp({ dataDir, distDir: path.join(projectDir, 'dist') });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  t.after(async () => {
    await browser.close();
    await new Promise(r => server.close(r));
    await rm(dataDir, { recursive: true, force: true });
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);

  const overflowing = () => page.evaluate(() =>
    [...document.querySelectorAll('.filter-bar, .filter-chips, .filter-group, .library-top-bar, .templates-filter-slot')]
      .filter(el => el.scrollWidth > el.clientWidth + 1)
      .map(el => el.className));

  // Templates: filter chips wrap, never scroll sideways, and categories show counts
  await page.click('.rail-btn[data-action="templates"]');
  await page.waitForSelector('.templates-filter-slot .filter-chip');
  assert.deepEqual(await overflowing(), [], 'no filter container scrolls horizontally (templates)');
  const catLabel = await page.textContent('.filter-chip[data-filter-group="category"]:not([data-filter-value="all"])');
  assert.match(catLabel, /\(\d+\)/, 'category chips carry a count');
  await page.click('.filter-chip[data-filter-group="category"]:not([data-filter-value="all"])');
  assert.ok(await page.locator('.filter-clear-btn').count() > 0, 'active filter line offers "Limpar filtros"');
  await page.click('.filter-clear-btn');

  // Library: elements and fonts both have a category filter with counts
  await page.click('.rail-btn[data-action="library"]');
  await page.waitForSelector('.library-drawer-inner .filter-chip');
  assert.deepEqual(await overflowing(), [], 'no filter container scrolls horizontally (library)');
  await page.click('.library-type-chips [data-type="fonts"]');
  await page.waitForSelector('.library-font-card');
  const fontCats = await page.locator('.filter-chip[data-filter-group="category"]').allTextContents();
  assert.ok(fontCats.length > 3, 'fonts have category filter chips');
  await page.click('.library-type-chips [data-type="elements"]');
  await page.waitForSelector('.library-item-card');

  // Collapsing a group does not throw the scroll to the top
  const scroll = await page.evaluate(async () => {
    const sc = document.querySelector('.library-content-scroll');
    const headers = [...document.querySelectorAll('.library-category-header[data-toggle-category]')];
    const target = headers[Math.min(2, headers.length - 1)];
    sc.scrollTop = target.offsetTop;
    const before = target.getBoundingClientRect().top;
    target.click();
    await new Promise(r => setTimeout(r, 50));
    const again = document.querySelector(`[data-toggle-category="${CSS.escape(target.dataset.toggleCategory)}"]`);
    return { before, after: again.getBoundingClientRect().top, scrollTop: document.querySelector('.library-content-scroll').scrollTop };
  });
  assert.ok(scroll.scrollTop > 0, 'scroll stays down after collapsing');
  assert.ok(Math.abs(scroll.before - scroll.after) < 2, 'the clicked header does not move');

  // Drag ghost: a real <img> at the real drop size, fully opaque, attached to body
  await page.evaluate(() => window.__atelie.editor.stage.zoom(1));
  await page.click('.filter-chip[data-filter-group="category"][data-filter-value="Carimbos"]');
  const card = page.locator('.library-item-card[data-category="Carimbos"]').first();
  await card.scrollIntoViewIfNeeded();
  const ghost = await page.evaluate(async () => {
    const card = document.querySelector('.library-item-card[data-category="Carimbos"]');
    const id = card.dataset.id;
    const item = (await window.__atelie.api.library.list()).items.find(i => i.id === id);
    window.__atelieActiveDragItem = item;
    const stage = document.querySelector('.stage-viewport').getBoundingClientRect();
    document.dispatchEvent(new DragEvent('dragover', { bubbles: true, clientX: stage.left + 300, clientY: stage.top + 300 }));
    const g = document.querySelector('body > img.stage-drag-ghost');
    const r = g?.getBoundingClientRect();
    const page = window.__atelie.editor.state.handout.page;
    const maxW = Math.round(page.width * 0.5) * window.__atelie.editor.stage.getZoom();
    const out = g ? { tag: g.tagName, opacity: getComputedStyle(g).opacity, w: r.width, maxW, hasSrc: !!g.getAttribute('src'), cx: r.left + r.width / 2 } : null;
    window.dispatchEvent(new Event('dragend'));
    return { out, removed: !document.querySelector('.stage-drag-ghost'), expectCx: stage.left + 300 };
  });
  assert.ok(ghost.out, 'ghost exists as a body-level <img>');
  assert.equal(ghost.out.opacity, '1');
  assert.ok(ghost.out.hasSrc);
  assert.ok(ghost.out.w <= ghost.out.maxW + 1, 'ghost is not bigger than the drop size');
  assert.ok(Math.abs(ghost.out.cx - ghost.expectCx) < 2, 'ghost is centered on the cursor');
  assert.ok(ghost.removed, 'ghost is removed on dragend');

  // Recents row after using an item
  await page.locator('.library-item-card[data-category="Carimbos"]').first().waitFor();
  await page.locator('.library-item-card[data-category="Carimbos"]').first().click();
  await page.waitForTimeout(100);
  await page.click('.filter-chip[data-filter-group="category"][data-filter-value="all"]');
  await page.click('.library-type-chips [data-type="fonts"]');
  await page.click('.library-type-chips [data-type="elements"]');
  assert.ok(await page.locator('.library-recents .library-item-card').count() >= 1, '"Usados recentemente" lists the item');

  assert.deepEqual(errors, []);
});
