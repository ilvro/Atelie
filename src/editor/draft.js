/**
 * Local draft persistence and decision engine using IndexedDB ('atelie-drafts').
 * Drafts safeguard unsaved work across crashes, accidental closes, and reloads.
 */

/**
 * Pure decision function for what to do when opening a document that may have a draft.
 * Returns:
 * - 'none': No draft or draft is identical/stale compared to server.
 * - 'offer': Draft has unarchived changes based on the same revision.
 * - 'conflict': Server revision has progressed beyond draft's base revision (e.g. archived elsewhere).
 *
 * @param {{ draft?: { handout: any, baseRevision: number, savedAt?: string }, serverHandout?: any }} options
 * @returns {'none' | 'offer' | 'conflict'}
 */
export function draftDecision({ draft, serverHandout } = {}) {
  if (!draft || !draft.handout) return 'none';
  if (!serverHandout) return 'offer';

  const baseRev = Number(draft.baseRevision ?? draft.handout.revision ?? 1);
  const serverRev = Number(serverHandout.revision ?? 1);

  // If server revision is higher than draft's base revision, there is a conflict
  if (serverRev > baseRev) {
    return 'conflict';
  }

  // Check if draft is older than the server handout
  const draftTime = new Date(draft.savedAt || draft.handout.updatedAt || 0).getTime();
  const serverTime = new Date(serverHandout.updatedAt || 0).getTime();
  if (serverTime > draftTime) {
    return 'none';
  }

  // Check if content is identical
  if (JSON.stringify(draft.handout) === JSON.stringify(serverHandout)) {
    return 'none';
  }

  return 'offer';
}

function getDatabaseFactory(custom) {
  if (custom) return custom;
  if (typeof indexedDB !== 'undefined') return indexedDB;
  return null;
}

export function openDraftDB(factory) {
  const dbFactory = getDatabaseFactory(factory);
  if (!dbFactory) {
    return Promise.reject(new Error('IndexedDB não suportado para rascunhos.'));
  }

  return new Promise((resolve, reject) => {
    const req = dbFactory.open('atelie-drafts', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Banco de rascunhos bloqueado por outra aba.'));
  });
}

/**
 * Saves a document draft to IndexedDB.
 */
export async function saveDraft(handout, baseRevision, { databaseFactory, savedAt = new Date().toISOString() } = {}) {
  if (!handout || !handout.id) return false;
  const db = await openDraftDB(databaseFactory);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(['drafts'], 'readwrite');
      const store = tx.objectStore('drafts');
      const record = {
        id: handout.id,
        handout,
        baseRevision: Number(baseRevision ?? handout.revision ?? 1),
        savedAt,
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Loads a document draft from IndexedDB.
 */
export async function loadDraft(id, { databaseFactory } = {}) {
  if (!id) return null;
  const db = await openDraftDB(databaseFactory);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(['drafts'], 'readonly');
      const store = tx.objectStore('drafts');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Removes a document draft from IndexedDB.
 */
export async function removeDraft(id, { databaseFactory } = {}) {
  if (!id) return true;
  const db = await openDraftDB(databaseFactory);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(['drafts'], 'readwrite');
      const store = tx.objectStore('drafts');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Lists all active drafts from IndexedDB.
 */
export async function listDrafts({ databaseFactory } = {}) {
  const db = await openDraftDB(databaseFactory);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(['drafts'], 'readonly');
      const store = tx.objectStore('drafts');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

