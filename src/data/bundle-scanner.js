/**
 * Bundle Scanner for Just-In-Time (JIT) PSD import in browser (Etapa 30).
 * Scans local bundle folders shallowly (zero heavy RAM), associates PSD files with
 * pre-existing preview images and fonts, and registers them as pending JIT templates.
 */

/**
 * Normalizes text removing diacritics and special characters for slug generation.
 */
export function slug(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

/**
 * Cleans a bundle or folder name into a friendly category.
 * E.g. 'Bundle 18 - Bilhetes e Notas (PARTE 2)' -> 'Bilhetes e Notas'
 */
export function cleanTemplateCategory(folderOrBundleName) {
  if (!folderOrBundleName) return 'Documentos';
  let s = String(folderOrBundleName).trim();
  s = s.replace(/\b(?:mini)?bundle\s*\d*\b/gi, '');
  s = s.replace(/\[[^\]]*\]/g, '');
  s = s.replace(/\(parte\s*\d+\)/gi, '');
  s = s.replace(/\brework\b/gi, '');
  s = s.replace(/^[-_:\s]+|[-_:\s]+$/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s || 'Documentos';
}

/**
 * Cleans a template file name, removing numeric index and extension.
 * E.g. '1- Bilhete Envelhecido.psd' -> 'Bilhete Envelhecido'
 */
export function cleanTemplateName(fileName, category = '') {
  const base = String(fileName || '').replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '');
  let clean = base
    .replace(/^mockup\s*\d*\s*[-_.)]?\s*/i, '')
    .replace(/^\d+(?:\.\d+)?\s*[-_.)]\s*/, '')
    .trim();
  clean = clean.replace(/^\((.*)\)$/, '$1').trim();
  clean = clean.replace(/^[-\s_]+|[-\s_]+$/g, '');

  if (!clean) {
    clean = base;
  }
  if (/^\d+$/.test(clean) && category && category !== 'Documentos') {
    const prefix = category.replace(/^Modelos de\s+/i, '').replace(/s$/i, '');
    clean = `${prefix} ${clean}`;
  }
  return clean || base || 'Documento';
}

/**
 * Extracts leading numeric index or prefix from file name if present.
 * E.g. '1- Bilhete.psd' -> '1', '10- Post It.psd' -> '10', 'Mockup 1.psd' -> '1'
 */
function extractIndexPrefix(name) {
  const base = String(name || '').replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '');
  const m = base.match(/^(?:mockup\s*)?(\d+(?:\.\d+)?)\b/i) || base.match(/^(\d+(?:\.\d+)?)\s*[-_.)]/);
  return m ? m[1] : null;
}

/**
 * Checks if a filename is an image.
 */
function isImageFileName(name) {
  return /\.(png|jpe?g|webp)$/i.test(name);
}

/**
 * Checks if a filename is a PSD/PSB file.
 */
function isPsdFileName(name) {
  return /\.(psd|psb)$/i.test(name);
}

/**
 * Checks if a filename is a font file or font zip.
 */
function isFontFileName(name) {
  return /\.(ttf|otf|woff2?|zip)$/i.test(name);
}

/**
 * Determines the logical bundle root directory and raw name for a given PSD path.
 * Handles arbitrarily nested directories (e.g. miniBundle68/miniBundle68/...)
 * and multi-bundle root selections (e.g. Documentos/Bundle 18/...).
 */
export function getBundleInfo(psdPath) {
  const parts = psdPath.replace(/\\/g, '/').split('/').filter(Boolean);
  const dirParts = parts.slice(0, -1);
  if (dirParts.length === 0) {
    return { bundleDirPath: '.', rawBundleName: 'Bundle Local' };
  }

  // Look for directory segment matching bundle/minibundle
  const bundleIdx = dirParts.findIndex(p => /(?:mini)?bundle\s*\d+/i.test(p));
  if (bundleIdx !== -1) {
    return {
      bundleDirPath: dirParts.slice(0, bundleIdx + 1).join('/'),
      rawBundleName: dirParts[bundleIdx],
    };
  }

  // Strip technical subfolders (e.g. PSDs, Arquivos, Modelos)
  const technical = /^(?:psds?|arquivos?|files?|modelos?|templates?|artes?)$/i;
  let endIdx = dirParts.length - 1;
  while (endIdx > 0 && technical.test(dirParts[endIdx])) {
    endIdx--;
  }

  return {
    bundleDirPath: dirParts.slice(0, endIdx + 1).join('/'),
    rawBundleName: dirParts[endIdx] || 'Bundle Local',
  };
}

/**
 * Scans a collection of files (FileList, array of File objects, or Map).
 * Groups files into bundles and pairs each PSD with its preview image and fonts.
 */
