import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';
import { LESSONS } from '../../src/tutorial/lessons.js';

const FONT = path.join(projectDir, 'public/colecao/fontes/apache/rocksalt/RockSalt-Regular.ttf');
const ONLY = process.env.LESSON; // run one lesson while writing it

async function launch(t) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-tutor-'));
  const app = await createApp({ dataDir, distDir: path.join(projectDir, 'dist') });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
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
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = [];
  page.setDefaultTimeout(30_000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? d.defaultValue() : undefined));
  return { page, errors, baseUrl: `http://127.0.0.1:${server.address().port}`, dataDir };
}

// Every lesson is run as written: each target must be on screen and each step must complete by its own condition.
for (const lesson of LESSONS) {
  if (ONLY && lesson.id !== ONLY) continue;
  test(`tutorial "${lesson.title}" can be followed from the first step to the last`, { timeout: 150_000 }, async (t) => {
    const { page, errors, baseUrl, dataDir } = await launch(t);
    const photo = path.join(dataDir, 'foto-teste.png');
    await writeFile(photo, await sharp({ create: { width: 48, height: 64, channels: 3, background: { r: 180, g: 120, b: 90 } } }).png().toBuffer());
    const fixtures = { foto: photo, fonte: FONT };

    try {
      await page.goto(`${baseUrl}/?diagnostics`);
      await page.waitForFunction(() => !!window.__atelie?.editor?.state && !!window.atelieTutor);

      // The person's own work, which must be back after the lesson
      const own = await page.evaluate(() => window.__atelie.editor.state.handout.name);
      const ownId = await page.evaluate(() => window.__atelie.editor.state.handout.id);

      await page.evaluate(id => window.atelieTutor.start(id), lesson.id);
      await page.waitForFunction(id => window.atelieTutor.active?.id === id, lesson.id);

      const skipped = [];
      for (const [index, step] of lesson.steps.entries()) {
        const where = `${lesson.id} #${index + 1} "${step.say.replace(/<[^>]+>/g, '')}"`;
        await page.waitForFunction(i => !window.atelieTutor.active || window.atelieTutor.active.step >= i, index).catch(() => assert.fail(`${where}: the lesson did not reach this step`));
        // A step whose condition already holds passes by itself, as it does for a person.
        if (await page.evaluate(i => window.atelieTutor.active?.step !== i, index)) { skipped.push(index + 1); continue; }
        // A step done alone shows no ring until the person asks "Mostrar onde"; the test asks at once.
        if (step.try) {
          await page.waitForSelector('.tutor-card .tutor-alone');
          await page.evaluate(() => window.atelieTutor.showWhere());
        }
        if (step.target) {
          await page.locator(step.target).first().waitFor({ state: 'visible', timeout: 15_000 }).catch(async () => {
            const info = await page.evaluate(() => ({ tab: document.querySelector('.inspector-tab.active')?.dataset.tab, drawer: document.querySelector('#app-drawer')?.classList.contains('open'), tutor: window.atelieTutor.active }));
            await page.screenshot({ path: `test-results/tutorial-${lesson.id}-failed.png` }).catch(() => {});
            assert.fail(`${where}: target ${step.target} is not on screen (${JSON.stringify(info)})`);
          });
          await page.waitForFunction(() => !document.querySelector('.tutor-ring').hidden).catch(() => assert.fail(`${where}: the ring is not shown on ${step.target}`));
        }
        const act = step.act ?? 'click';
        const acts = Array.isArray(act[0]) ? act : [act];
        for (const [order, one] of acts.entries()) {
          // A step must not complete before everything it asks is done: its condition has to check all of it.
          if (order > 0 && await page.evaluate(i => window.atelieTutor.active?.step !== i, index)) assert.fail(`${where}: completed after ${order} of ${acts.length} actions; its condition does not check everything the step asks`);
          if (one === 'continue') await page.locator('.tutor-card [data-tutor="next"]').click();
          else if (one === 'click') await page.locator(step.target).first().click();
          else if (one[0] === 'click') { await page.locator(one[1]).first().click(); if (process.env.DEBUG_TUT) console.log('clicked', one[1], await page.evaluate(() => document.querySelector('.inspector-tab.active')?.dataset.tab)); await page.waitForTimeout(600); console.log('  600ms later', await page.evaluate(() => [document.querySelector('.inspector-tab.active')?.dataset.tab, document.querySelectorAll('[data-field="h:light"]').length, window.__atelie.editor.state.selection])); }
          else if (one[0] === 'fill') { await page.locator(one[1]).first().fill(one[2]); await page.keyboard.press('Tab'); }
          else if (one[0] === 'select') await page.locator(one[1]).first().selectOption(one[2]);
          else if (one[0] === 'key') await page.keyboard.press(one[1]);
        else if (one[0] === 'wait') await page.waitForTimeout(one[1]);
          else if (one[0] === 'upload') {
            const isInput = await page.locator(one[1]).first().evaluate(node => node.tagName === 'INPUT');
            if (isInput) await page.locator(one[1]).first().setInputFiles(fixtures[one[2]]);
            else {
              const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator(one[1]).first().click()]);
              await chooser.setFiles(fixtures[one[2]]);
            }
          } else if (one[0] === 'draw') {
            const points = await page.evaluate(pts => {
              const rect = document.querySelector('.stage-page-wrap').getBoundingClientRect();
              const zoom = window.__atelie.editor.stage.getZoom();
              return pts.map(([x, y]) => ({ x: rect.left + x * zoom, y: rect.top + y * zoom }));
            }, one[1]);
            await page.mouse.move(points[0].x, points[0].y);
            await page.mouse.down();
            for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 6 });
            await page.mouse.up();
          }
        }
        await page.waitForFunction(i => !window.atelieTutor.active || window.atelieTutor.active.step > i, index).catch(() => assert.fail(`${where}: doing the step did not complete it`));
      }

      assert.ok(skipped.length <= lesson.steps.length / 4, `steps ${skipped} completed by themselves: the lesson mostly teaches what is already done`);
      assert.equal(await page.evaluate(() => window.atelieTutor.active), null);
      assert.equal(await page.evaluate(id => window.atelieTutor.progress()[id]?.done, lesson.id), true);

      // The practice is cleaned up and the person's own document is exactly where it was
      if (await page.locator('[data-action="tutorial-leave-practice"][data-trash="1"]').count()) {
        await page.locator('[data-action="tutorial-leave-practice"][data-trash="1"]').click();
        await page.waitForFunction(() => !window.__atelie.editor.hasPractice);
      }
      await page.waitForFunction(id => window.__atelie.editor.state?.handout.id === id, ownId).catch(() => assert.fail('the person’s own document did not come back'));
      assert.equal(await page.evaluate(() => window.__atelie.editor.state.handout.name), own);
      assert.equal(await page.evaluate(() => window.__atelie.editor.tabs.length), 1, 'only the person’s own tab is left');
      assert.deepEqual(errors, []);

    } catch (error) {
      await page.screenshot({ path: `test-results/tutorial-${lesson.id}-failed.png` }).catch(() => {});
      throw error;
    }
  });
}

