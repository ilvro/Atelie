import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFolder,
  validateFolder,
  validateFolders,
  renameFolder,
  moveFolder,
  removeFolder,
  folderPath,
} from '../src/domain/folders.js';
import { ValidationError } from '../src/domain/errors.js';

test('createFolder creates a valid folder structure', () => {
  const f = createFolder('Campanha O Segredo', { color: '#ff2244', order: 1 });
  assert.equal(f.name, 'Campanha O Segredo');
  assert.equal(f.color, '#ff2244');
  assert.equal(f.parentId, null);
  assert.equal(f.order, 1);
  assert.ok(f.id.startsWith('fld-'));
  assert.doesNotThrow(() => validateFolder(f));
});

test('validateFolder rejects invalid fields', () => {
  assert.throws(() => validateFolder(null), (err) => err instanceof ValidationError && err.path === 'folder');
  assert.throws(() => validateFolder({ id: '1', name: '' }), (err) => err instanceof ValidationError && err.path === 'folder.name');
  assert.throws(() => validateFolder({ id: '1', name: 'Ok', parentId: '', color: null, order: 0 }), (err) => err instanceof ValidationError && err.path === 'folder.parentId');
  assert.throws(() => validateFolder({ id: '1', name: 'Ok', parentId: null, color: 'blue', order: 0 }), (err) => err instanceof ValidationError && err.path === 'folder.color');
  assert.throws(() => validateFolder({ id: '1', name: 'Ok', parentId: null, color: null, order: NaN }), (err) => err instanceof ValidationError && err.path === 'folder.order');
});

test('validateFolders validates parent existence and unique IDs', () => {
  const f1 = createFolder('Raiz', { id: 'f-1' });
  const f2 = createFolder('Sub', { id: 'f-2', parentId: 'f-1' });
  assert.doesNotThrow(() => validateFolders([f1, f2]));

  // Duplicate ID
  const dup = createFolder('Dup', { id: 'f-1' });
  assert.throws(() => validateFolders([f1, dup]), (err) => err instanceof ValidationError && err.path === 'folders[1].id');

  // Missing parent
  const orphan = createFolder('Orphan', { id: 'f-3', parentId: 'f-unknown' });
  assert.throws(() => validateFolders([f1, orphan]), (err) => err instanceof ValidationError && err.path === 'folders[1].parentId');
});

test('renameFolder updates folder name without mutating original list', () => {
  const f1 = createFolder('Antigo', { id: 'f-1' });
  const list = [f1];
  const updated = renameFolder(list, 'f-1', 'Novo Nome');

  assert.equal(updated[0].name, 'Novo Nome');
  assert.equal(list[0].name, 'Antigo');

  assert.throws(() => renameFolder(list, 'f-1', '   '), (err) => err instanceof ValidationError);
});

test('moveFolder prevents moving into self or any descendant', () => {
  const f1 = createFolder('Avo', { id: 'f-1' });
  const f2 = createFolder('Pai', { id: 'f-2', parentId: 'f-1' });
  const f3 = createFolder('Filho', { id: 'f-3', parentId: 'f-2' });
  const list = [f1, f2, f3];

  // Moving into self -> throws
  assert.throws(
    () => moveFolder(list, 'f-1', 'f-1'),
    (err) => err instanceof ValidationError && err.path === 'parentId'
  );

  // Moving into descendant (f1 into f3) -> throws
  assert.throws(
    () => moveFolder(list, 'f-1', 'f-3'),
    (err) => err instanceof ValidationError && err.path === 'parentId'
  );

  // Valid move: f3 to root (null)
  const moved = moveFolder(list, 'f-3', null);
  assert.equal(moved.find(f => f.id === 'f-3').parentId, null);

  // Valid move: f3 to f1
  const moved2 = moveFolder(list, 'f-3', 'f-1');
  assert.equal(moved2.find(f => f.id === 'f-3').parentId, 'f-1');
});

test('removeFolder removes folder and promotes subfolders to deleted parent', () => {
  const root = createFolder('Root', { id: 'f-root' });
  const sub1 = createFolder('Sub 1', { id: 'f-sub1', parentId: 'f-root' });
  const subChild = createFolder('Sub Child', { id: 'f-child', parentId: 'f-sub1' });
  const list = [root, sub1, subChild];

  const result = removeFolder(list, 'f-sub1');
  assert.equal(result.folders.length, 2);
  assert.deepEqual(result.promotedIds, ['f-child']);
  assert.equal(result.deletedParentId, 'f-root');

  const promotedChild = result.folders.find(f => f.id === 'f-child');
  assert.equal(promotedChild.parentId, 'f-root');
});

test('folderPath returns ordered path of folder names from root to child', () => {
  const f1 = createFolder('Campanhas', { id: 'f-1' });
  const f2 = createFolder('Ordem', { id: 'f-2', parentId: 'f-1' });
  const f3 = createFolder('Missão 1', { id: 'f-3', parentId: 'f-2' });
  const list = [f1, f2, f3];

  assert.deepEqual(folderPath(list, 'f-3'), ['Campanhas', 'Ordem', 'Missão 1']);
  assert.deepEqual(folderPath(list, 'f-1'), ['Campanhas']);
  assert.deepEqual(folderPath(list, 'unknown'), []);
});