export async function scanBundleFiles(fileListOrEntries, { signal, sourceId, sourceName } = {}) {
  const fileEntries = [];

  // Normalize entries
  if (fileListOrEntries instanceof Map) {
    for (const [path, file] of fileListOrEntries.entries()) {
      fileEntries.push({ path, file });
    }
  } else if (Array.isArray(fileListOrEntries)) {
    for (const item of fileListOrEntries) {
      const path = item.webkitRelativePath || item.path || item.name;
      fileEntries.push({ path, file: item });
    }
  } else if (fileListOrEntries && typeof fileListOrEntries.length === 'number') {
    for (let i = 0; i < fileListOrEntries.length; i++) {
      const file = fileListOrEntries[i];
      const path = file.webkitRelativePath || file.name;
      fileEntries.push({ path, file });
    }
  }

  // Filter out invalid/temporary/metadata files
  const validFiles = [];
  for (const entry of fileEntries) {
    if (signal?.aborted) throw new Error('Operação cancelada.');
    const normalizedPath = String(entry.path || '').replace(/\\/g, '/');
    const parts = normalizedPath.split('/').filter(Boolean);
    if (parts.length === 0) continue;
    const fileName = parts[parts.length - 1];

    if (parts.some(p => p === '__MACOSX')) continue;
    if (fileName.startsWith('.') || fileName.startsWith('._') || fileName.startsWith('~$') || fileName.toLowerCase() === 'thumbs.db') continue;

    const dirPath = parts.slice(0, -1).join('/') || '.';
    validFiles.push({
      path: normalizedPath,
      parts,
      fileName,
      dirPath,
      file: entry.file,
    });
  }

  const psdEntries = validFiles.filter(f => isPsdFileName(f.fileName));
  const imageEntries = validFiles.filter(f => isImageFileName(f.fileName));
  const fontEntries = validFiles.filter(f => isFontFileName(f.fileName));

  // Group PSDs by their logical bundle folder
  const bundleMap = new Map();

  for (const psd of psdEntries) {
    const { bundleDirPath, rawBundleName } = getBundleInfo(psd.path);
    if (!bundleMap.has(bundleDirPath)) {
      bundleMap.set(bundleDirPath, {
        bundleDirPath,
        rawBundleName,
        psds: [],
      });
    }
    bundleMap.get(bundleDirPath).psds.push(psd);
  }

  const bundles = [];
  let totalPsdCount = 0;
  let totalPreviewCount = 0;

  for (const [bundleDirPath, bundleGroup] of bundleMap.entries()) {
    if (signal?.aborted) throw new Error('Operação cancelada.');
    const { rawBundleName, psds } = bundleGroup;
    const category = cleanTemplateCategory(rawBundleName);
    const bundleId = `ac-bundle-${slug(category)}-${slug(rawBundleName).slice(0, 14)}`;

    // Preview candidates for this bundle
    const prefix = bundleDirPath === '.' ? '' : `${bundleDirPath.toLowerCase()}/`;
    const previewCandidates = imageEntries.filter(img => {
      const p = img.path.toLowerCase();
      if (bundleDirPath === '.') return true;
      return p === bundleDirPath.toLowerCase() || p.startsWith(prefix);
    });

    // Font files for this bundle
    const bundleFontFiles = fontEntries
      .filter(f => {
        const p = f.path.toLowerCase();
        if (bundleDirPath === '.') return true;
        return p === bundleDirPath.toLowerCase() || p.startsWith(prefix);
      })
      .map(f => f.file);

    psds.sort((a, b) => a.fileName.localeCompare(b.fileName, 'pt-BR', { numeric: true }));
    previewCandidates.sort((a, b) => a.fileName.localeCompare(b.fileName, 'pt-BR', { numeric: true }));

    const templates = [];

    for (let i = 0; i < psds.length; i++) {
      const psd = psds[i];
      totalPsdCount++;
      const psdBaseName = psd.fileName.replace(/\.[^.]+$/, '');
      const psdIndex = extractIndexPrefix(psd.fileName);
      const cleanName = cleanTemplateName(psd.fileName, category);
      const tplId = `ac-jit-${slug(category)}-${slug(cleanName)}-${slug(psdBaseName).slice(0, 8)}`;

      let matchedPreview = null;

      // 1. Exact base name
      matchedPreview = previewCandidates.find(p => {
        const pBase = p.fileName.replace(/\.[^.]+$/, '');
        return pBase.toLowerCase() === psdBaseName.toLowerCase();
      });

      // 2. Index prefix match
      if (!matchedPreview && psdIndex) {
        matchedPreview = previewCandidates.find(p => {
          const pIndex = extractIndexPrefix(p.fileName);
          return pIndex === psdIndex;
        });
      }

      // 3. Clean name match
      if (!matchedPreview) {
        matchedPreview = previewCandidates.find(p => {
          const pClean = cleanTemplateName(p.fileName, category);
          return pClean.toLowerCase() === cleanName.toLowerCase();
        });
      }

      // 4. Single-item fallback
      if (!matchedPreview && psds.length === 1 && previewCandidates.length === 1) {
        matchedPreview = previewCandidates[0];
      }

      // 5. Sorted order fallback
      if (!matchedPreview && psds.length === previewCandidates.length) {
        matchedPreview = previewCandidates[i];
      }

      if (matchedPreview) totalPreviewCount++;

      const effSourceId = sourceId || 'arquivos-confidenciais';
      const effSourceName = sourceName || 'Arquivos Confidenciais';

      templates.push({
        id: tplId,
        name: cleanName,
        category,
        kind: 'template',
        source: effSourceId,
        sourceName: effSourceName,
        bundle: bundleId,
        bundleName: rawBundleName,
        status: 'pending', // JIT flag
        fileName: psd.fileName,
        psdPath: psd.path,
        psdFile: psd.file,
        previewPath: matchedPreview ? matchedPreview.path : null,
        previewFile: matchedPreview ? matchedPreview.file : null,
        fontFiles: bundleFontFiles,
        fields: [],
        tags: ['jit', 'bundle', 'arquivos-confidenciais'],
      });
    }

    bundles.push({
      id: bundleId,
      name: rawBundleName,
      category,
      dirPath: bundleDirPath,
      templates,
      fontFiles: bundleFontFiles,
      itemCount: templates.length,
      expansionId: sourceId || 'arquivos-confidenciais',
      expansionName: sourceName || 'Arquivos Confidenciais',
    });
  }

  return {
    bundles,
    totalPsdCount,
    totalPreviewCount,
  };
}

