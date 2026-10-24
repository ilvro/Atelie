import { escapeHTML as esc, icon } from './icons.js';

let container = null;

function ensureContainer() {
  if (!container || !document.body.contains(container)) {
    container = document.getElementById('notify-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notify-container';
      container.className = 'notify-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
  }
  return container;
}

/**
 * Shows an atmospheric note notification in the top right.
 * @param {string} message Text or description
 * @param {object} [options]
 * @param {'info'|'ok'|'error'} [options.tone='info']
 * @param {{ label: string, run: () => void }} [options.action]
 * @param {number} [options.duration] Custom duration in ms
 */
export function notify(message, { tone = 'info', action, duration } = {}) {
  const host = ensureContainer();

  // Stack at most 3 notifications at a time
  while (host.children.length >= 3) {
    host.firstElementChild.remove();
  }

  const note = document.createElement('div');
  note.className = `at-note notify-item is-${tone}`;
  note.setAttribute('role', tone === 'error' ? 'alert' : 'status');

  const timeoutMs = duration ?? (tone === 'error' ? 8000 : 4000);

  let html = `<div class="notify-body"><span class="notify-message">${esc(message)}</span></div>`;
  if (action || tone === 'error') {
    html += '<div class="notify-actions">';
    if (action) {
      html += `<button type="button" class="at-btn is-primary notify-action-btn">${esc(action.label)}</button>`;
    }
    html += `<button type="button" class="at-icon-btn notify-close-btn" aria-label="Fechar aviso">${icon('close', 14)}</button>`;
    html += '</div>';
  }

  note.innerHTML = html;

  let timer = null;
  const dismiss = () => {
    if (timer) clearTimeout(timer);
    note.classList.add('dismissing');
    note.addEventListener('transitionend', () => note.remove(), { once: true });
    // Fallback if transition doesn't fire
    setTimeout(() => note.remove(), 250);
  };

  if (action) {
    note.querySelector('.notify-action-btn')?.addEventListener('click', () => {
      dismiss();
      try { action.run(); } catch (err) { console.error(err); }
    });
  }

  note.querySelector('.notify-close-btn')?.addEventListener('click', dismiss);

  host.appendChild(note);

  // Trigger entrance animation
  requestAnimationFrame(() => {
    note.classList.add('visible');
  });

  timer = setTimeout(dismiss, timeoutMs);

  return { close: dismiss, element: note };
}

