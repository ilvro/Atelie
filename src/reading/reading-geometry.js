/**
 * Geometry and navigation math for reading mode.
 */

/**
 * Fits a page inside a viewport with a proportional margin, preserving aspect ratio.
 * @param {{ width: number, height: number }} page
 * @param {{ width: number, height: number }} viewport
 * @param {number} [margin=0.06] - Margin factor applied to viewport sides
 * @returns {{ width: number, height: number, scale: number, x: number, y: number }}
 */
export function fitPage(page, viewport, margin = 0.06) {
  if (!page || !viewport || page.width <= 0 || page.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return { width: 0, height: 0, scale: 1, x: 0, y: 0 };
  }

  const availW = Math.max(1, viewport.width * (1 - 2 * margin));
  const availH = Math.max(1, viewport.height * (1 - 2 * margin));

  const scale = Math.min(availW / page.width, availH / page.height);
  const width = Math.round(page.width * scale);
  const height = Math.round(page.height * scale);

  const x = Math.round((viewport.width - width) / 2);
  const y = Math.round((viewport.height - height) / 2);

  return { width, height, scale, x, y };
}

/**
 * Finds previous, current, and next neighbors of an item in a list with circular wrap-around.
 * @template T
 * @param {T[]} list
 * @param {string} id
 * @returns {{ prev: T | null, current: T | null, next: T | null, index: number }}
 */
export function neighbors(list, id) {
  if (!Array.isArray(list) || list.length === 0) {
    return { prev: null, current: null, next: null, index: -1 };
  }

  const getId = item => (typeof item === 'string' ? item : item?.id);
  let index = list.findIndex(item => getId(item) === id);

  if (index === -1) {
    index = 0;
  }

  const len = list.length;
  const prevIndex = (index - 1 + len) % len;
  const nextIndex = (index + 1) % len;

  return {
    prev: list[prevIndex],
    current: list[index],
    next: list[nextIndex],
    index,
  };
}

