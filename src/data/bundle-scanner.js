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
  s = s.replace(/^(?:mini)?bundle\s*\d*\s*[-_:]*\s*/i, '');
  s = s.replace(/\[[^\]]*\]/g, '');
  s = s.replace(/\(parte\s*\d+\)/i, '');
  s = s.replace(/\brework\b/i, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s || 'Documentos';
}

/**
 * Cleans a template file name, removing numeric index and extension.
 * E.g. '1- Bilhete Envelhecido.psd' -> 'Bilhete Envelhecido'
 */
export function cleanTemplateName(fileName) {
  const base = String(fileName || '').replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '');
  const clean = base.replace(/^\d+(?:\.\d+)?\s*[-_.)]\s*/, '').trim();
  return clean || base || 'Documento';
}

/**
 * Extracts leading numeric index from file name if present.
 * E.g. '1- Bilhete.psd' -> '1', '10- Post It.psd' -> '10', '1.1- Alt.psd' -> '1.1'
 */
function extractIndexPrefix(name) {
  const m = String(name || '').replace(/^.*[/\\]/, '').match(/^(\d+(?:\.\d+)?)\s*[-_.)]/);
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
 * Scans a collection of files (FileList, array of File objects, or Map).
 * Groups files into bundles and pairs each PSD with its preview image and fonts.
 */