// The ways in: Ajuda, the start card, Ctrl+K and the "?" of a task. Practice never touches the person's own document.
test('tutorial entry points: Ajuda list, start card, Ctrl+K, "?" of a task, and the person\'s document stays as it was', { timeout: 120_000 }, async (t) => {
  const { page, errors, baseUrl } = await launch(t);
  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state && !!window.atelieTutor);

  // The person's own document, edited and not archived
  await page.fill('.at-doc-name-input', 'Meu documento de verdade');
  const own = await page.evaluate(() => ({ id: window.__atelie.editor.state.handout.id, layers: window.__atelie.editor.state.handout.layers.length }));

  // Ajuda → "Aprender na prática" lists the lessons in folders with their length
  await page.click('.rail-btn[data-action="help"]');
  await page.waitForSelector('[data-tutorial-list] .lesson');
  assert.equal(await page.locator('[data-tutorial-list] .lesson').count(), LESSONS.length);
  assert.ok(await page.locator('[data-tutorial-list] .lesson-folder').count() >= 5);
  const first = await page.locator('[data-tutorial-list] .lesson').first().textContent();
  assert.match(first, /min · \d+ passos/);

  // Ctrl+K finds a lesson by name
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  await page.fill('#at-palette-modal input', 'tinta invisível');
  await page.waitForSelector('#at-palette-modal :text("Tinta invisível")');
  await page.keyboard.press('Escape');

  // The "?" beside Iluminação starts the tip on a practice document; leaving closes it and gives the document back
  await page.click('.inspector-tab[data-tab="layers"]');
  await page.evaluate(() => {
    const ed = window.__atelie.editor;
    const doc = ed.state.handout;
    const txt = { id: 'tx', name: 'T', kind: 'text', visible: true, locked: false, x: 100, y: 100, width: 300, height: 100, rotation: 0, opacity: 1, blend: 'normal', light: 'both',
      text: { content: 'a', font: { family: 'IM Fell English', library: null, weight: 400, italic: false }, size: 30, color: '#000000', align: 'left', valign: 'top', lineHeight: 1.2, letterSpacing: 0, box: 'area', fit: 'overflow', highlight: null, ink: { style: 'clean', wear: 0, seed: 1 } } };
    ed.loadHandout({ ...doc, name: 'Meu documento de verdade', layers: [...doc.layers, txt] }, { skipDraftCheck: true });
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__atelie.editor.state.select('tx'));
  await page.click('.inspector-tab[data-tab="properties"]');
  await page.click('.task-help[data-task="light"]');
  await page.waitForFunction(() => window.atelieTutor.active?.id === 'tip-uv');
  assert.match(await page.evaluate(() => window.__atelie.editor.state.handout.name), /^Treino/);
  assert.equal(await page.evaluate(() => window.__atelie.editor.tabs.length), 2, 'the practice is a tab of its own');
  await page.click('.tutor-card [data-tutor="exit"]');
  await page.click('[data-action="tutorial-leave-practice"][data-trash="1"]');
  await page.waitForFunction(() => !window.__atelie.editor.hasPractice);
  await page.waitForFunction(id => window.__atelie.editor.state?.handout.id === id, own.id);
  assert.equal(await page.evaluate(() => window.__atelie.editor.state.handout.name), 'Meu documento de verdade');
  assert.equal(await page.evaluate(() => window.__atelie.editor.tabs.length), 1);
  assert.equal(await page.evaluate(() => window.__atelie.editor.state.handout.layers.find(l => l.id === 'tx').light), 'both', 'the lesson did not touch the real layer');

  // Leaving halfway keeps the progress: the list offers to continue from that step
  await page.evaluate(() => window.atelieTutor.start('letter-1890'));
  await page.waitForFunction(() => window.atelieTutor.active?.id === 'letter-1890');
  await page.click('.tutor-card [data-tutor="next"]');
  await page.waitForFunction(() => window.atelieTutor.active?.step === 1);
  await page.click('.tutor-card [data-tutor="exit"]');
  assert.equal(await page.evaluate(() => window.atelieTutor.progress()['letter-1890'].step), 1);
  await page.click('[data-action="tutorial-leave-practice"][data-trash="1"]');
  await page.click('.rail-btn[data-action="help"]');
  await page.waitForSelector('[data-lesson="letter-1890"] [data-from="1"]');

  // The start screen has the "Aprender o básico" card
  await page.click('.rail-btn[data-action="desk"]');
  await page.waitForSelector('.start-learn-card');
  await page.click('.start-learn-card [data-action="tutorial-start"]');
  await page.waitForFunction(() => window.atelieTutor.active?.id === 'fill-template');

  assert.deepEqual(errors, []);
});

