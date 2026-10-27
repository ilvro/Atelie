/**
 * Named checks a lesson step can wait for. Each reads the state of the document and of the editor
 * (never which button was pressed): a step is done when its result exists, whatever path the person took.
 *
 * `state` is { handout, dirty, light, tool, selection, tabs, activeTabId, onMesa, face, hasBack, inspectorTab,
 * drawer, templateDetail, reading: { open, loupe, lantern, flipped }, exported, printed, userFonts, practiceTabs }.
 */

const layers = state => state.handout?.layers ?? [];
const dig = (record, path) => path.split('.').reduce((value, key) => value?.[key], record);

/** Numbers match to a small tolerance; colours and words ignoring case. */
const same = (value, wanted) => typeof wanted === 'number'
  ? typeof value === 'number' && Math.abs(value - wanted) <= Math.max(0.011, Math.abs(wanted) * 0.02)
  : String(value).toLowerCase() === String(wanted).toLowerCase();

/** A layer satisfies a pattern: { kind: 'text', 'text.font.library': '…', light: 'uv' }, values may be { includes } or { not }. */
export function layerMatches(layer, pattern) {
  return Object.entries(pattern).every(([path, wanted]) => {
    const value = dig(layer, path);
    if (wanted && typeof wanted === 'object' && 'includes' in wanted) return String(value ?? '').includes(wanted.includes);
    if (wanted && typeof wanted === 'object' && 'not' in wanted) return !same(value, wanted.not);
    if (wanted && typeof wanted === 'object' && 'set' in wanted) return (value != null && String(value) !== '') === Boolean(wanted.set);
    if (wanted && typeof wanted === 'object' && 'min' in wanted) return typeof value === 'number' && value >= wanted.min;
    if (wanted && typeof wanted === 'object' && 'max' in wanted) return typeof value === 'number' && value <= wanted.max;
    return same(value, wanted);
  });
}

const selectedLayer = state => state.selection;

