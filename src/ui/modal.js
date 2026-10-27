/**
 * Liga o comportamento comum dos modais criados por JS (`.at-modal-backdrop`):
 * Esc e clique no fundo cancelam, o foco vai para o botão principal e volta
 * para quem o tinha ao fechar. Sem `onCancel`, Esc e o fundo não fazem nada.
 */
export function wireModal(backdrop, { onCancel = null, primary = '.is-primary' } = {}) {
  const previousFocus = document.activeElement;

  function dispose() {
    document.removeEventListener('keydown', onKey, true);
    if (previousFocus && typeof previousFocus.focus === 'function' && document.contains(previousFocus)) {
      previousFocus.focus({ preventScroll: true });
    }
  }

  function onKey(e) {
    if (!backdrop.isConnected) {
      document.removeEventListener('keydown', onKey, true);
      return;
    }
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  }

  document.addEventListener('keydown', onKey, true);
  if (onCancel) {
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) onCancel();
    });
  }
  const target = backdrop.querySelector(primary) || backdrop.querySelector('button');
  if (target) target.focus({ preventScroll: true });
  return dispose;
}
