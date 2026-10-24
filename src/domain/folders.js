import { ValidationError } from './errors.js';

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;

/**
 * Validates a single folder object.
 */
export function validateFolder(folder) {
  if (!folder || typeof folder !== 'object') {
    throw new ValidationError('Pasta deve ser um objeto.', 'folder');
  }

  if (typeof folder.id !== 'string' || !folder.id.trim()) {
    throw new ValidationError('ID da pasta deve ser uma string não vazia.', 'folder.id');
  }

  if (typeof folder.name !== 'string' || !folder.name.trim()) {
    throw new ValidationError('Nome da pasta não pode ser vazio.', 'folder.name');
  }

  if (folder.parentId !== null && (typeof folder.parentId !== 'string' || !folder.parentId.trim())) {
    throw new ValidationError('parentId deve ser null ou string.', 'folder.parentId');
  }

  if (folder.color !== null && (typeof folder.color !== 'string' || !HEX_COLOR_REGEX.test(folder.color))) {
    throw new ValidationError('Cor da pasta deve ser null ou formato #rrggbb.', 'folder.color');
  }

  if (typeof folder.order !== 'number' || !Number.isFinite(folder.order)) {
    throw new ValidationError('Ordem da pasta deve ser um número finito.', 'folder.order');
  }

  return true;
}

/**
 * Validates an array of folders.
 */
export function validateFolders(folders) {
  if (!Array.isArray(folders)) {
    throw new ValidationError('Pastas devem ser um array.', 'folders');
  }

  const ids = new Set();
  for (let i = 0; i < folders.length; i++) {
    const f = folders[i];
    validateFolder(f);
    if (ids.has(f.id)) {
      throw new ValidationError(`ID de pasta repetido: "${f.id}".`, `folders[${i}].id`);
    }
    ids.add(f.id);
  }

  // Ensure parentId references an existing folder or is null
  for (let i = 0; i < folders.length; i++) {
    const f = folders[i];
    if (f.parentId !== null && !ids.has(f.parentId)) {
      throw new ValidationError(`Pasta pai "${f.parentId}" não existe.`, `folders[${i}].parentId`);
    }
  }

  return true;
}

/**
 * Creates a folder object.
 */
export function createFolder(name, { id = null, parentId = null, color = null, order = 0 } = {}) {
  const folder = {
    id: id || 'fld-' + Math.random().toString(36).slice(2, 10),
    name: String(name || '').trim() || 'Nova pasta',
    parentId: parentId || null,
    color: color ? color.toLowerCase() : null,
    order: Number.isFinite(order) ? order : 0,
  };
  validateFolder(folder);
  return folder;
}

/**
 * Renames a folder in the list.
 */
export function renameFolder(folders, id, newName) {
  const trimmed = String(newName || '').trim();
  if (!trimmed) {
    throw new ValidationError('Nome da pasta não pode ser vazio.', 'name');
  }

  return folders.map(f => (f.id === id ? { ...f, name: trimmed } : f));
}

/**
 * Checks whether targetId is a descendant of folderId.
 */
function isDescendant(folders, folderId, targetId) {
  if (!targetId) return false;
  let cur = folders.find(f => f.id === targetId);
  while (cur && cur.parentId) {
    if (cur.parentId === folderId) return true;
    cur = folders.find(f => f.id === cur.parentId);
  }
  return false;
}

/**
 * Moves a folder to a new parent and/or reorders it.
 * Disallows moving a folder into itself or into any of its descendants.
 */
export function moveFolder(folders, id, newParentId, newOrder = null) {
  const target = folders.find(f => f.id === id);
  if (!target) return folders;

  if (newParentId === id) {
    throw new ValidationError('Não é permitido mover uma pasta para dentro de si mesma.', 'parentId');
  }

  if (newParentId !== null && isDescendant(folders, id, newParentId)) {
    throw new ValidationError('Não é permitido mover uma pasta para dentro de uma de suas subpastas.', 'parentId');
  }

  let finalOrder = target.order;
  if (typeof newOrder === 'number') {
    finalOrder = newOrder;
  } else if (newParentId !== target.parentId) {
    // Append at the end of siblings in the new parent
    const siblings = folders.filter(f => f.parentId === newParentId && f.id !== id);
    const maxOrder = siblings.reduce((max, s) => Math.max(max, s.order ?? 0), -1);
    finalOrder = maxOrder + 1;
  }

  return folders.map(f => (f.id === id ? { ...f, parentId: newParentId, order: finalOrder } : f));
}

/**
 * Removes a folder from the list.
 * Any subfolders are promoted to the deleted folder's parentId.
 */
export function removeFolder(folders, id) {
  const target = folders.find(f => f.id === id);
  if (!target) {
    return { folders: [...folders], promotedIds: [] };
  }

  const promotedIds = [];
  const nextFolders = [];

  for (const f of folders) {
    if (f.id === id) continue;
    if (f.parentId === id) {
      promotedIds.push(f.id);
      nextFolders.push({ ...f, parentId: target.parentId });
    } else {
      nextFolders.push(f);
    }
  }

  return { folders: nextFolders, promotedIds, deletedParentId: target.parentId };
}

/**
 * Returns the path of folder names from root down to folder id.
 * e.g. ['Campanha', 'Ato 1', 'Cenas']
 */
export function folderPath(folders, id) {
  if (!id) return [];
  const map = new Map(folders.map(f => [f.id, f]));
  const names = [];
  let cur = map.get(id);
  const seen = new Set();

  while (cur && !seen.has(cur.id)) {
    names.unshift(cur.name);
    seen.add(cur.id);
    cur = cur.parentId ? map.get(cur.parentId) : null;
  }

  return names;
}

