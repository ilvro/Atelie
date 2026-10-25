/**
 * Library manifest management (Etapa 22)
 * Pure and I/O helpers to read, merge and atomically write library.json.
 */
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { atomicWrite } from '../../../server/storage.js';

/**
 * Reads the library.json manifest from the given library directory.
 * Returns a default empty manifest if the file does not exist yet.
 * @param {string} libraryDir
 * @returns {Promise<{ schema: number, generatedAt: string, items: Array<object> }>}
 */
export async function readManifest(libraryDir) {
  const manifestPath = path.join(libraryDir, 'library.json');
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      schema: parsed.schema || 1,
      generatedAt: parsed.generatedAt || new Date().toISOString(),
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {
        schema: 1,
        generatedAt: new Date().toISOString(),
        items: [],
      };
    }
    throw err;
  }
}

/**
 * Merges new items into an existing manifest.
 * - Replaces existing items with the same id.
 * - If replaceKinds is specified, removes existing items of those kinds that are not present in new items.
 * - NEVER removes 'template' or 'layer' items.
 * @param {object} manifest
 * @param {Array<object>} newItems
 * @param {{ replaceKinds?: string[] }} options
 * @returns {{ schema: number, generatedAt: string, items: Array<object> }}
 */
export function mergeItems(manifest, newItems = [], { replaceKinds } = {}) {
  const currentItems = Array.isArray(manifest?.items) ? [...manifest.items] : [];
  const incomingMap = new Map();
  for (const item of newItems) {
    if (item && item.id) {
      incomingMap.set(item.id, item);
    }
  }

  // Safe replace kinds (never allow removing templates or layers)
  const safeReplaceKinds = Array.isArray(replaceKinds)
    ? replaceKinds.filter(k => k !== 'template' && k !== 'layer')
    : null;

  const result = [];
  const processedIncomingIds = new Set();

  for (const existing of currentItems) {
    const incoming = incomingMap.get(existing.id);

    if (incoming) {
      // Replace with incoming item
      result.push(incoming);
      processedIncomingIds.add(existing.id);
    } else if (safeReplaceKinds && safeReplaceKinds.includes(existing.kind)) {
      // Omit: this kind was targeted for replacement and item is no longer present
      continue;
    } else {
      // Keep existing item
      result.push(existing);
    }
  }

  // Append new items that were not replacing existing ones
  for (const item of newItems) {
    if (item && item.id && !processedIncomingIds.has(item.id)) {
      result.push(item);
    }
  }

  return {
    schema: manifest?.schema || 1,
    generatedAt: manifest?.generatedAt || new Date().toISOString(),
    items: result,
  };
}

/**
 * Sorts manifest items deterministically and writes library.json atomically.
 * @param {string} libraryDir
 * @param {object} manifest
 */
export async function writeManifest(libraryDir, manifest) {
  await mkdir(libraryDir, { recursive: true });

  const sortedItems = [...(manifest.items || [])].sort((a, b) => {
    // Sort by kind
    const kindA = a.kind || '';
    const kindB = b.kind || '';
    if (kindA !== kindB) return kindA.localeCompare(kindB);

    // Sort by category
    const catA = a.category || '';
    const catB = b.category || '';
    const catCompare = catA.localeCompare(catB, 'pt-BR', { sensitivity: 'base' });
    if (catCompare !== 0) return catCompare;

    // Sort by name
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
  });

  const payload = {
    schema: manifest.schema || 1,
    generatedAt: new Date().toISOString(),
    items: sortedItems,
  };

  const manifestPath = path.join(libraryDir, 'library.json');
  await atomicWrite(manifestPath, JSON.stringify(payload, null, 2) + '\n');
  return payload;
}