// Which interface controls (data-action) no lesson or tip uses: a report for whoever writes the next lessons.
test('tutorial coverage report: lists the controls that no lesson points at', async () => {
  const { readFile, readdir } = await import('node:fs/promises');
  const files = [];
  for (const dir of ['src/editor', 'src/ui', 'src/reading']) {
    for (const name of await readdir(path.join(projectDir, dir))) if (name.endsWith('.js')) files.push(path.join(projectDir, dir, name));
  }
  const actions = new Set();
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(/data-action="([a-z][a-z0-9-]+)"/g)) actions.add(match[1]);
  }
  const lessonText = JSON.stringify(LESSONS);
  const unused = [...actions].filter(action => !lessonText.includes(`data-action=\\"${action}\\"`) && !lessonText.includes(`data-action=\\\\\\"${action}`)).sort();
  const { writeFile: write, mkdir } = await import('node:fs/promises');
  await mkdir(path.join(projectDir, 'test-results'), { recursive: true });
  await write(path.join(projectDir, 'test-results/tutorial-coverage.txt'), `Controles (data-action) que nenhuma lição ou dica aponta (${unused.length} de ${actions.size}):\n${unused.join('\n')}\n`);
  assert.ok(actions.size > 20, 'the scan found the interface controls');
  for (const used of ['archive', 'toggle-uv', 'use-template', 'export-print', 'toggle-add-menu', 'flip-sheet']) {
    assert.ok(!unused.includes(used), `the core control "${used}" is used by some lesson`);
  }
});