export async function scanBundleFiles(fileListOrEntries, { signal } = {}) {
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

  // Group files by directory
  // A bundle folder is typically a directory that contains .psd files directly
  const dirFilesMap = new Map();

  for (const { path, file } of fileEntries) {
    if (signal?.aborted) throw new Error('Operação cancelada.');
    const normalizedPath = path.replace(/\\/g, '/');
    const parts = normalizedPath.split('/').filter(Boolean);
    const fileName = parts[parts.length - 1];
    const dirPath = parts.slice(0, -1).join('/') || '.';

    if (!dirFilesMap.has(dirPath)) {
      dirFilesMap.set(dirPath, []);
    }
    dirFilesMap.get(dirPath).push({ path: normalizedPath, fileName, file, parts });
  }

  const bundles = [];
  let totalPsdCount = 0;
  let totalPreviewCount = 0;

  // Find all directories that contain PSDs
  for (const [dirPath, files] of dirFilesMap.entries()) {
    if (signal?.aborted) throw new Error('Operação cancelada.');
    const psdFiles = files.filter(f => isPsdFileName(f.fileName));
    if (psdFiles.length === 0) continue;

    // Determine bundle name and category from dirPath or parts
    const dirParts = dirPath === '.' ? ['Bundle Local'] : dirPath.split('/');
    const rawBundleName = dirParts[dirParts.length - 1] || 'Bundle Local';
    const category = cleanTemplateCategory(rawBundleName);
    const bundleId = `ac-bundle-${slug(category)}-${slug(rawBundleName).slice(0, 12)}`;

    // Look for preview images in Prévias/ (or Previas/ or preview/) relative to this directory
    const previewCandidates = [];
    // 1. In child Prévias subfolder
    const prevDirKey = dirPath === '.' ? 'Prévias' : `${dirPath}/Prévias`;
    const prevDirKeyAlt = dirPath === '.' ? 'Previas' : `${dirPath}/Previas`;
    const prevDirKeyEn = dirPath === '.' ? 'previews' : `${dirPath}/previews`;

    for (const [otherDir, otherFiles] of dirFilesMap.entries()) {
      const normOther = otherDir.toLowerCase();
      if (
        normOther === prevDirKey.toLowerCase() ||
        normOther === prevDirKeyAlt.toLowerCase() ||
        normOther === prevDirKeyEn.toLowerCase() ||
        normOther.endsWith('/prévias') ||
        normOther.endsWith('/previas') ||
        normOther.endsWith('/previews')
      ) {
        for (const f of otherFiles) {
          if (isImageFileName(f.fileName)) previewCandidates.push(f);
        }
      }
    }

    // 2. Also check images in the same folder as PSDs
    for (const f of files) {
      if (isImageFileName(f.fileName)) previewCandidates.push(f);
    }

    // Look for font files in Fontes/ (or Fonts/)
    const fontFiles = [];
    const fontDirKey = dirPath === '.' ? 'Fontes' : `${dirPath}/Fontes`;
    const fontDirKeyEn = dirPath === '.' ? 'Fonts' : `${dirPath}/Fonts`;

    for (const [otherDir, otherFiles] of dirFilesMap.entries()) {
      const normOther = otherDir.toLowerCase();
      if (
        normOther === fontDirKey.toLowerCase() ||
        normOther === fontDirKeyEn.toLowerCase() ||
        normOther.endsWith('/fontes') ||
        normOther.endsWith('/fonts')
      ) {
        for (const f of otherFiles) {
          if (isFontFileName(f.fileName)) fontFiles.push(f.file);
        }
      }
    }

    // Map each PSD to its best matching preview
    const templates = [];

    for (const psd of psdFiles) {
      totalPsdCount++;
      const psdBaseName = psd.fileName.replace(/\.[^.]+$/, '');
      const psdIndex = extractIndexPrefix(psd.fileName);
      const cleanName = cleanTemplateName(psd.fileName);
      const tplId = `ac-jit-${slug(category)}-${slug(cleanName)}-${slug(psdBaseName).slice(0, 8)}`;

      // Find best preview image
      let matchedPreview = null;

      // Match 1: Exact base name
      matchedPreview = previewCandidates.find(p => {
        const pBase = p.fileName.replace(/\.[^.]+$/, '');
        return pBase.toLowerCase() === psdBaseName.toLowerCase();
      });

      // Match 2: Index prefix match (e.g. '1- Bilhete.psd' <-> '1- Bilhete.png' or '1- foto.png')
      if (!matchedPreview && psdIndex) {
        matchedPreview = previewCandidates.find(p => {
          const pIndex = extractIndexPrefix(p.fileName);
          return pIndex === psdIndex;
        });
      }

      // Match 3: Clean name match
      if (!matchedPreview) {
        matchedPreview = previewCandidates.find(p => {
          const pClean = cleanTemplateName(p.fileName);
          return pClean.toLowerCase() === cleanName.toLowerCase();
        });
      }

      if (matchedPreview) totalPreviewCount++;

      templates.push({
        id: tplId,
        name: cleanName,
        category,
        kind: 'template',
        source: bundleId,
        sourceName: rawBundleName,
        status: 'pending', // JIT flag
        fileName: psd.fileName,
        psdPath: psd.path,
        psdFile: psd.file,
        previewPath: matchedPreview ? matchedPreview.path : null,
        previewFile: matchedPreview ? matchedPreview.file : null,
        fontFiles,
        fields: [],
        tags: ['jit', 'bundle'],
      });
    }

    // Sort templates by index or name
    templates.sort((a, b) => a.fileName.localeCompare(b.fileName, 'pt-BR', { numeric: true }));

    bundles.push({
      id: bundleId,
      name: rawBundleName,
      category,
      dirPath,
      templates,
      fontFiles,
      itemCount: templates.length,
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
  const { id, name, category, templates, fontFiles } = bundle;

  // 1. Register expansion metadata
  const expRecord = {
    id,
    name,
    category,
    description: `Bundle JIT com ${templates.length} modelo(s) sob demanda`,
    license: 'Uso pessoal',
    jit: true,
    createdAt: new Date().toISOString(),
    itemCount: templates.length,
  };

  const txExp = db.transaction(['expansions'], 'readwrite');
  await new Promise((res, rej) => {
    const req = txExp.objectStore('expansions').put(expRecord);
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
      source: id,
      sourceName: name,
      status: 'pending',
      file: tpl.psdPath,
      preview: tpl.previewPath || (tpl.previewFile ? `previews/${tpl.id}.png` : null),
      fields: [],
      tags: ['jit', 'bundle'],
    };

    const txItem = db.transaction(['items', 'files'], 'readwrite');
    const itemsStore = txItem.objectStore('items');
    const filesStore = txItem.objectStore('files');

    itemsStore.put(itemRecord);

    // Save preview file in 'files' store if present
    if (tpl.previewFile) {
      const previewKey = itemRecord.preview;
      filesStore.put(tpl.previewFile, [id, previewKey]);
    }

    // Save raw PSD file in 'files' store for JIT conversion
    if (tpl.psdFile) {
      filesStore.put(tpl.psdFile, [id, tpl.psdPath]);
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
      filesStore.put(font, [id, fontKey]);
    }
    await new Promise((res, rej) => {
      txFonts.oncomplete = () => res();
      txFonts.onerror = () => rej(txFonts.error);
    });
  }

  return expRecord;
}

