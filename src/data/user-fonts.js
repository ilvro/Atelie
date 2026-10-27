/**
 * Fonts the person sends from their computer. They live in the browser's expansions database
 * as the expansion "usuario" (items + files), so the library list, the font selector and the
 * FontFace loader treat them like any other font without changes in the renderer.
 */

export const USER_EXPANSION_ID = 'usuario';
export const USER_FONT_CATEGORY = 'Minhas fontes';
export const USER_FONT_ACCEPT = '.ttf,.otf,.woff,.woff2';
export const MAX_USER_FONT_BYTES = 8 * 1024 * 1024;

export const isUserFontId = id => typeof id === 'string' && id.startsWith('usuario-font-');

const STYLE_WORDS = /\b(regular|normal|bold|italic|oblique|light|thin|medium|semibold|extrabold|black|heavy|book|roman)\b/gi;

/** "Special-Elite_BoldItalic.ttf" → { family: 'Special Elite', weight: 700, italic: true } */
export function suggestFontMeta(fileName) {
  const base = String(fileName || 'Fonte').replace(/\.[a-z0-9]+$/i, '');
  const spaced = base
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const lower = spaced.toLowerCase();
  let weight = 400;
  if (/\bthin\b/.test(lower)) weight = 100;
  else if (/\bextra ?light\b|\bultra ?light\b/.test(lower)) weight = 200;
  else if (/\blight\b/.test(lower)) weight = 300;
  else if (/\bmedium\b/.test(lower)) weight = 500;
  else if (/\bsemi ?bold\b|\bdemi ?bold\b/.test(lower)) weight = 600;
  else if (/\bextra ?bold\b|\bultra ?bold\b/.test(lower)) weight = 800;
  else if (/\bblack\b|\bheavy\b/.test(lower)) weight = 900;
  else if (/\bbold\b/.test(lower)) weight = 700;
  const italic = /\bitalic\b|\boblique\b/.test(lower);
  const family = spaced.replace(STYLE_WORDS, '').replace(/\s+/g, ' ').trim() || spaced || 'Fonte';
  return { family, weight, italic };
}

export function fontMimeFor(fileName) {
  const ext = String(fileName).toLowerCase().split('.').pop();
  return { ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' }[ext] || 'application/octet-stream';
}

export function validateUserFontFile(file) {
  if (!file) return 'Nenhum arquivo escolhido.';
  if (!/\.(ttf|otf|woff2?)$/i.test(file.name || '')) return 'Use um arquivo .ttf, .otf, .woff ou .woff2.';
  if (file.size > MAX_USER_FONT_BYTES) return 'A fonte passa de 8 MB; escolha um arquivo menor.';
  return null;
}

function slug(text) {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'fonte';
}

export function userFontId(family, weight, italic, stamp = Date.now()) {
  return `usuario-font-${slug(family)}-${weight}${italic ? 'i' : ''}-${stamp.toString(36)}`;
}

export function userFontItem({ family, weight = 400, italic = false, fileName }, stamp = Date.now()) {
  const id = userFontId(family, weight, italic, stamp);
  const ext = String(fileName).toLowerCase().split('.').pop();
  return {
    id,
    kind: 'font',
    name: family,
    family,
    weight,
    style: italic ? 'italic' : 'normal',
    category: USER_FONT_CATEGORY,
    file: `fontes/${id}.${ext}`,
    source: USER_EXPANSION_ID,
  };
}

function tx(db, stores, mode, work) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let result;
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Transação abortada.'));
    result = work(t);
  });
}

/** Adds the font file and its library item; creates the "usuario" expansion record on first use. */
export async function addUserFont(db, meta, file) {
  const item = userFontItem(meta);
  await tx(db, ['expansions', 'items', 'files'], 'readwrite', t => {
    t.objectStore('expansions').put({
      id: USER_EXPANSION_ID,
      name: USER_FONT_CATEGORY,
      description: 'Fontes enviadas deste computador',
      license: 'do usuário',
      createdAt: new Date().toISOString(),
      installedAt: new Date().toISOString(),
      totalBytes: 0,
      itemCount: 0,
    });
    t.objectStore('items').put(item);
    t.objectStore('files').put(file, [USER_EXPANSION_ID, item.file]);
  });
  return item;
}

export async function removeUserFont(db, itemId) {
  if (!isUserFontId(itemId)) return false;
  const item = await new Promise((resolve, reject) => {
    const req = db.transaction(['items'], 'readonly').objectStore('items').get(itemId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  await tx(db, ['items', 'files'], 'readwrite', t => {
    t.objectStore('items').delete(itemId);
    if (item?.file) t.objectStore('files').delete([USER_EXPANSION_ID, item.file]);
  });
  return Boolean(item);
}

/** [{ item, blob }] for the backup. */
export async function listUserFonts(db) {
  const items = await new Promise((resolve, reject) => {
    const req = db.transaction(['items'], 'readonly').objectStore('items').getAll();
    req.onsuccess = () => resolve((req.result || []).filter(i => i.source === USER_EXPANSION_ID));
    req.onerror = () => reject(req.error);
  });
  const out = [];
  for (const item of items) {
    const blob = await new Promise((resolve, reject) => {
      const req = db.transaction(['files'], 'readonly').objectStore('files').get([USER_EXPANSION_ID, item.file]);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (blob) out.push({ item, blob });
  }
  return out;
}

/** Puts a font back with the id it had (backup restore). */
export async function restoreUserFont(db, item, blob) {
  await tx(db, ['expansions', 'items', 'files'], 'readwrite', t => {
    t.objectStore('expansions').put({
      id: USER_EXPANSION_ID,
      name: USER_FONT_CATEGORY,
      description: 'Fontes enviadas deste computador',
      license: 'do usuário',
      createdAt: new Date().toISOString(),
      installedAt: new Date().toISOString(),
      totalBytes: 0,
      itemCount: 0,
    });
    t.objectStore('items').put({ ...item, source: USER_EXPANSION_ID });
    t.objectStore('files').put(blob, [USER_EXPANSION_ID, item.file]);
  });
}
