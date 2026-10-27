/**
 * Backup e restauração de dados do Ateliê (Etapa 26)
 * Exporta e importa todos os documentos, pastas e uploads (em base64) para cópia de segurança.
 */

export async function blobToBase64(blob) {
  if (typeof blob === 'string') return blob;
  const arrayBuffer = await blob.arrayBuffer();
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(arrayBuffer).toString('base64');
  }
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBlob(base64, mime = 'image/png') {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64');
    return new Blob([buf], { type: mime });
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Exporta uma cópia de segurança completa contendo documentos, pastas e uploads.
 * @param {object} api Instância da API do Ateliê
 * @returns {Promise<object>} Objeto serializável em JSON
 */
export async function exportBackup(api) {
  if (!api) throw new Error('API do Ateliê é obrigatória.');

  // 1. Handouts
  const summaries = await api.handouts.list();
  const handouts = [];
  for (const s of summaries) {
    try {
      const full = await api.handouts.read(s.id);
      handouts.push(full);
    } catch {
      // Ignora documento ilegível
    }
  }

  // 2. Folders
  let folders = [];
  try {
    const fRes = await api.folders.list();
    folders = fRes?.folders || [];
  } catch {
    folders = [];
  }

  // 3. Uploads
  const uploadsList = await api.uploads.list();
  const uploads = [];
  for (const u of uploadsList) {
    try {
      let blob = null;
      if (typeof api.uploads.getBlob === 'function') {
        blob = await api.uploads.getBlob(u.id);
      } else if (typeof api.uploads.get === 'function') {
        const rec = await api.uploads.get(u.id);
        blob = rec?.blob || null;
      } else if (typeof api.uploads.fileURL === 'function') {
        const url = await api.uploads.fileURL(u.id);
        const res = await fetch(url);
        blob = await res.blob();
      }

      if (blob) {
        const base64 = await blobToBase64(blob);
        uploads.push({
          id: u.id,
          name: u.name,
          mime: u.mime,
          size: u.size,
          width: u.width,
          height: u.height,
          createdAt: u.createdAt,
          base64,
        });
      }
    } catch {
      // Ignora erro individual de upload
    }
  }

  // 4. Fonts sent by the person (private to this browser, so they are not anywhere else)
  const fonts = [];
  try {
    const userFonts = typeof api.expansions?.listUserFonts === 'function' ? await api.expansions.listUserFonts() : [];
    for (const { item, blob } of userFonts) {
      fonts.push({ item, mime: blob.type || 'font/ttf', base64: await blobToBase64(blob) });
    }
  } catch {
    // Ignora fontes ilegíveis
  }

  return {
    schema: 1,
    app: 'atelie',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    handouts,
    folders,
    uploads,
    fonts,
  };
}

/**
 * Importa uma cópia de segurança para o armazenamento atual.
 * Mescla sem apagar o que existe; documentos com o mesmo ID e revisão menor são ignorados.
 * @param {object} api Instância da API do Ateliê
 * @param {object|string} backupData Objeto ou string JSON de backup
 * @returns {Promise<{ importedHandouts: number, skippedHandouts: number, importedUploads: number, totalHandouts: number }>}
 */
export async function importBackup(api, backupData) {
  if (!api) throw new Error('API do Ateliê é obrigatória.');

  let data = backupData;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (err) {
      throw new Error(`Arquivo de backup inválido (JSON malformado): ${err.message}`);
    }
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Conteúdo de backup inválido.');
  }

  if (data.app && data.app !== 'atelie') {
    throw new Error('O arquivo selecionado não é um backup do Ateliê.');
  }

  const result = {
    importedHandouts: 0,
    skippedHandouts: 0,
    importedUploads: 0,
    totalHandouts: Array.isArray(data.handouts) ? data.handouts.length : 0,
  };

  // 1. Mescla Handouts
  if (Array.isArray(data.handouts)) {
    for (const incoming of data.handouts) {
      if (!incoming || !incoming.id) continue;

      let existing = null;
      try {
        existing = await api.handouts.read(incoming.id);
      } catch {
        existing = null;
      }

      if (existing) {
        const existingRev = Number(existing.revision) || 0;
        const incomingRev = Number(incoming.revision) || 0;
        if (incomingRev < existingRev) {
          result.skippedHandouts++;
          continue;
        }
      }

      if (typeof api.handouts.importDoc === 'function') {
        const res = await api.handouts.importDoc(incoming);
        if (res?.imported !== false) {
          result.importedHandouts++;
        } else {
          result.skippedHandouts++;
        }
      } else {
        if (!existing) {
          await api.handouts.create(incoming);
        } else {
          await api.handouts.save({ ...incoming, revision: existing.revision });
        }
        result.importedHandouts++;
      }
    }
  }

  // 2. Mescla Uploads
  if (Array.isArray(data.uploads)) {
    let existingUploads = [];
    try {
      existingUploads = await api.uploads.list();
    } catch {
      existingUploads = [];
    }
    const existingIds = new Set(existingUploads.map(u => u.id));

    for (const up of data.uploads) {
      if (!up || !up.id || existingIds.has(up.id) || !up.base64) continue;
      const blob = base64ToBlob(up.base64, up.mime);
      if (typeof api.uploads.put === 'function') {
        await api.uploads.put({
          id: up.id,
          name: up.name || 'imagem',
          mime: up.mime || 'image/png',
          size: up.size || blob.size,
          width: up.width || 0,
          height: up.height || 0,
          createdAt: up.createdAt || new Date().toISOString(),
          blob,
        });
        result.importedUploads++;
      } else if (typeof api.uploads.send === 'function') {
        const file = new File([blob], up.name || 'imagem', { type: up.mime || 'image/png' });
        await api.uploads.send(file);
        result.importedUploads++;
      }
    }
  }

  // 2b. Restaura fontes enviadas pela pessoa
  result.importedFonts = 0;
  if (Array.isArray(data.fonts) && typeof api.expansions?.restoreUserFont === 'function') {
    let have = new Set();
    try {
      have = new Set((await api.expansions.listUserFonts()).map(f => f.item.id));
    } catch {}
    for (const f of data.fonts) {
      if (!f?.item?.id || !f.base64 || have.has(f.item.id)) continue;
      await api.expansions.restoreUserFont(f.item, base64ToBlob(f.base64, f.mime || 'font/ttf'));
      result.importedFonts++;
    }
  }

  // 3. Mescla Folders (sem remover existentes)
  if (Array.isArray(data.folders) && data.folders.length > 0) {
    try {
      const curRes = await api.folders.list();
      const curFolders = curRes?.folders || [];
      const curMap = new Map(curFolders.map(f => [f.id, f]));
      let added = false;
      for (const f of data.folders) {
        if (f && f.id && !curMap.has(f.id)) {
          curFolders.push(f);
          added = true;
        }
      }
      if (added) {
        await api.folders.save(curFolders, curRes?.revision);
      }
    } catch {
      // Ignora erro em pastas
    }
  }

  return result;
}

