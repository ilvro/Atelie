import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutText, inkJitter } from '../src/domain/handout-text-layout.js';
import { createHandoutFonts } from '../src/data/handout-fonts.js';

const measure = (t, px) => t.length * px * 0.5;

test('handout text layout: wrapping in area vs point', () => {
  // 1. "um dois três" em largura 100, size 20, area: quebra em linhas que cabem em 100; point mantém uma linha.
  const resArea = layoutText('um dois três', {
    measure,
    width: 100,
    height: 200,
    size: 20,
    box: 'area',
  });
  assert.equal(resArea.lines.length, 2);
  assert.equal(resArea.lines[0].text, 'um dois');
  assert.equal(resArea.lines[1].text, 'três');
  for (const line of resArea.lines) {
    assert.ok(line.width <= 100, `line width ${line.width} should be <= 100`);
  }

  const resPoint = layoutText('um dois três', {
    measure,
    width: 100,
    height: 200,
    size: 20,
    box: 'point',
  });
  assert.equal(resPoint.lines.length, 1);
  assert.equal(resPoint.lines[0].text, 'um dois três');
});

test('handout text layout: alignment center and right', () => {
  // 2. align: 'center' em largura 200: x da linha = (200 − largura) / 2. right: termina em 200.
  const resCenter = layoutText('um dois', {
    measure,
    width: 200,
    height: 100,
    size: 20,
    align: 'center',
  });
  const lineC = resCenter.lines[0];
  assert.equal(lineC.x, (200 - lineC.width) / 2);

  const resRight = layoutText('um dois', {
    measure,
    width: 200,
    height: 100,
    size: 20,
    align: 'right',
  });
  const lineR = resRight.lines[0];
  assert.equal(lineR.x, 200 - lineR.width);
  assert.equal(lineR.x + lineR.width, 200);
});

test('handout text layout: justify alignment', () => {
  // 3. justify com três linhas num parágrafo: as duas primeiras têm largura final 200 (± 0,5) e a última não.
  const text3 = 'alpha bravo charlie delta echo foxtrot golf hotel';
  const res = layoutText(text3, {
    measure,
    width: 200,
    height: 200,
    size: 20,
    box: 'area',
    align: 'justify',
  });
  assert.equal(res.lines.length, 3);
  assert.ok(Math.abs(res.lines[0].width - 200) <= 0.5, `line 0 width ${res.lines[0].width} should be 200`);
  assert.ok(Math.abs(res.lines[1].width - 200) <= 0.5, `line 1 width ${res.lines[1].width} should be 200`);
  assert.ok(res.lines[2].width < 200, `last line width ${res.lines[2].width} should be < 200`);
  assert.equal(res.lines[2].x, 0);
});

test('handout text layout: fit shrink', () => {
  // 4. fit: 'shrink' com texto longo em altura 60: size final < inicial, a altura das linhas ≤ 60; texto impossível dá overflow: true e size === minSize.
  const longText = 'linha um\nlinha dois\nlinha tres\nlinha quatro\nlinha cinco';
  const resShrink = layoutText(longText, {
    measure,
    width: 200,
    height: 60,
    size: 20,
    lineHeight: 1.25,
    fit: 'shrink',
    minSize: 6,
  });
  assert.ok(resShrink.size < 20, `shrunk size ${resShrink.size} should be < 20`);
  assert.ok(resShrink.height <= 60.01, `height ${resShrink.height} should be <= 60`);
  assert.equal(resShrink.overflow, false);

  const impossibleText = Array.from({ length: 60 }, (_, i) => `linha ${i}`).join('\n');
  const resOverflow = layoutText(impossibleText, {
    measure,
    width: 200,
    height: 60,
    size: 20,
    lineHeight: 1.25,
    fit: 'shrink',
    minSize: 8,
  });
  assert.equal(resOverflow.overflow, true);
  assert.equal(resOverflow.size, 8);
});

test('handout text layout: vertical alignment bottom', () => {
  // 5. valign: 'bottom': a última linha de base fica em height − size × (lineHeight − 0.8) (± 1).
  const resBottom = layoutText('primeira\nsegunda', {
    measure,
    width: 200,
    height: 150,
    size: 20,
    lineHeight: 1.25,
    valign: 'bottom',
  });
  const lastLine = resBottom.lines.at(-1);
  const expectedY = 150 - 20 * (1.25 - 0.8);
  assert.ok(Math.abs(lastLine.y - expectedY) <= 1, `last line baseline ${lastLine.y} should be ~${expectedY}`);
});

test('handout text layout: ink jitter determinism and styles', () => {
  // 6. inkJitter('typewriter', …) é idêntico em duas chamadas iguais e diferente para index diferente; clean é neutro; com wear: 0 todos os estilos são neutros, exceto o ângulo do stamp, que também zera.
  const j1 = inkJitter('typewriter', { seed: 10, index: 1, size: 20, wear: 0.8 });
  const j2 = inkJitter('typewriter', { seed: 10, index: 1, size: 20, wear: 0.8 });
  const j3 = inkJitter('typewriter', { seed: 10, index: 2, size: 20, wear: 0.8 });
  assert.deepEqual(j1, j2);
  assert.notDeepEqual(j1, j3);

  const cleanJ = inkJitter('clean', { seed: 10, index: 1, size: 20, wear: 1 });
  assert.deepEqual(cleanJ, { dx: 0, dy: 0, rotate: 0, scale: 1, alpha: 1, ghost: null });

  for (const style of ['clean', 'typewriter', 'handwriting', 'stamp']) {
    const neutral = inkJitter(style, { seed: 10, index: 5, size: 20, wear: 0 });
    assert.deepEqual(neutral, { dx: 0, dy: 0, rotate: 0, scale: 1, alpha: 1, ghost: null });
  }

  // Stamp rotation is seed-based and identical across indices
  const s1 = inkJitter('stamp', { seed: 42, index: 0, size: 20, wear: 0.5 });
  const s2 = inkJitter('stamp', { seed: 42, index: 9, size: 20, wear: 0.5 });
  assert.equal(s1.rotate, s2.rotate);
});

test('handout text layout: letter spacing', () => {
  // 7. letterSpacing: 100 aumenta a largura de "abcd" em 4 × size × 0,1.
  const resNoSpacing = layoutText('abcd', {
    measure,
    width: 200,
    height: 100,
    size: 20,
    letterSpacing: 0,
  });
  const resWithSpacing = layoutText('abcd', {
    measure,
    width: 200,
    height: 100,
    size: 20,
    letterSpacing: 100,
  });
  const diff = resWithSpacing.lines[0].width - resNoSpacing.lines[0].width;
  const expectedDiff = 4 * 20 * 0.1;
  assert.ok(Math.abs(diff - expectedDiff) < 1e-6, `difference ${diff} should match ${expectedDiff}`);
});

test('handout fonts: loader behavior', async () => {
  const fonts = createHandoutFonts();
  // System font resolves true immediately
  const systemRes = await fonts.load({ family: 'IM Fell English' });
  assert.equal(systemRes, true);

  // In Node environment without FontFace/document, library font resolves true safely
  const libRes = await fonts.load({ family: 'CustomFont', library: 'font-123', weight: 400 });
  assert.equal(libRes, true);
});

