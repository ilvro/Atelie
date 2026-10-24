import test from 'node:test';
import assert from 'node:assert/strict';
import { draftDecision, saveDraft, loadDraft, removeDraft, listDrafts } from '../src/editor/draft.js';

test('draftDecision pure logic covers none, offer, and conflict', () => {
  // 1. No draft -> 'none'
  assert.equal(draftDecision(), 'none');
  assert.equal(draftDecision({ draft: null, serverHandout: { id: 'doc-1', revision: 1 } }), 'none');

  // 2. Draft exists but server document doesn't (or was deleted) -> 'offer'
  assert.equal(draftDecision({
    draft: { handout: { id: 'doc-1', name: 'Doc' }, baseRevision: 1, savedAt: '2026-01-02T10:00:00Z' },
    serverHandout: null,
  }), 'offer');

  // 3. Draft is identical to server handout -> 'none'
  const identicalServer = { id: 'doc-1', name: 'Doc', revision: 1, updatedAt: '2026-01-02T09:00:00Z' };
  assert.equal(draftDecision({
    draft: { handout: { id: 'doc-1', name: 'Doc', revision: 1, updatedAt: '2026-01-02T09:00:00Z' }, baseRevision: 1, savedAt: '2026-01-02T10:00:00Z' },
    serverHandout: identicalServer,
  }), 'none');

  // 4. Draft has changes and server is at same revision -> 'offer'
  assert.equal(draftDecision({
    draft: { handout: { id: 'doc-1', name: 'Doc Editado' }, baseRevision: 1, savedAt: '2026-01-02T10:00:00Z' },
    serverHandout: { id: 'doc-1', name: 'Doc', revision: 1, updatedAt: '2026-01-02T09:00:00Z' },
  }), 'offer');

  // 5. Server revision bumped beyond draft baseRevision -> 'conflict'
  assert.equal(draftDecision({
    draft: { handout: { id: 'doc-1', name: 'Doc Meu' }, baseRevision: 1, savedAt: '2026-01-02T10:00:00Z' },
    serverHandout: { id: 'doc-1', name: 'Doc Outra Aba', revision: 2, updatedAt: '2026-01-02T11:00:00Z' },
  }), 'conflict');

  // 6. Server updatedAt is newer than draft savedAt at same revision -> 'none'
  assert.equal(draftDecision({
    draft: { handout: { id: 'doc-1', name: 'Stale Draft' }, baseRevision: 1, savedAt: '2026-01-02T08:00:00Z' },
    serverHandout: { id: 'doc-1', name: 'Newer Server', revision: 1, updatedAt: '2026-01-02T10:00:00Z' },
  }), 'none');
});

test('draft storage with mock IndexedDB: save, load, list, and remove', async () => {
  // In-memory mock IndexedDB factory
  const storage = new Map();
  const mockFactory = {
    open(name, version) {
      const openReq = {
        result: {
          objectStoreNames: { contains: () => true },
          transaction(stores, mode) {
            return {
              objectStore(storeName) {
                return {
                  put(record) {
                    const req = {};
                    setTimeout(() => {
                      storage.set(record.id, record);
                      req.onsuccess?.();
                    }, 0);
                    return req;
                  },
                  get(id) {
                    const req = {};
                    setTimeout(() => {
                      req.result = storage.get(id);
                      req.onsuccess?.();
                    }, 0);
                    return req;
                  },
                  delete(id) {
                    const req = {};
                    setTimeout(() => {
                      storage.delete(id);
                      req.onsuccess?.();
                    }, 0);
                    return req;
                  },
                  getAll() {
                    const req = {};
                    setTimeout(() => {
                      req.result = Array.from(storage.values());
                      req.onsuccess?.();
                    }, 0);
                    return req;
                  },
                };
              },
            };
          },
          close() {},
        },
      };
      setTimeout(() => openReq.onsuccess?.(), 0);
      return openReq;
    },
  };

  const doc = { id: 'h-123', name: 'Rascunho de Investigação', revision: 1 };
  await saveDraft(doc, 1, { databaseFactory: mockFactory });

  const loaded = await loadDraft('h-123', { databaseFactory: mockFactory });
  assert.equal(loaded.id, 'h-123');
  assert.equal(loaded.baseRevision, 1);
  assert.equal(loaded.handout.name, 'Rascunho de Investigação');

  const all = await listDrafts({ databaseFactory: mockFactory });
  assert.equal(all.length, 1);

  await removeDraft('h-123', { databaseFactory: mockFactory });
  const afterRemove = await loadDraft('h-123', { databaseFactory: mockFactory });
  assert.equal(afterRemove, null);
});

