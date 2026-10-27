/**
 * Runs `fn` (which re-renders) without the scroll jumping: the anchor keeps the same
 * distance from the top of the scroll area. `scroll` and `anchor` may be an element,
 * a selector, or a function returning one, because a re-render replaces both.
 */
export function preserveScroll(scroll, anchor, fn, root = document) {
  const resolve = (v) => (typeof v === 'function' ? v() : typeof v === 'string' ? root.querySelector(v) : v);
  const scrollEl = resolve(scroll);
  const anchorEl = resolve(anchor);
  const before = scrollEl ? scrollEl.scrollTop : 0;
  const anchorTop = scrollEl && anchorEl ? anchorEl.getBoundingClientRect().top : null;
  const anchorSelector = typeof anchor === 'string' ? anchor : null;

  fn();

  const nextScroll = resolve(scroll);
  if (!nextScroll) return;
  const nextAnchor = anchorSelector ? resolve(anchorSelector) : resolve(anchor);
  if (anchorTop != null && nextAnchor && nextAnchor.isConnected) {
    nextScroll.scrollTop += nextAnchor.getBoundingClientRect().top - anchorTop;
  } else {
    nextScroll.scrollTop = before;
  }
}
