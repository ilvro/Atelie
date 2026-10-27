import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const colecaoDir = path.join(projectRoot, 'public/colecao');
const manifestPath = path.join(colecaoDir, 'library.json');
const licencasMdPath = path.join(colecaoDir, 'fontes/LICENCAS.md');

const EXPECTED_FAMILIES = [
  // C6: 14 famílias novas
  'Shadows Into Light', 'Indie Flower', 'Gloria Hallelujah', 'La Belle Aurore', 'Mrs Saint Delafield',
  'Pinyon Script', 'Great Vibes', 'EB Garamond', 'Cinzel', 'Uncial Antiqua', 'Grenze Gotisch', 'Rye', 'Inter', 'Libre Barcode 39 Text',
  'Courier Prime',
  'Special Elite',
  'Cutive Mono',
  'Caveat',
  'Kalam',
  'Homemade Apple',
  'Reenie Beanie',
  'Nothing You Could Do',
  'Dawning of a New Day',
  'Rock Salt',
  'Permanent Marker',
  'IM Fell English',
  'IM Fell DW Pica',
  'Old Standard TT',
  'Libre Baskerville',
  'Cormorant Garamond',
  'Playfair Display',
  'Bebas Neue',
  'Oswald',
  'Anton',
  'UnifrakturMaguntia',
  'Pirata One',
  'Stardos Stencil',
  'Black Ops One',
  'VT323',
  'Share Tech Mono',
];

test('colecao-fonts: todas as 40 famílias estão no manifesto com licença válida e arquivo ao lado', async () => {
  const raw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  const items = manifest.items || [];
  const fontItems = items.filter(it => it.kind === 'font');

  assert.ok(fontItems.length >= 40, `deve haver ao menos 40 estilos/fontes (encontrados: ${fontItems.length})`);

  const familiesFound = new Set();

  for (const item of fontItems) {
    // 1. Prefixo casa-font-
    assert.ok(item.id.startsWith('casa-font-'), `id fora do padrão casa-font-: ${item.id}`);

    // 2. Licença ∈ { OFL-1.1, Apache-2.0 }
    assert.ok(
      item.license === 'OFL-1.1' || item.license === 'Apache-2.0',
      `licença inválida em ${item.id}: ${item.license}`
    );

    // 3. Arquivo da fonte existe e tem tamanho > 0
    assert.ok(item.file, `item sem file: ${item.id}`);
    const fontFilePath = path.join(colecaoDir, item.file);
    const fontStat = await fs.stat(fontFilePath);
    assert.ok(fontStat.isFile() && fontStat.size > 0, `arquivo da fonte ausente ou vazio: ${item.file}`);

    // 4. Arquivo de licença ao lado (na mesma pasta)
    const fontDir = path.dirname(fontFilePath);
    const entries = await fs.readdir(fontDir);
    const hasLicense = entries.includes('OFL.txt') || entries.includes('LICENSE.txt');
    assert.ok(hasLicense, `pasta da fonte ${item.file} sem arquivo de licença (OFL.txt ou LICENSE.txt) ao lado`);

    // 5. Família e PostScript
    assert.ok(item.family && item.family.length > 0, `família vazia em ${item.id}`);
    assert.ok(item.postscript && item.postscript.length > 0, `postscript vazio em ${item.id}`);
    familiesFound.add(item.family);
  }

  // 6. Todas as famílias esperadas estão presentes
  for (const expFam of EXPECTED_FAMILIES) {
    assert.ok(
      familiesFound.has(expFam),
      `família obrigatória ausente no manifesto: "${expFam}"`
    );
  }
});

test('colecao-fonts: LICENCAS.md existe e lista todas as 40 famílias', async () => {
  const content = await fs.readFile(licencasMdPath, 'utf8');
  assert.ok(content.length > 0, 'LICENCAS.md não deve estar vazio');

  for (const expFam of EXPECTED_FAMILIES) {
    assert.ok(
      content.includes(expFam),
      `LICENCAS.md deve citar a família "${expFam}"`
    );
  }
});


test('colecao-c6: toda família da coleção está na tabela fonte → épocas e numa categoria do seletor', async () => {
  const fonts = JSON.parse(await fs.readFile(path.join(projectRoot, 'scripts/fonts/fonts.json'), 'utf8')).filter(f => f.use === 'colecao');
  const { FONT_ERAS } = await import('../scripts/colecao/universo.js');
  const selector = await fs.readFile(path.join(projectRoot, 'src/editor/font-selector.js'), 'utf8');
  const families = new Set(fonts.map(f => f.family));
  assert.ok(families.size >= 40, `${families.size} famílias`);
  for (const f of fonts) {
    assert.ok(FONT_ERAS[f.family], `${f.family} falta em FONT_ERAS`);
    assert.ok(selector.includes(`'${f.category}'`), `categoria "${f.category}" de ${f.family} falta em CATEGORY_ORDER`);
  }
});
