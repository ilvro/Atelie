import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
};

const keymap = await import('../src/ui/keymap.js');
const ev = (key, mods = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });

test('normalizeCombo: letters upper-cased, Meta = Ctrl, Shift only for letters and named keys', () => {
  assert.equal(keymap.normalizeCombo(ev('s', { ctrlKey: true })), 'Ctrl+S');
  assert.equal(keymap.normalizeCombo(ev('s', { metaKey: true })), 'Ctrl+S');
  assert.equal(keymap.normalizeCombo(ev('D', { ctrlKey: true, shiftKey: true })), 'Ctrl+Shift+D');
  assert.equal(keymap.normalizeCombo(ev('?', { shiftKey: true })), '?');
  assert.equal(keymap.normalizeCombo(ev('[', { ctrlKey: true })), 'Ctrl+[');
  assert.equal(keymap.normalizeCombo(ev('Tab', { ctrlKey: true, shiftKey: true })), 'Ctrl+Shift+Tab');
  assert.equal(keymap.normalizeCombo(ev('Escape')), 'Esc');
  assert.equal(keymap.normalizeCombo(ev('Shift', { shiftKey: true })), '', 'a modifier alone is not a combo');
});

test('canonicalCombo accepts loose spellings', () => {
  assert.equal(keymap.canonicalCombo('ctrl+shift+d'), 'Ctrl+Shift+D');
  assert.equal(keymap.canonicalCombo('shift+ctrl+x'), 'Ctrl+Shift+X');
  assert.equal(keymap.canonicalCombo('cmd+k'), 'Ctrl+K');
  assert.equal(keymap.canonicalCombo('p'), 'P');
  assert.equal(keymap.canonicalCombo('?'), '?');
});

test('matches uses the defaults, then the person’s own choice, then the default again after reset', () => {
  keymap.reload();
  assert.equal(keymap.matches(ev('s', { ctrlKey: true }), 'archive'), true);
  assert.equal(keymap.matches(ev('p'), 'reader'), true);
  assert.equal(keymap.matches(ev('p'), 'archive'), false);

  assert.equal(keymap.set('reader', 'Shift+Q'), true);
  assert.equal(keymap.matches(ev('p'), 'reader'), false);
  assert.equal(keymap.matches(ev('Q', { shiftKey: true }), 'reader'), true);
  assert.equal(keymap.label('reader'), 'Shift+Q');
  assert.equal(keymap.isCustomized('reader'), true);
  assert.match(store.get('atelie-settings'), /Shift\+Q/);

  keymap.reset('reader');
  assert.equal(keymap.matches(ev('p'), 'reader'), true);
  assert.equal(keymap.isCustomized('reader'), false);
});

test('fixed shortcuts cannot be changed', () => {
  assert.equal(keymap.set('nudge', 'X'), false);
  assert.equal(keymap.set('delete-layer', 'X'), false);
  assert.equal(keymap.label('delete-layer'), 'Del / Backspace');
});

test('conflicts: same combo in the same scope, or against a global one', () => {
  keymap.reload();
  keymap.reset(null);
  assert.deepEqual(keymap.conflicts('P', 'editor').map(s => s.id), ['reader']);
  assert.deepEqual(keymap.conflicts('P', 'reading').map(s => s.id), [], 'P is free while reading');
  assert.deepEqual(keymap.conflicts('L', 'reading').map(s => s.id), ['reader-loupe']);
  assert.deepEqual(keymap.conflicts('D', 'editor').map(s => s.id), ['documents'], 'a global shortcut blocks every scope');
  assert.deepEqual(keymap.conflicts('P', 'editor', 'reader'), [], 'a shortcut does not conflict with itself');
  assert.deepEqual(keymap.conflicts('ctrl+w', 'editor').map(s => s.id), ['close-tab']);
});

test('B is the brush and Shift+B the library, with no conflict between them', () => {
  keymap.reload();
  keymap.reset(null);
  assert.equal(keymap.matches(ev('b'), 'tool-brush'), true);
  assert.equal(keymap.matches(ev('b'), 'library'), false);
  assert.equal(keymap.matches(ev('B', { shiftKey: true }), 'library'), true);
  assert.equal(keymap.matches(ev('B', { shiftKey: true }), 'tool-brush'), false);
  assert.deepEqual(keymap.conflicts('B', 'editor').map(s => s.id), ['tool-brush']);
  assert.deepEqual(keymap.conflicts('Shift+B', 'editor').map(s => s.id), ['library']);
});

test('isTypingTarget: fields, text areas, contenteditable and an open stage text box all count as typing', () => {
  const none = keymap.isTypingTarget(null);
  assert.equal(none, false);
  assert.equal(keymap.isTypingTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(keymap.isTypingTarget({ tagName: 'INPUT' }), true);
  assert.equal(keymap.isTypingTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(keymap.isTypingTarget({ tagName: 'DIV', getAttribute: n => (n === 'role' ? 'textbox' : null) }), true);
  assert.equal(keymap.isTypingTarget({ tagName: 'BODY', getAttribute: () => null }), false);
});
