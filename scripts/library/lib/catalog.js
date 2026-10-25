/**
 * Catalog helper functions (Etapa 22)
 * Pure functions to parse paths, categories, tags, slugs and IDs for library items.
 */
import { createHash } from 'node:crypto';
import path from 'node:path';

/**
 * Strips bracketed counts, parentheses counts and extra notes from folder or file names.
 * Examples:
 *   'Sangue (14)' → 'Sangue'
 *   'Papéis Rasgados e Chamuscados (16 + 100)' → 'Papéis Rasgados e Chamuscados'
 *   '06-2024 (2º) [Fontes! (100+)]' → '06-2024'
 * @param {string} name
 * @returns {string}
 */
export function stripCount(name) {
  if (!name || typeof name !== 'string') return '';
  let s = name.trim();

  // If starts with standard month folder pattern (MM-YYYY), keep only the MM-YYYY
  const monthMatch = s.match(/^(\d{2}-\d{4})/);
  if (monthMatch) {
    return monthMatch[1];
  }

  // Strip bracketed info: '[Fontes! (100+)]', etc.
  s = s.replace(/\s*\[[^\]]*\]/g, '');

  // Strip count in parentheses: '(16 + 100)', '(14)', '(30)', etc.
  s = s.replace(/\s*\(\d+(?:\s*\+\s*\d+)?\)/g, '');

  // Strip general trailing parentheses with notes like '(2º)' or '(versão 2)'
  s = s.replace(/\s*\([^)]*\)$/g, '');

  return s.trim();
}

/**
 * Checks if a folder name represents a month or year folder (e.g. '01-2024' or '2024').
 * @param {string} name
 * @returns {boolean}
 */
export const isMonthFolder = name => {
  if (!name || typeof name !== 'string') return false;
  return /^\d{2}-\d{4}/.test(name) || /^\d{4}$/.test(name);
};

/**
 * Computes the category of a file from its relative path.
 * The category is the deepest folder that is not year/month (without count).
 * If the file is directly in a month folder, uses the file name without count and extension.
 * For Símbolos, prefixes with Símbolos.
 * @param {string} relativePath
 * @returns {string}
 */
export function categoryOf(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized.split('/');
  const fileName = parts.pop() || '';
  const fileBaseName = fileName.replace(/\.[^.]+$/, '');

  const rootFolder = parts[0]?.toLowerCase() || '';
  const isSymbols = rootFolder === 'simbolos' || rootFolder === 'símbolos';

  // Filter out top-level container folders and month/year folders
  const meaningfulFolders = parts.filter((part, idx) => {
    if (idx === 0 && ['assets', 'documentos', 'extras', 'extras (2)'].includes(part.toLowerCase())) {
      return false;
    }
    return !isMonthFolder(part);
  });

  if (isSymbols) {
    const sub = meaningfulFolders.filter(p => !['simbolos', 'símbolos'].includes(p.toLowerCase())).pop();
    return sub ? `Símbolos · ${stripCount(sub)}` : 'Símbolos';
  }

  if (meaningfulFolders.length > 0) {
    const deepest = meaningfulFolders[meaningfulFolders.length - 1];
    return stripCount(deepest);
  }

  // If directly in month/root folder (e.g. Assets/2024/10-2024/Doodles (30).png)
  return stripCount(fileBaseName);
}

/**
 * Computes display name for an item.
 * E.g. 'Sangue (7).png' → 'Sangue 7'.
 * Names with regular words remain as they are, without extension.
 * @param {string} relativePath
 * @returns {string}
 */
export function displayName(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  const fileName = path.basename(normalized);
  const baseName = fileName.replace(/\.[^.]+$/, '');

  // Pattern: 'Name (number)' → 'Name number'
  const countMatch = baseName.match(/^(.*?)\s*\((\d+)\)$/);
  if (countMatch) {
    const prefix = countMatch[1].trim();
    const num = countMatch[2];
    return prefix ? `${prefix} ${num}` : num;
  }

  return baseName;
}

/**
 * Generates an alphanumeric slug without accents, max 40 chars.
 * @param {string} text
 * @returns {string}
 */
export function slug(text) {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[º°]/g, 'o')
    .replace(/[ª]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

/**
 * Extracts searchable tags from category and item name.
 * Lowercase, without numbers, without words of 1-2 letters, unique, up to 12.
 * @param {string} relativePath
 * @returns {string[]}
 */
export function tagsOf(relativePath) {
  const cat = categoryOf(relativePath);
  const name = displayName(relativePath);

  const combined = `${cat} ${name}`;
  const words = combined
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  const tags = new Set();
  for (const w of words) {
    // Exclude words containing digits or with 1-2 chars
    if (/\d/.test(w)) continue;
    if (w.length <= 2) continue;
    tags.add(w);
    if (tags.size >= 12) break;
  }

  return Array.from(tags);
}

/**
 * Stable element ID based on category slug and SHA-1 hash of relative path.
 * Always prefixed with 'ac-' for Arquivos Confidenciais expansion items.
 * @param {string} relativePath
 * @param {string} prefix
 * @returns {string}
 */
export function elementId(relativePath, prefix = 'ac-') {
  const cat = categoryOf(relativePath);
  const catSlug = slug(cat) || 'item';
  const normalized = relativePath.replace(/\\/g, '/');
  const hash = createHash('sha1').update(normalized, 'utf8').digest('hex').slice(0, 8);
  const pfx = prefix ? (prefix.endsWith('-') ? prefix : `${prefix}-`) : '';
  return `${pfx}el-${catSlug}-${hash}`;
}

/**
 * Stable font ID based on PostScript name slug.
 * Always prefixed with 'ac-' for Arquivos Confidenciais expansion fonts.
 * @param {string} postscriptName
 * @param {string} prefix
 * @returns {string}
 */
export function fontId(postscriptName, prefix = 'ac-') {
  const psSlug = slug(postscriptName) || 'font';
  const pfx = prefix ? (prefix.endsWith('-') ? prefix : `${prefix}-`) : '';
  return `${pfx}font-${psSlug}`;
}
