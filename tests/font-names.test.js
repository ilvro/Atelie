import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFontNames } from '../scripts/lib/font-names.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function encodeUtf16BE(str) {
  const buf = Buffer.alloc(str.length * 2);
  for (let i = 0; i < str.length; i++) {
    buf.writeUInt16BE(str.charCodeAt(i), i * 2);
  }
  return buf;
}

/**
 * Builds a minimal valid synthetic sfnt buffer with 'name', 'OS/2' and 'fvar' tables.
 */
function createSyntheticFont() {
  // Strings to encode
  const familyStr = encodeUtf16BE('Test Sans');
  const fullStr = encodeUtf16BE('Test Sans Bold Italic');
  const psStr = encodeUtf16BE('TestSans-BoldItalic');

  // Name table: header (6 bytes) + 3 records (36 bytes) + strings
  const nameRecCount = 3;
  const nameHeaderSize = 6;
  const nameRecordsSize = nameRecCount * 12;
  const stringStorageOffset = nameHeaderSize + nameRecordsSize;

  const nameTableSize = stringStorageOffset + familyStr.length + fullStr.length + psStr.length;
  const nameBuf = Buffer.alloc(nameTableSize);

  // name header
  nameBuf.writeUInt16BE(0, 0); // format
  nameBuf.writeUInt16BE(nameRecCount, 2); // count
  nameBuf.writeUInt16BE(stringStorageOffset, 4); // stringOffset

  let curStrOffset = 0;
  // Record 1: Family (nameID=1)
  nameBuf.writeUInt16BE(3, 6); // platformID Windows
  nameBuf.writeUInt16BE(1, 8); // encodingID Unicode BMP
  nameBuf.writeUInt16BE(0x0409, 10); // languageID US English
  nameBuf.writeUInt16BE(1, 12); // nameID 1
  nameBuf.writeUInt16BE(familyStr.length, 14);
  nameBuf.writeUInt16BE(curStrOffset, 16);
  familyStr.copy(nameBuf, stringStorageOffset + curStrOffset);
  curStrOffset += familyStr.length;

  // Record 2: Full name (nameID=4)
  const rec2 = 6 + 12;
  nameBuf.writeUInt16BE(3, rec2);
  nameBuf.writeUInt16BE(1, rec2 + 2);
  nameBuf.writeUInt16BE(0x0409, rec2 + 4);
  nameBuf.writeUInt16BE(4, rec2 + 6);
  nameBuf.writeUInt16BE(fullStr.length, rec2 + 8);
  nameBuf.writeUInt16BE(curStrOffset, rec2 + 10);
  fullStr.copy(nameBuf, stringStorageOffset + curStrOffset);
  curStrOffset += fullStr.length;

  // Record 3: PostScript (nameID=6)
  const rec3 = 6 + 24;
  nameBuf.writeUInt16BE(3, rec3);
  nameBuf.writeUInt16BE(1, rec3 + 2);
  nameBuf.writeUInt16BE(0x0409, rec3 + 4);
  nameBuf.writeUInt16BE(6, rec3 + 6);
  nameBuf.writeUInt16BE(psStr.length, rec3 + 8);
  nameBuf.writeUInt16BE(curStrOffset, rec3 + 10);
  psStr.copy(nameBuf, stringStorageOffset + curStrOffset);
  curStrOffset += psStr.length;

  // OS/2 table: 64 bytes
  const os2Buf = Buffer.alloc(64);
  os2Buf.writeUInt16BE(700, 4); // usWeightClass = 700 (Bold)
  os2Buf.writeUInt16BE(0x0001, 62); // fsSelection bit 0 = 1 (Italic)

  // fvar table: header 16 bytes + 1 axis (20 bytes) = 36 bytes
  const fvarBuf = Buffer.alloc(36);
  fvarBuf.writeUInt16BE(1, 0); // majorVersion
  fvarBuf.writeUInt16BE(0, 2); // minorVersion
  fvarBuf.writeUInt16BE(16, 4); // axesArrayOffset
  fvarBuf.writeUInt16BE(2, 6); // reserved
  fvarBuf.writeUInt16BE(1, 8); // axisCount
  fvarBuf.writeUInt16BE(20, 10); // axisSize

  // axis wght: 100 to 900, default 400
  fvarBuf.write('wght', 16, 4, 'ascii');
  fvarBuf.writeInt32BE(100 * 65536, 20); // min
  fvarBuf.writeInt32BE(400 * 65536, 24); // default
  fvarBuf.writeInt32BE(900 * 65536, 28); // max
  fvarBuf.writeUInt16BE(0, 32); // flags
  fvarBuf.writeUInt16BE(256, 34); // axisNameID

  // Assemble sfnt file
  const numTables = 3;
  const headerSize = 12 + numTables * 16;
  const totalSize = headerSize + nameBuf.length + os2Buf.length + fvarBuf.length;
  const sfnt = Buffer.alloc(totalSize);

  sfnt.writeUInt32BE(0x00010000, 0); // TrueType 1.0 signature
  sfnt.writeUInt16BE(numTables, 4);
  sfnt.writeUInt16BE(32, 6); // searchRange
  sfnt.writeUInt16BE(1, 8); // entrySelector
  sfnt.writeUInt16BE(16, 10); // rangeShift

  let offset = headerSize;

  // Table 1: 'name'
  sfnt.write('name', 12, 4, 'ascii');
  sfnt.writeUInt32BE(0, 16);
  sfnt.writeUInt32BE(offset, 20);
  sfnt.writeUInt32BE(nameBuf.length, 24);
  nameBuf.copy(sfnt, offset);
  offset += nameBuf.length;

  // Table 2: 'OS/2'
  sfnt.write('OS/2', 28, 4, 'ascii');
  sfnt.writeUInt32BE(0, 32);
  sfnt.writeUInt32BE(offset, 36);
  sfnt.writeUInt32BE(os2Buf.length, 40);
  os2Buf.copy(sfnt, offset);
  offset += os2Buf.length;

  // Table 3: 'fvar'
  sfnt.write('fvar', 44, 4, 'ascii');
  sfnt.writeUInt32BE(0, 48);
  sfnt.writeUInt32BE(offset, 52);
  sfnt.writeUInt32BE(fvarBuf.length, 56);
  fvarBuf.copy(sfnt, offset);

  return sfnt;
}