/**
 * Registers a scanned JIT bundle into IndexedDB atelie-expansions-v1.
 */
export async function registerJitBundle(db, bundle, { onProgress, signal } = {}) {
  const { id: bundleId, name: bundleName, templates, fontFiles } = bundle;
  const expansionId = bundle.expansionId || 'arquivos-confidenciais';
  const expansionName = bundle.expansionName || 'Arquivos Confidenciais';

  // 1. Register or update expansion metadata
  const txExp = db.transaction(['expansions'], 'readwrite');
  const expStore = txExp.objectStore('expansions');
  const existingExp = await new Promise((res) => {
    const req = expStore.get(expansionId);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => res(null);
  });

  const expRecord = {
    id: expansionId,
    name: existingExp?.name || expansionName,
    category: existingExp?.category || 'Acervo',
    description: existingExp?.description || 'Acervo Arquivos Confidenciais (JIT)',
    license: existingExp?.license || 'Uso pessoal',
    jit: true,
    createdAt: existingExp?.createdAt || new Date().toISOString(),
    itemCount: (existingExp?.itemCount || 0) + templates.length,
  };

  await new Promise((res, rej) => {
    const req = expStore.put(expRecord);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });

  // 2. Register items and files
  const total = templates.length;
  let processed = 0;

  for (const tpl of templates) {
    if (signal?.aborted) throw new Error('Operação cancelada.');

    // Save item in 'items' store
    const itemRecord = {
      id: tpl.id,
      name: tpl.name,
      category: tpl.category,
      kind: 'template',
      source: expansionId,
      sourceName: expansionName,
      bundle: bundleId,
      bundleName,
      status: 'pending',
      file: tpl.psdPath,
      preview: tpl.previewPath || (tpl.previewFile ? `previews/${tpl.id}.png` : null),
      fields: [],
      tags: ['jit', 'bundle', 'arquivos-confidenciais'],
    };

    const txItem = db.transaction(['items', 'files'], 'readwrite');
    const itemsStore = txItem.objectStore('items');
    const filesStore = txItem.objectStore('files');

    itemsStore.put(itemRecord);

    // Save preview file in 'files' store if present
    if (tpl.previewFile) {
      const previewKey = itemRecord.preview;
      filesStore.put(tpl.previewFile, [expansionId, previewKey]);
    }

    // Save raw PSD file in 'files' store for JIT conversion
    if (tpl.psdFile) {
      filesStore.put(tpl.psdFile, [expansionId, tpl.psdPath]);
    }

    await new Promise((res, rej) => {
      txItem.oncomplete = () => res();
      txItem.onerror = () => rej(txItem.error);
    });

    processed++;
    onProgress?.({ processed, total, percent: Math.round((processed / total) * 100) });
  }

  // 3. Save fonts into 'files' store
  if (Array.isArray(fontFiles) && fontFiles.length > 0) {
    const txFonts = db.transaction(['files'], 'readwrite');
    const filesStore = txFonts.objectStore('files');
    for (const font of fontFiles) {
      const fontKey = `fonts/${font.name}`;
      filesStore.put(font, [expansionId, fontKey]);
    }
    await new Promise((res, rej) => {
      txFonts.oncomplete = () => res();
      txFonts.onerror = () => rej(txFonts.error);
    });
  }

  return expRecord;
}

