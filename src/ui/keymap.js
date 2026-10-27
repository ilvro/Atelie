import { SHORTCUTS } from './shortcuts.js';

/**
 * Registry of keyboard shortcuts: defaults come from SHORTCUTS, the person's own choices
 * live in settings.shortcuts ({ [id]: combo }). Handlers ask `matches(event, id)`.
 *
 * Combos are written like "Ctrl+Shift+D" or "P". Meta counts as Ctrl. Shift is part of the
 * combo only for letters and named keys: for symbols ("?", "[") the character already says it.
 */

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'AltGraph']);

const KEY_NAMES = {
  ' ': 'Espaço',
  Escape: 'Esc',
  Delete: 'Del',
};

export function normalizeCombo(event) {
  const key = event.key;
  if (!key || MODIFIER_KEYS.has(key)) return '';
  const parts = [];
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  const named = key.length > 1;
  const letter = /^[a-z]$/i.test(key);
  if (event.shiftKey && (named || letter)) parts.push('Shift');
  parts.push(letter ? key.toUpperCase() : (KEY_NAMES[key] || key));
  return parts.join('+');
}

/** "ctrl+shift+d" / "Ctrl+Shift+D" → "Ctrl+Shift+D" */
export function canonicalCombo(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const pieces = raw.split('+').filter((p, i, all) => p !== '' || i === all.length - 1);
  // A trailing "+" key ("Ctrl++") leaves an empty last piece.
  const last = raw.endsWith('+') ? '+' : pieces.pop();
  const mods = new Set(pieces.map(p => p.trim().toLowerCase()));
  const out = [];
  if (mods.has('ctrl') || mods.has('cmd') || mods.has('meta')) out.push('Ctrl');
  if (mods.has('alt')) out.push('Alt');
  if (mods.has('shift')) out.push('Shift');
  const key = last.trim();
  out.push(/^[a-z]$/i.test(key) ? key.toUpperCase() : (KEY_NAMES[key] || key));
  return out.join('+');
}

function sameScope(a, b) {
  return a === b || a === 'global' || b === 'global';
}

function readOverrides() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('atelie-settings') : null;
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed.shortcuts === 'object' && parsed.shortcuts ? parsed.shortcuts : {};
  } catch {
    return {};
  }
}

function writeOverrides(next) {
  try {
    const raw = localStorage.getItem('atelie-settings');
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.shortcuts = next;
    localStorage.setItem('atelie-settings', JSON.stringify(parsed));
  } catch {}
}

let overrides = null;
function currentOverrides() {
  if (!overrides) overrides = readOverrides();
  return overrides;
}

export function byId(id) {
  return SHORTCUTS.find(s => s.id === id) || null;
}

/** The combo in use for a shortcut (the person's choice, else the default). */
export function comboFor(id) {
  const entry = byId(id);
  if (!entry) return '';
  const own = currentOverrides()[id];
  return canonicalCombo(own || entry.combo || entry.key);
}

export function matches(event, id) {
  const entry = byId(id);
  if (!entry) return false;
  const combo = comboFor(id);
  return Boolean(combo) && normalizeCombo(event) === combo;
}

/** What to show on screen for this shortcut. */
export function label(id) {
  const entry = byId(id);
  if (!entry) return '';
  return entry.configurable === false ? entry.key : comboFor(id);
}

export function isCustomized(id) {
  return Boolean(currentOverrides()[id]);
}

/** Shortcuts that already use `combo` in a scope that overlaps `scope` (ignoring `exceptId`). */
export function conflicts(combo, scope = 'editor', exceptId = null) {
  const wanted = canonicalCombo(combo);
  return SHORTCUTS.filter(s => s.id !== exceptId && sameScope(s.scope || 'editor', scope) && comboFor(s.id) === wanted);
}

export function set(id, combo) {
  const entry = byId(id);
  if (!entry || entry.configurable === false) return false;
  const canon = canonicalCombo(combo);
  if (!canon) return false;
  const next = { ...currentOverrides(), [id]: canon };
  overrides = next;
  writeOverrides(next);
  return true;
}

export function reset(id) {
  if (id == null) {
    overrides = {};
    writeOverrides({});
    return;
  }
  const next = { ...currentOverrides() };
  delete next[id];
  overrides = next;
  writeOverrides(next);
}

/** Forget the cached overrides (settings changed elsewhere, or tests). */
export function reload() {
  overrides = null;
}