test('font-names: fonte mínima sintética com name, OS/2 e fvar', () => {
  const synth = createSyntheticFont();
  const res = readFontNames(synth);

  assert.ok(res !== null, 'fonte sintética deve ser reconhecida');
  assert.equal(res.family, 'Test Sans');
  assert.equal(res.postscript, 'TestSans-BoldItalic');
  assert.equal(res.weight, 700);
  assert.equal(res.italic, true);

  assert.ok(res.variable && Array.isArray(res.variable.axes), 'deve conter eixos de variação');
  assert.equal(res.variable.axes.length, 1);
  assert.equal(res.variable.axes[0].tag, 'wght');
  assert.equal(res.variable.axes[0].min, 100);
  assert.equal(res.variable.axes[0].default, 400);
  assert.equal(res.variable.axes[0].max, 900);
});

test('font-names: buffers inválidos retornam null', () => {
  assert.equal(readFontNames(null), null);
  assert.equal(readFontNames(Buffer.alloc(0)), null);
  assert.equal(readFontNames(Buffer.from('not a font at all')), null);
  assert.equal(readFontNames(Buffer.from('ttcf\x00\x00\x00\x01')), null, 'coleções ttcf devem retornar null');
  assert.equal(readFontNames(Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x01])), null, 'tamanho menor que cabeçalho sfnt');
});

test('font-names: fontes reais do repositório possuem família e PostScript', async () => {
  const fontesDirs = [
    path.join(projectRoot, 'src/ui/fonts'),
    path.join(projectRoot, 'public/colecao/fontes'),
  ];

  let tested = 0;
  for (const fDir of fontesDirs) {
    try {
      const entries = await fs.readdir(fDir, { recursive: true, withFileTypes: true });
      for (const ent of entries) {
        if (ent.isFile() && ent.name.endsWith('.ttf')) {
          const filePath = path.join(ent.parentPath || ent.path, ent.name);
          const buf = await fs.readFile(filePath);
          const info = readFontNames(buf);
          assert.ok(info !== null, `falha ao ler fonte real: ${ent.name}`);
          assert.ok(info.family && info.family.length > 0, `família vazia em ${ent.name}`);
          assert.ok(info.postscript && info.postscript.length > 0, `postscript vazio em ${ent.name}`);
          assert.ok(typeof info.weight === 'number' && info.weight >= 100, `peso inválido em ${ent.name}`);
          tested++;
        }
      }
    } catch {
      // Directory may not exist yet
    }
  }

  assert.ok(tested >= 2, `deve ter testado ao menos 2 fontes reais existentes (testadas: ${tested})`);
});
