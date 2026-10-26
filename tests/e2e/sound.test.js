import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';

test('sound e2e: typing triggers play when enabled and stays silent when disabled', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-sound-e2e-'));
  const distDir = path.join(projectDir, 'dist');
  const app = await createApp({ dataDir, distDir });
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
  await page.waitForFunction(() => !!window.__atelie?.editor?.state && !!window.__atelie?.sound);

  // 1. Initial state: sound is disabled by default
  const initialSettings = await page.evaluate(() => window.__atelie.sound.getSettings());
  assert.equal(initialSettings.enabled, false, 'sound should be disabled by default');

  // Install spy on window.__atelie.sound.play
  await page.evaluate(() => {
    window.__soundPlays = [];
    const origPlay = window.__atelie.sound.play;
    window.__atelie.sound.play = (name, opts) => {
      window.__soundPlays.push({ name, opts });
      return origPlay(name, opts);
    };
  });

  // Open the fill panel or inline text editor
  // First add a text layer
  await page.evaluate(() => {
    const editor = window.__atelie.editor;
    const doc = editor.state.handout;
    const tl = {
      id: 'test-sound-text-layer',
      name: 'Texto Som',
      kind: 'text',
      x: 100,
      y: 100,
      width: 400,
      height: 100,
      rotation: 0,
      opacity: 1,
      blend: 'normal',
      visible: true,
      locked: false,
      light: 'both',
      text: {
        content: '',
        font: { family: 'Courier Prime', library: 'casa-font-courierprime-regular', weight: 400, italic: false },
        size: 24,
        align: 'left',
        color: '#1a1816',
        letterSpacing: 0,
        lineHeight: 1.2,
      },
    };
    editor.state.edit({
      ...doc,
      layers: [...doc.layers, tl],
      fields: [{ layerId: tl.id, label: 'Mensagem' }],
    });
    editor.state.select(tl.id);
  });

  // Open Fill tab in inspector
  const fillTab = page.locator('.inspector-tab[data-tab="fill"]');
  if (await fillTab.isVisible()) {
    await fillTab.click();
  }

  const fillInput = page.locator('.fill-field-input[data-field-id="test-sound-text-layer"]');
  await fillInput.waitFor({ state: 'visible', timeout: 5000 });

  // 2. Typing while sound is disabled -> 0 calls to play('type')
  await fillInput.click();
  await fillInput.pressSequentially('test', { delay: 100 });

  const playsDisabled = await page.evaluate(() => window.__soundPlays.filter(p => p.name === 'type').length);
  assert.equal(playsDisabled, 0, 'no sound plays when sound is disabled');

  // 3. Enable sound
  await page.evaluate(() => {
    window.__soundPlays = [];
    window.__atelie.sound.setSettings({ enabled: true, typing: 'typewriter' });
  });

  const enabledSettings = await page.evaluate(() => window.__atelie.sound.getSettings());
  assert.equal(enabledSettings.enabled, true, 'sound is enabled');

  // 4. Type 5 letters with delay > 35ms -> exactly 5 calls to play('type')
  await fillInput.click();
  await fillInput.pressSequentially('hello', { delay: 100 });

  const playsEnabled = await page.evaluate(() => window.__soundPlays.filter(p => p.name === 'type').length);
  assert.equal(playsEnabled, 5, 'exactly 5 type sounds play when typing 5 characters with sound enabled');

  // 5. Check Settings Modal UI
  const settingsBtn = page.locator('.rail-btn[data-action="settings"]');
  await settingsBtn.click();

  const settingsModal = page.locator('#at-settings-modal');
  await settingsModal.waitFor({ state: 'visible', timeout: 5000 });

  // Verify sound section elements exist
  const soundSection = page.locator('#setting-sound-section');
  assert.equal(await soundSection.count(), 1, 'sound section exists in settings modal');

  const soundCheckbox = page.locator('#setting-sound-enabled');
  assert.equal(await soundCheckbox.isChecked(), true, 'sound checkbox is checked');

  const previewBtn = page.locator('[data-sound-preview="typing-typewriter"]');
  assert.equal(await previewBtn.count(), 1, 'preview button for typewriter typing exists');

  // Click preview button
  await previewBtn.click();
  await page.waitForTimeout(250);

  const previewPlays = await page.evaluate(() => window.__soundPlays.filter(p => p.name === 'type').length);
  assert.ok(previewPlays > 5, 'clicking preview button played preview sounds');

  // Close modal
  await page.keyboard.press('Escape');
  await settingsModal.waitFor({ state: 'detached', timeout: 5000 });
});

