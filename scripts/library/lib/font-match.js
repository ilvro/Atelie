/**
 * Font matching utility (Etapa 25)
 * Pure function mapping a Photoshop PostScript font name to a library font item.
 */

function cleanSlug(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function inferWeight(str) {
  const s = String(str || '').toLowerCase();
  if (s.includes('black') || s.includes('heavy')) return 900;
  if (s.includes('extrabold') || s.includes('ultrabold')) return 800;
  if (s.includes('bold')) return 700;
  if (s.includes('semibold') || s.includes('demibold')) return 600;
  if (s.includes('medium')) return 500;
  if (s.includes('extralight') || s.includes('ultralight')) return 200;
  if (s.includes('light')) return 300;
  if (s.includes('thin')) return 100;
  return 400;
}

function inferItalic(str) {
  const s = String(str || '').toLowerCase();
  return s.includes('italic') || s.includes('oblique');
}

/**
 * Matches a PostScript font name against a list of font items in the library.
 * @param {string} postscript PostScript font name from PSD text layer
 * @param {Array<object>} fonts List of font items from library.json
 * @returns {object | null} Matched font item or null
 */
export function matchFont(postscript, fonts) {
  if (!postscript || !Array.isArray(fonts) || fonts.length === 0) {
    return null;
  }

  const psTrimmed = String(postscript).trim();
  const psLower = psTrimmed.toLowerCase();
  const psSlug = cleanSlug(psTrimmed);

  if (!psSlug) return null;

  // 1. Exact postscript match (case-insensitive)
  for (const item of fonts) {
    if (item.postscript && item.postscript.trim().toLowerCase() === psLower) {
      return item;
    }
  }

  // 2. Slug match: slug(postscript) equals slug(family + subfamily) or slug(fullName / name)
  for (const item of fonts) {
    const familySub = cleanSlug((item.family || '') + (item.subfamily || item.style || ''));
    if (familySub && familySub === psSlug) {
      return item;
    }
    const fullNameSlug = cleanSlug(item.fullName || item.name || '');
    if (fullNameSlug && fullNameSlug === psSlug) {
      return item;
    }
    const postscriptSlug = cleanSlug(item.postscript || '');
    if (postscriptSlug && postscriptSlug === psSlug) {
      return item;
    }
  }

  // 3. Family prefix match: family (without spaces/hyphens) is prefix of postscript
  const targetWeight = inferWeight(psTrimmed);
  const targetItalic = inferItalic(psTrimmed);

  const prefixMatches = [];
  for (const item of fonts) {
    const famSlug = cleanSlug(item.family || '');
    if (famSlug && psSlug.startsWith(famSlug)) {
      prefixMatches.push(item);
    }
  }

  if (prefixMatches.length > 0) {
    // Sort prefix matches by closeness to targetWeight and targetItalic
    prefixMatches.sort((a, b) => {
      const aItalicMatch = (a.style === 'italic') === targetItalic ? 1 : 0;
      const bItalicMatch = (b.style === 'italic') === targetItalic ? 1 : 0;
      if (aItalicMatch !== bItalicMatch) return bItalicMatch - aItalicMatch;

      const aWeightDiff = Math.abs((a.weight ?? 400) - targetWeight);
      const bWeightDiff = Math.abs((b.weight ?? 400) - targetWeight);
      return aWeightDiff - bWeightDiff;
    });

    return prefixMatches[0];
  }

  return null;
}

