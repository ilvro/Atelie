/**
 * Caminho B: Hand-off via janela (window.open e window.postMessage).
 */

export const validFrom = (origin) => {
  if (typeof origin !== 'string') return false;
  return /^https:\/\/[^/]+$/.test(origin) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
};

/**
 * Returns the Tabletop request that opened this window:
 * { from, nonce, mode: 'pick' | 'edit' | 'new', ... } or null.
 */
export function handoffRequest(location, opener) {
  if (!opener) return null;
  if (!location) return null;

  let url;
  try {
    if (typeof location === 'string') {
      url = new URL(location, 'http://dummy.local');
    } else if (location instanceof URL) {
      url = location;
    } else {
      url = new URL(location.href || location.search || '', 'http://dummy.local');
    }
  } catch {
    return null;
  }

  const params = url.searchParams;
  const from = params.get('from');
  const nonce = params.get('nonce');

  if (!from || !validFrom(from)) return null;
  if (!nonce) return null;

  let mode = null;
  let handoutId = null;
  let preset = null;

  if (params.has('pick')) {
    mode = 'pick';
  } else if (params.has('handout')) {
    mode = 'edit';
    handoutId = params.get('handout');
  } else if (params.has('new')) {
    mode = 'new';
    preset = params.get('new');
  }

  if (!mode) return null;

  return {
    from,
    nonce,
    mode,
    ...(handoutId ? { handoutId } : {}),
    ...(preset ? { preset } : {}),
  };
}

export const deliveredMessage = (nonce, delivery) => ({
  app: 'atelie',
  contract: 1,
  type: 'delivered',
  nonce,
  delivery,
});

