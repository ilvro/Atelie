import { escapeHTML as esc } from './icons.js';

/**
 * Control kit shared by every panel. Each control keeps one native form
 * element carrying `data-field`; sliders, segments and swatches are companions
 * that write into it, so field handling and undo stay in one place.
 */
const UNITS = { m: 'm', cm: 'cm', mm: 'mm', '%': '%', s: 's', graus: '°' };
const format = value => Number(value).toFixed(3).replace(/\.?0+$/, '') || '0';
/** "Brilho · 0 escuro / 2 claro" → name, optional unit suffix and a hint line. */
export function splitLabel(label) {
  const [name, ...rest] = String(label).split(' · ');
  let unit = '';
  const hints = rest.filter(part => {
    if (part === '0–1') return false;
    if (UNITS[part] && !unit) { unit = UNITS[part]; return false; }
    return true;
  });
  return { name, unit, hint: hints.join(' · ') };
}
const labelMarkup = ({ name, hint }) => `<span class="field-label">${name}${hint ? `<small>${hint}</small>` : ''}</span>`;
/** A bounded quantity is easier to explore than to type: it gets a slider. */
const isRange = (field, min, max, step) => min !== undefined && max !== undefined && (max - min) / step <= 400 && !/seed$/i.test(field);

export function numberField(field, label, value, { min, max, step = .1, disabled = false } = {}) {
  const parts = splitLabel(label), shown = format(value), state = disabled ? 'disabled' : '';
  const limits = `${min === undefined ? '' : `min="${min}"`} ${max === undefined ? '' : `max="${max}"`}`;
  const input = `<span class="value-box"><input type="number" data-field="${field}" value="${shown}" step="${step}" ${limits} ${state}/>${parts.unit ? `<i>${parts.unit}</i>` : ''}</span>`;
  if (!isRange(field, min, max, step)) return `<label class="field measure-field">${labelMarkup(parts)}${input}</label>`;
  const minVal = min ?? 0;
  const maxVal = max ?? 100;
  const numVal = Number(value ?? minVal);
  const pct = maxVal > minVal ? Math.max(0, Math.min(100, ((numVal - minVal) / (maxVal - minVal)) * 100)) : 0;
  return `<label class="field range-field">${labelMarkup(parts)}${input}<input type="range" data-range="${field}" value="${shown}" step="${step}" ${limits} ${state} style="--range-progress:${pct.toFixed(1)}%" tabindex="-1" aria-hidden="true"/></label>`;
}
/** A text box beside a colour picker: the code can be typed or pasted (#a1b2c3, a1b2c3 or #abc), whatever picker the system offers. */
export const hexBox = (field, value) => `<input type="text" class="hex-box" data-hex="${field}" value="${esc(String(value).toLowerCase())}" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Código hexadecimal da cor"/>`;
export const colorField = (field, label, value) => `<label class="field color-field"><span class="field-label">${label}</span><span class="color-pair"><input type="color" data-field="${field}" value="${esc(value)}" />${hexBox(field, value)}</span></label>`;
/** '#ABC', 'a1b2c3' or '#a1b2c3' as '#a1b2c3'; null when it is not a colour. */
export function normalizeHex(text) {
  const code = String(text).trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(code)) return `#${[...code].map(digit => digit + digit).join('')}`;
  return /^[0-9a-f]{6}$/.test(code) ? `#${code}` : null;
}
export const checkField = (field, label, checked) => `<label class="check"><input type="checkbox" data-field="${field}" ${checked ? 'checked' : ''}/><span>${label}</span></label>`;

const optionName = name => String(name).split(' · ');
/**
 * One choice among few. `options` is a list of `[value, name, brief?]`; the
 * button shows `brief`, or the name up to its "· detail", and the tooltip the full name. `swatch(value)` returns the inline
 * markup of a preview, which turns the segments into an image grid.
 */
