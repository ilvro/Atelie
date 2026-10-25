/**
 * Family, style and names of a TrueType/OpenType font from its 'name', 'OS/2' and 'fvar' tables;
 * returns null if it is not a valid font.
 *
 * @param {Buffer|Uint8Array} buffer
 * @returns {{ family: string, subfamily: string, postscript: string, fullName: string, weight: number, italic: boolean, variable: { axes: Array<{ tag: string, min: number, default: number, max: number }> } | null } | null}
 */
export function readFontNames(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // Ensure Buffer or DataView access
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  // Read sfnt header signature (4 bytes)
  const sfntVersion = buf.readUInt32BE(0);
  const validSignatures = [
    0x00010000, // TrueType 1.0
    0x74727565, // 'true' - Apple TrueType
    0x4F54544F, // 'OTTO' - OpenType with CFF
  ];

  if (!validSignatures.includes(sfntVersion)) {
    return null;
  }

  const numTables = buf.readUInt16BE(4);
  if (buf.length < 12 + numTables * 16) {
    return null;
  }

  // Parse table directory
  const tables = new Map();
  for (let i = 0; i < numTables; i++) {
    const tableOffset = 12 + i * 16;
    const tag = buf.toString('ascii', tableOffset, tableOffset + 4);
    const offset = buf.readUInt32BE(tableOffset + 8);
    const length = buf.readUInt32BE(tableOffset + 12);

    if (offset + length > buf.length) {
      // Table exceeds buffer
      return null;
    }
    tables.set(tag, { offset, length });
  }

  // 'name' table is required
  const nameTable = tables.get('name');
  if (!nameTable || nameTable.length < 6) {
    return null;
  }

  const nameOffset = nameTable.offset;
  const count = buf.readUInt16BE(nameOffset + 2);
  const stringStorageOffset = nameOffset + buf.readUInt16BE(nameOffset + 4);

  // Maps nameID -> { priority, value }
  // Priorities:
  // 3: Windows English US (platformID=3, languageID=0x0409)
  // 2: Windows / Unicode (platformID=3 or 0)
  // 1: Macintosh Roman (platformID=1)
  const names = new Map();

  for (let i = 0; i < count; i++) {
    const recOffset = nameOffset + 6 + i * 12;
    if (recOffset + 12 > stringStorageOffset) break;

    const platformID = buf.readUInt16BE(recOffset);
    const encodingID = buf.readUInt16BE(recOffset + 2);
    const languageID = buf.readUInt16BE(recOffset + 4);
    const nameID = buf.readUInt16BE(recOffset + 6);
    const strLen = buf.readUInt16BE(recOffset + 8);
    const strOff = buf.readUInt16BE(recOffset + 10);

    const actualStrOffset = stringStorageOffset + strOff;
    if (actualStrOffset + strLen > buf.length) continue;

    let priority = 0;
    let decoded = '';

    if (platformID === 3 && languageID === 0x0409) {
      priority = 3;
      decoded = decodeUtf16BE(buf, actualStrOffset, strLen);
    } else if (platformID === 3 || platformID === 0) {
      priority = 2;
      decoded = decodeUtf16BE(buf, actualStrOffset, strLen);
    } else if (platformID === 1 && languageID === 0) {
      priority = 1;
      decoded = buf.toString('latin1', actualStrOffset, actualStrOffset + strLen);
    } else if (platformID === 1) {
      priority = 1;
      decoded = buf.toString('latin1', actualStrOffset, actualStrOffset + strLen);
    }

    if (decoded && (!names.has(nameID) || names.get(nameID).priority < priority)) {
      names.set(nameID, { priority, value: decoded.trim() });
    }
  }

  const getName = id => names.get(id)?.value || '';

  // Typographic family (16) if present, else family (1)
  const family = getName(16) || getName(1) || '';
  // Typographic subfamily (17) if present, else subfamily (2)
  const subfamily = getName(17) || getName(2) || 'Regular';
  const postscript = getName(6) || '';
  const fullName = getName(4) || (family ? `${family} ${subfamily}`.trim() : '');

  if (!family && !postscript) {
    return null;
  }

  // OS/2 table parsing for weight & italic
  let weight = 400;
  let italic = false;

  const os2Table = tables.get('OS/2');
  if (os2Table && os2Table.length >= 64) {
    const os2Offset = os2Table.offset;
    const usWeightClass = buf.readUInt16BE(os2Offset + 4);
    if (usWeightClass >= 100 && usWeightClass <= 900) {
      weight = usWeightClass;
    }
    const fsSelection = buf.readUInt16BE(os2Offset + 62);
    italic = Boolean(fsSelection & 0x01);
  } else {
    // Fallback detection from subfamily name
    if (/italic|oblique/i.test(subfamily)) {
      italic = true;
    }
    if (/bold/i.test(subfamily)) {
      weight = 700;
    } else if (/light/i.test(subfamily)) {
      weight = 300;
    }
  }

  // 'fvar' table parsing for variable font axes
  let variable = null;
  const fvarTable = tables.get('fvar');
  if (fvarTable && fvarTable.length >= 16) {
    const fvarOffset = fvarTable.offset;
    const axesArrayOffset = fvarOffset + buf.readUInt16BE(fvarOffset + 4);
    const axisCount = buf.readUInt16BE(fvarOffset + 8);
    const axisSize = buf.readUInt16BE(fvarOffset + 10);

    if (axisCount > 0 && axisSize >= 16 && axesArrayOffset + axisCount * axisSize <= fvarOffset + fvarTable.length) {
      const axes = [];
      for (let i = 0; i < axisCount; i++) {
        const axOffset = axesArrayOffset + i * axisSize;
        const tag = buf.toString('ascii', axOffset, axOffset + 4);
        const min = readFixed16_16(buf, axOffset + 4);
        const def = readFixed16_16(buf, axOffset + 8);
        const max = readFixed16_16(buf, axOffset + 12);

        axes.push({ tag, min, default: def, max });
      }
      if (axes.length > 0) {
        variable = { axes };
      }
    }
  }

  return {
    family,
    subfamily,
    postscript,
    fullName,
    weight,
    italic,
    variable,
  };
}

function decodeUtf16BE(buf, offset, length) {
  let str = '';
  for (let i = 0; i < length; i += 2) {
    if (offset + i + 1 < buf.length) {
      str += String.fromCharCode(buf.readUInt16BE(offset + i));
    }
  }
  return str;
}

function readFixed16_16(buf, offset) {
  const intVal = buf.readInt32BE(offset);
  return Number((intVal / 65536).toFixed(4));
}

