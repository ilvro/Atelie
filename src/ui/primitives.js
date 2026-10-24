import { escapeHTML as esc } from './icons.js';

/**
 * Returns a stable, deterministic tilt angle between -0.8° and +0.8° based on an ID.
 */
export function tiltOf(id) {
  const str = String(id ?? '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const normalized = ((Math.abs(hash) % 10000) / 10000);
  return Number((normalized * 1.6 - 0.8).toFixed(2));
}

/**
 * Creates tape element markup for headings and labels.
 */
export function tape(text) {
  return `<span class="at-tape">${esc(text || '')}</span>`;
}

/**
 * Creates stamp markup with specified tone ('ink' | 'wax' | 'uv') and optional tilt.
 */
export function stamp(text, { tone = 'ink', tilt } = {}) {
  const rotation = tilt !== undefined ? ` style="transform: rotate(${tilt}deg);"` : '';
  return `<span class="at-stamp is-${esc(tone)}"${rotation}>${esc(text || '').toUpperCase()}</span>`;
}

/**
 * Creates paper card markup with stable rotation.
 */
export function card({ title, subtitle, image, id, attrs = '' } = {}) {
  const tilt = tiltOf(id);
  const safeTitle = esc(title || '');
  const safeSubtitle = subtitle ? `<span class="card-subtitle">${esc(subtitle)}</span>` : '';
  const imgTag = image ? `<div class="card-preview"><img src="${esc(image)}" alt="${safeTitle}" /></div>` : '';
  return `<div class="at-card" style="transform: rotate(${tilt}deg);" data-id="${esc(id || '')}" ${attrs}>
    ${imgTag}
    <div class="card-info">
      <span class="card-title">${safeTitle}</span>
      ${safeSubtitle}
    </div>
  </div>`;
}