export function choiceField(field, label, value, options, { swatch, columns, disabled = false } = {}) {
  const native = `<select data-field="${field}" class="choice-native" tabindex="-1" aria-hidden="true" ${disabled ? 'disabled' : ''}>${options.map(([id, name]) => `<option value="${esc(id)}" ${value === id ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select>`;
  const buttons = options.map(([id, name, brief]) => {
    const short = brief ?? optionName(name)[0], active = value === id;
    return `<button type="button" role="radio" aria-checked="${active}" data-choice="${esc(id)}" class="${active ? 'active' : ''}" title="${esc(name)}" ${disabled ? 'disabled' : ''}>${swatch ? swatch(id) : ''}<span>${esc(swatch ? short.split(/ \/ | sobre /)[0] : short)}</span></button>`;
  }).join('');
  const kind = swatch ? 'swatches' : options.length <= 3 ? 'segments' : 'chips';
  return `<div class="field choice-field">${label ? `<span class="field-label">${label}</span>` : ''}${native}<div class="${kind}" role="radiogroup" aria-label="${esc(label || field)}" ${columns ? `style="--columns:${columns}"` : ''}>${buttons}</div></div>`;
}
let activeRangeBubble = null;

function showRangeBubble(range) {
  if (typeof document === 'undefined' || !range) return;
  if (!activeRangeBubble) {
    activeRangeBubble = document.createElement('div');
    activeRangeBubble.className = 'range-tooltip-bubble';
    document.body.appendChild(activeRangeBubble);
  }
  const min = Number(range.min || 0);
  const max = Number(range.max || 100);
  const val = Number(range.value || 0);
  const pct = max > min ? Math.max(0, Math.min(1, (val - min) / (max - min))) : 0;

  activeRangeBubble.textContent = range.value;
  activeRangeBubble.classList.add('visible');

  if (typeof range.getBoundingClientRect === 'function') {
    const rect = range.getBoundingClientRect();
    const thumbX = rect.left + pct * rect.width;
    activeRangeBubble.style.left = `${Math.round(thumbX)}px`;
    activeRangeBubble.style.top = `${Math.round(rect.top - 26)}px`;
  }
}

function hideRangeBubble() {
  if (activeRangeBubble) {
    activeRangeBubble.classList.remove('visible');
    const bubbleToClean = activeRangeBubble;
    setTimeout(() => {
      if (bubbleToClean && !bubbleToClean.classList.contains('visible')) {
        bubbleToClean.remove();
        if (activeRangeBubble === bubbleToClean) activeRangeBubble = null;
      }
    }, 200);
  }
}

/** Wires the companions of every control inside `root` to their native field. */
export function bindControls(root, commit) {
  const numberOf = range => range.closest('.range-field')?.querySelector(`[data-field="${range.dataset.range}"]`);
  const pickerOf = box => box.parentElement?.querySelector(`input[type="color"][data-field="${box.dataset.hex}"]`);
  const syncProgress = range => {
    if (!range) return;
    const min = Number(range.min || 0);
    const max = Number(range.max || 100);
    const val = Number(range.value || 0);
    const pct = max > min ? Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100)) : 0;
    range.style.setProperty('--range-progress', `${pct.toFixed(1)}%`);
  };

  root.querySelectorAll?.('input[type="range"][data-range]').forEach(syncProgress);

  root.addEventListener('pointerdown', event => {
    if (event.target.dataset?.range || event.target.type === 'range') {
      showRangeBubble(event.target);
    }
  });

  const onPointerEnd = () => hideRangeBubble();
  root.addEventListener('pointerup', onPointerEnd);
  root.addEventListener('pointercancel', onPointerEnd);

  root.addEventListener('input', event => {
    const target = event.target;
    if (target.dataset?.range || target.type === 'range') {
      showRangeBubble(target);
    }
    if (target.type === 'color' && target.dataset?.field) { const box = target.parentElement?.querySelector(`[data-hex="${target.dataset.field}"]`); if (box) box.value = target.value; }
    else if (target.dataset?.range) { 
      const number = numberOf(target); 
      if (number) number.value = target.value; 
      syncProgress(target);
    }
    else if (target.type === 'number' && target.closest?.('.range-field')) { 
      const range = target.closest('.range-field').querySelector('[data-range]'); 
      if (range) {
        range.value = target.value; 
        syncProgress(range);
      }
    }
  });
  // A drag ends in a single change, so it is a single undo step.
  root.addEventListener('change', event => {
    hideRangeBubble();
    // A typed code is committed through its picker, as if it had been picked there.
    if (event.target.dataset?.hex) {
      const box = event.target, picker = pickerOf(box), code = normalizeHex(box.value);
      if (!picker) return;
      if (!code) { box.value = picker.value; return; }
      box.value = code;
      if (picker.value !== code) { picker.value = code; commit(picker); }
      return;
    }
    if (!event.target.dataset?.range) return;
    const number = numberOf(event.target);
    if (number) { 
      number.value = event.target.value; 
      syncProgress(event.target);
      commit(number); 
    }
  });

  // Mouse wheel smoothly steps number and range inputs (Shift = 10x, Alt = 0.1x)
  let wheelBubbleTimer = null;
  root.addEventListener('wheel', event => {
    const target = event.target;
    if (!target || target.tagName !== 'INPUT' || (target.type !== 'number' && target.type !== 'range') || target.disabled || target.readOnly) return;

    event.preventDefault();
    const step = Number(target.step) || 1;
    const factor = event.shiftKey ? 10 : (event.altKey ? 0.1 : 1);
    const delta = (event.deltaY < 0 ? 1 : -1) * step * factor;
    let nextVal = Number(target.value || 0) + delta;

    if (target.min !== '' && !isNaN(Number(target.min))) nextVal = Math.max(Number(target.min), nextVal);
    if (target.max !== '' && !isNaN(Number(target.max))) nextVal = Math.min(Number(target.max), nextVal);

    const stepDecimals = Math.max(
      (String(step * factor).split('.')[1] || '').length,
      (String(target.value).split('.')[1] || '').length
    );
    target.value = format(Number(nextVal.toFixed(Math.min(stepDecimals, 3))));

    if (target.type === 'range') {
      showRangeBubble(target);
      syncProgress(target);
      const number = numberOf(target);
      if (number) number.value = target.value;
      if (wheelBubbleTimer) clearTimeout(wheelBubbleTimer);
      wheelBubbleTimer = setTimeout(() => hideRangeBubble(), 600);
    } else {
      const rangeField = target.closest('.range-field');
      if (rangeField) {
        const range = rangeField.querySelector('[data-range]');
        if (range) {
          range.value = target.value;
          syncProgress(range);
        }
      }
    }

    target.dispatchEvent(new Event('input', { bubbles: true }));
    commit(target);
  }, { passive: false });

  root.addEventListener('click', event => {
    const choice = event.target.closest?.('[data-choice]'), select = choice?.closest('.choice-field')?.querySelector('select');
    if (!select || select.disabled || select.value === choice.dataset.choice) return;
    select.value = choice.dataset.choice;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