const hsv = hex => {
  const [r, g, b] = [1, 3, 5].map(start => parseInt(String(hex).slice(start, start + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const range = max - Math.min(r, g, b);
  const hue = !range ? 0 : max === r ? ((g - b) / range + 6) % 6 : max === g ? (b - r) / range + 2 : (r - g) / range + 4;
  return { hue: hue * 60, saturation: max ? range / max : 0, value: max };
};

/**
 * A colour picked by eye counts when it is the same kind of colour: greys by how light they are,
 * the rest by hue (within 25°), saturation and lightness. Nobody hits #5a5d60 with a picker.
 */
export function colourNear(colour, wanted) {
  if (!/^#[0-9a-f]{6}$/i.test(colour ?? '')) return false;
  const a = hsv(colour);
  const b = hsv(wanted);
  const hue = Math.abs(a.hue - b.hue);
  if (b.saturation < 0.15 || b.value < 0.12) return Math.abs(a.value - b.value) <= 0.14 && a.saturation <= Math.max(0.25, b.saturation + 0.15);
  return Math.min(hue, 360 - hue) <= 25 && Math.abs(a.saturation - b.saturation) <= 0.35 && Math.abs(a.value - b.value) <= 0.3;
}

export const CONDITIONS = {
  /** Never true by itself: an explanation the person leaves with "Continuar". */
  read: () => false,

  // --- Where the person is
  tab: (state, name) => state.inspectorTab === name,
  drawer: (state, name) => state.drawer === name,
  drawerClosed: state => !state.drawer,
  templateDetail: state => state.templateDetail,
  docNamed: (state, text) => String(state.handout?.name ?? '').includes(text),
  onMesa: state => state.onMesa,
  onDocument: state => !state.onMesa && Boolean(state.handout),
  tabs: (state, number) => state.tabs.length >= number,
  /** Tabs opened for the practice (the person's own tabs do not count). */
  practiceTabs: (state, number) => state.practiceTabs >= number,
  librarySearch: (state, text) => String(state.librarySearch ?? '').toLowerCase().includes(String(text).toLowerCase()),
  libraryTab: (state, name) => state.libraryTab === name,
  fontDialog: state => state.fontDialog,
  tool: (state, name) => state.tool === name,
  noSelection: state => !state.selection,
  uvOn: state => state.light === 'uv',
  uvOff: state => state.light !== 'uv',
  archived: state => Boolean(state.handout) && state.handout.revision > 0 && !state.dirty,
  face: (state, name) => state.face === name,
  hasBack: state => state.hasBack,
  noBack: state => Boolean(state.handout) && !state.hasBack,
  reading: (state, on = true) => state.reading.open === on,
  loupe: state => state.reading.open && state.reading.loupe,
  lantern: state => state.reading.open && state.reading.lantern,
  flipped: state => state.reading.open && state.reading.flipped,
  exported: (state, target) => state.exported.includes(target),
  userFonts: (state, number = 1) => state.userFonts >= number,

  // --- What the document holds
  layerCount: (state, kind, number = 1) => layers(state).filter(layer => layer.kind === kind).length >= number,
  /** A layer that came from this library item exists. */
  layerFrom: (state, id) => layers(state).some(layer => layer.image?.src?.library === id),
  /** Some layer satisfies the pattern. */
  layerWhere: (state, pattern) => layers(state).some(layer => layerMatches(layer, pattern)),
  /** At least `number` layers satisfy the pattern. */
  layersWhere: (state, pattern, number) => layers(state).filter(layer => layerMatches(layer, pattern)).length >= number,
  /** The selected layer satisfies the pattern. */
  selected: (state, pattern) => Boolean(selectedLayer(state)) && layerMatches(selectedLayer(state), pattern),
  /** The text of the layer with this id says exactly this. */
  layerText: (state, id, text) => layers(state).some(layer => layer.id === id && layer.text?.content === text),
  /** The text of the selected layer contains this. */
  selectedText: (state, text) => String(selectedLayer(state)?.text?.content ?? '').includes(text),
  /** The selected text layer's colour is near this one. */
  textColorNear: (state, hex) => colourNear(selectedLayer(state)?.text?.color, hex),
  /** The selected layer's path (rotation, opacity…) is near this value. */
  layerNear: (state, path, wanted, tolerance = 0.6) => {
    const value = dig(selectedLayer(state) ?? {}, path);
    return typeof value === 'number' && Math.abs(value - wanted) <= tolerance;
  },
  /** The page's own setting (page.uv.strength…) is near this value. */
  pageNear: (state, path, wanted, tolerance = 0.03) => {
    const value = dig(state.handout?.page ?? {}, path);
    return typeof value === 'number' && Math.abs(value - wanted) <= tolerance;
  },
};

/** Whether a step's condition holds: one condition, or a list that must all hold. */
export function met(done, state) {
  if (!done) return false;
  if (Array.isArray(done[0])) return done.every(one => met(one, state));
  const [name, ...args] = done;
  const check = CONDITIONS[name];
  if (!check) throw new Error(`Condição de tutorial desconhecida: ${name}`);
  return Boolean(check(state, ...args));
}

/**
 * "Quase lá": for conditions reached by degrees, how far the step still is, as { left, text }.
 * Null for conditions that are either true or not.
 */
export function measure(done, state) {
  if (!done || Array.isArray(done[0])) {
    return Array.isArray(done?.[0]) ? done.map(one => measure(one, state)).find(Boolean) ?? null : null;
  }
  const [name, path, wanted, tolerance = 0.6] = done;
  if (name !== 'layerNear') return null;
  const value = dig(selectedLayer(state) ?? {}, path);
  if (typeof value !== 'number') return null;
  const left = Math.abs(value - wanted);
  const show = number => String(Math.round(number * 10) / 10).replace('.', ',');
  const unit = path === 'rotation' ? '°' : path === 'opacity' ? '' : '';
  const label = path === 'rotation' ? 'ângulo' : path === 'opacity' ? 'opacidade' : path;
  return { left: Math.max(0, left - tolerance), text: left <= tolerance ? `${label} ${show(value)}${unit}: certo` : `${label} ${show(value)}${unit} de ${show(wanted)}${unit}` };
}
