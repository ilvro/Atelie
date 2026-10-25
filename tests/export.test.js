import test from 'node:test';
import assert from 'node:assert/strict';
import { exportScale, printLayout, fitsCanvas, generatePrintHtml } from '../src/editor/export.js';

test('export and print: A4 em print -> escala 2; recorte 1200 x 700 -> 203,2 x 118,5 mm com marcas de corte e orientacao paisagem; fitsCanvas limites', () => {
  // 1. A4 document (1240 × 1754)
  const a4Handout = {
    name: 'Relatório A4',
    page: { width: 1240, height: 1754 },
  };

  const scalePrintA4 = exportScale(a4Handout, 'print');
  assert.equal(scalePrintA4, 2, 'A4 em print deve ter escala 2');

  const scaleScreenA4 = exportScale(a4Handout, 'screen');
  assert.equal(scaleScreenA4, 2048 / 1754, 'A4 em tela deve ter lado maior 2048');

  const layoutA4 = printLayout(a4Handout);
  assert.equal(layoutA4.orientation, 'portrait');
  assert.equal(layoutA4.cropMarks, false, 'A4 nao deve ter marcas de corte');
  assert.ok(Math.abs(layoutA4.widthMm - 210) <= 0.2);
  assert.ok(Math.abs(layoutA4.heightMm - 297) <= 0.2);

  // 2. Recorte document (1200 × 700)
  const recorteHandout = {
    name: 'Recorte de Jornal',
    page: { width: 1200, height: 700 },
  };

  const layoutRecorte = printLayout(recorteHandout);
  assert.equal(layoutRecorte.orientation, 'landscape', '1200x700 deve ter orientacao paisagem');
  assert.equal(layoutRecorte.cropMarks, true, 'Recorte menor que A4 deve ter marcas de corte');
  assert.ok(Math.abs(layoutRecorte.widthMm - 203.2) <= 0.1, `widthMm esperado ~203.2, obtido ${layoutRecorte.widthMm}`);
  assert.ok(Math.abs(layoutRecorte.heightMm - 118.5) <= 0.1, `heightMm esperado ~118.5, obtido ${layoutRecorte.heightMm}`);

  // 3. fitsCanvas
  assert.equal(fitsCanvas(20000, 100), false, 'fitsCanvas(20000, 100) deve ser falso (largura > 16384)');
  assert.equal(fitsCanvas(100, 20000), false, 'fitsCanvas(100, 20000) deve ser falso (altura > 16384)');
  assert.equal(fitsCanvas(16384, 16384), true, 'fitsCanvas(16384, 16384) deve ser verdadeiro');
  assert.equal(fitsCanvas(0, 100), false, 'fitsCanvas(0, 100) deve ser falso');
  assert.equal(fitsCanvas(-10, 100), false, 'fitsCanvas(-10, 100) deve ser falso');
  assert.equal(fitsCanvas(1240, 1754), true, 'fitsCanvas(1240, 1754) deve ser verdadeiro');

  // 4. generatePrintHtml
  const htmlA4 = generatePrintHtml(a4Handout, 'data:image/png;base64,abc');
  assert.ok(htmlA4.includes('@page {'), 'HTML de impressao deve conter @page');
  assert.ok(htmlA4.includes('size: A4 portrait'), 'HTML de impressao A4 deve ser A4 portrait');
  assert.ok(htmlA4.includes('width: 210mm'), 'HTML de impressao A4 deve ter width 210mm');
  assert.ok(!htmlA4.includes('.print-box'), 'HTML de impressao A4 nao deve ter .print-box de corte');

  const htmlRecorte = generatePrintHtml(recorteHandout, 'data:image/png;base64,xyz');
  assert.ok(htmlRecorte.includes('size: A4 landscape'), 'HTML de recorte deve ser A4 landscape');
  assert.ok(htmlRecorte.includes('.print-box'), 'HTML de recorte deve ter .print-box com marcas de corte');
  assert.ok(htmlRecorte.includes('203.2mm'), 'HTML de recorte deve conter 203.2mm');
});

