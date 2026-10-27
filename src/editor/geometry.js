/**
 * Pure geometry operations for editor layer manipulation.
 * All coordinates in document pixels.
 * Box shape: { x, y, width, height, rotation } (rotation in degrees around center).
 */

export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/**
 * Returns center of a box [cx, cy].
 */
export function boxCenter(box) {
  return [box.x + box.width / 2, box.y + box.height / 2];
}

/**
 * Returns the 4 corners of a rotated box in order [nw, ne, se, sw].
 */
export function boxCorners(box) {
  const [cx, cy] = boxCenter(box);
  const hw = box.width / 2;
  const hh = box.height / 2;
  const rad = ((box.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localCorners = [
    [-hw, -hh], // nw
    [hw, -hh],  // ne
    [hw, hh],   // se
    [-hw, hh],  // sw
  ];

  return localCorners.map(([lx, ly]) => [
    cx + lx * cos - ly * sin,
    cy + lx * sin + ly * cos,
  ]);
}

/**
 * Checks if a point [px, py] is inside the rotated box.
 */
export function pointInBox(point, box) {
  const [cx, cy] = boxCenter(box);
  const dx = point[0] - cx;
  const dy = point[1] - cy;
  const rad = ((box.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);

  // Unrotate point around center into local space
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;

  const hw = box.width / 2;
  const hh = box.height / 2;

  return Math.abs(lx) <= hw && Math.abs(ly) <= hh;
}

/**
 * Moves a box by [dx, dy].
 */
export function moveBox(box, dx, dy) {
  return {
    ...box,
    x: box.x + dx,
    y: box.y + dy,
  };
}

/**
 * Resizes a box using a specific handle and pointer position.
 * The opposite anchor (or center if fromCenter = true) remains fixed in world space.
 */
export function resizeBox(box, handle, pointer, { keepAspect = false, fromCenter = false, min = 4 } = {}) {
  const [cx, cy] = boxCenter(box);
  const rad = ((box.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Handle vectors in local normalized coords: nw: (-1, -1), se: (1, 1), e: (1, 0), etc.
  const handleDirs = {
    nw: [-1, -1],
    n:  [ 0, -1],
    ne: [ 1, -1],
    e:  [ 1,  0],
    se: [ 1,  1],
    s:  [ 0,  1],
    sw: [-1,  1],
    w:  [-1,  0],
  };

  const hDir = handleDirs[handle];
  if (!hDir) return { ...box };

  // Opposite anchor in local coords (relative to center)
  // If fromCenter is true, anchor is (0, 0)
  const aDir = fromCenter ? [0, 0] : [-hDir[0], -hDir[1]];
  const aLocalX = aDir[0] * (box.width / 2);
  const aLocalY = aDir[1] * (box.height / 2);

  // Anchor in world coords
  const anchorWorldX = cx + aLocalX * cos - aLocalY * sin;
  const anchorWorldY = cy + aLocalX * sin + aLocalY * cos;

  // Vector from anchor to pointer in world coords
  const vWorldX = pointer[0] - anchorWorldX;
  const vWorldY = pointer[1] - anchorWorldY;

  // Convert vector to local coords
  const vLocalX = vWorldX * cos + vWorldY * sin;
  const vLocalY = -vWorldX * sin + vWorldY * cos;

  // Compute new width and height based on which axes this handle modifies
  let newW = box.width;
  let newH = box.height;

  if (fromCenter) {
    if (hDir[0] !== 0) {
      newW = Math.max(min, Math.abs(vLocalX) * 2);
    }
    if (hDir[1] !== 0) {
      newH = Math.max(min, Math.abs(vLocalY) * 2);
    }
  } else {
    if (hDir[0] !== 0) {
      newW = Math.max(min, vLocalX * hDir[0]);
    }
    if (hDir[1] !== 0) {
      newH = Math.max(min, vLocalY * hDir[1]);
    }
  }

  if (keepAspect && box.width > 0 && box.height > 0) {
    const origAspect = box.width / box.height;
    if (hDir[0] !== 0 && hDir[1] !== 0) {
      // Corner handle: choose based on larger variation
      const deltaW = Math.abs(newW - box.width);
      const deltaH = Math.abs(newH - box.height);
      if (deltaW >= deltaH) {
        newH = Math.max(min, newW / origAspect);
      } else {
        newW = Math.max(min, newH * origAspect);
      }
    } else if (hDir[0] !== 0) {
      newH = Math.max(min, newW / origAspect);
    } else if (hDir[1] !== 0) {
      newW = Math.max(min, newH * origAspect);
    }
  }

  // Calculate new center
  let newCx = cx;
  let newCy = cy;

  if (fromCenter) {
    newCx = cx;
    newCy = cy;
  } else {
    // The anchor stays fixed at anchorWorld.
    // The new center is anchorWorld + offset of (newW/2 * hDir[0], newH/2 * hDir[1])
    const centerOffsetLocalX = (newW / 2) * hDir[0];
    const centerOffsetLocalY = (newH / 2) * hDir[1];

    newCx = anchorWorldX + centerOffsetLocalX * cos - centerOffsetLocalY * sin;
    newCy = anchorWorldY + centerOffsetLocalX * sin + centerOffsetLocalY * cos;
  }

  return {
    ...box,
    x: newCx - newW / 2,
    y: newCy - newH / 2,
    width: newW,
    height: newH,
  };
}

/**
 * Calculates rotation angle from box center to pointer.
 * Pointer handle is located 28px above top edge (+90 degrees).
 * If snap is true, angle snaps to nearest 15-degree multiple.
 */
export function rotateBox(box, pointer, { snap = false } = {}) {
  const [cx, cy] = boxCenter(box);
  const dx = pointer[0] - cx;
  const dy = pointer[1] - cy;

  const rad = Math.atan2(dy, dx);
  let deg = (rad * 180) / Math.PI + 90;

  // Normalize to [0, 360)
  deg = ((deg % 360) + 360) % 360;

  if (snap) {
    deg = Math.round(deg / 15) * 15;
    deg = ((deg % 360) + 360) % 360;
  }

  return Math.round(deg * 100) / 100;
}

/**
 * Rotation after dragging from `startPointer` to `pointer` around `center`: the angle the pointer
 * swept is added to the rotation the layer had when the gesture began (no fixed +90° as in rotateBox).
 * If snap is true, the result snaps to 15-degree multiples.
 */
export function rotateBoxBy(startRotation, center, startPointer, pointer, { snap = false } = {}) {
  const a0 = Math.atan2(startPointer[1] - center[1], startPointer[0] - center[0]);
  const a1 = Math.atan2(pointer[1] - center[1], pointer[0] - center[0]);
  let deg = (startRotation || 0) + ((a1 - a0) * 180) / Math.PI;
  deg = ((deg % 360) + 360) % 360;
  if (snap) {
    deg = Math.round(deg / 15) * 15;
    deg = ((deg % 360) + 360) % 360;
  }
  return Math.round(deg * 100) / 100;
}

/**
 * Snaps unrotated box to target guidelines (edges and centers).
 * targets: { x: number[], y: number[] }
 * Returns { box, guides: [{ axis: 'x'|'y', at: number }] }
 */
export function snapBox(box, targets = {}, threshold = 6) {
  if (box.rotation) {
    return { box: { ...box }, guides: [] };
  }

  const snapped = { ...box };
  const guides = [];

  const xTargets = targets.x || [];
  const yTargets = targets.y || [];

  // Check X alignment: left, center, right
  const boxXPoints = [
    { type: 'left',   val: snapped.x },
    { type: 'center', val: snapped.x + snapped.width / 2 },
    { type: 'right',  val: snapped.x + snapped.width },
  ];

  let bestXDiff = Infinity;
  let bestXTarget = null;
  let bestXShift = 0;

  for (const pt of boxXPoints) {
    for (const target of xTargets) {
      const diff = Math.abs(target - pt.val);
      if (diff <= threshold && diff < bestXDiff) {
        bestXDiff = diff;
        bestXTarget = target;
        bestXShift = target - pt.val;
      }
    }
  }

  if (bestXTarget !== null) {
    snapped.x += bestXShift;
    guides.push({ axis: 'x', at: bestXTarget });
  }

  // Check Y alignment: top, middle, bottom
  const boxYPoints = [
    { type: 'top',    val: snapped.y },
    { type: 'middle', val: snapped.y + snapped.height / 2 },
    { type: 'bottom', val: snapped.y + snapped.height },
  ];

  let bestYDiff = Infinity;
  let bestYTarget = null;
  let bestYShift = 0;

  for (const pt of boxYPoints) {
    for (const target of yTargets) {
      const diff = Math.abs(target - pt.val);
      if (diff <= threshold && diff < bestYDiff) {
        bestYDiff = diff;
        bestYTarget = target;
        bestYShift = target - pt.val;
      }
    }
  }

  if (bestYTarget !== null) {
    snapped.y += bestYShift;
    guides.push({ axis: 'y', at: bestYTarget });
  }

  return { box: snapped, guides };
}

/**
 * Returns the highest visible and unlocked layer containing the point, or null.
 */
/** Every selectable layer under the point, topmost first. */
export function layersAtPoint(handout, point) {
  const hits = [];
  const layers = handout.layers || [];
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible || layer.locked) continue;
    if (pointInBox(point, layer)) hits.push(layer);
  }
  return hits;
}

/** Alt+click: the layer under the selected one in the stack (wraps to the top); the top one if nothing there is selected. */
export function nextStackedLayer(hits, selectedId) {
  if (!hits.length) return null;
  const idx = hits.findIndex(l => l.id === selectedId);
  return hits[(idx + 1) % hits.length];
}

export function layerAtPoint(handout, point) {
  const layers = handout.layers || [];
  // Highest layer is at the end of the array (rendered last on top)
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible || layer.locked) continue;
    if (pointInBox(point, layer)) {
      return layer;
    }
  }
  return null;
}

