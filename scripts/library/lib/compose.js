/**
 * PSD Layer Tree Compositor (Etapa 24)
 * Traverses a normalized PSD tree from bottom to top and reconstructs the composite image,
 * handling pass-through vs isolated groups, clipping masks, adjustments, and opacity.
 */
import { createBuffer, cloneBuffer } from './raster.js';
import { compositeLayer } from './blend.js';
import { adjustBuffer } from './adjust.js';

/**
 * Traverses a normalized layer tree and renders the composite document buffer at the given scale.
 * @param {object} tree Normalized tree from normalizeTree()
 * @param {(node: object) => Promise<{ buffer: object | null, mask: object | null }>} pixels Resolver returning scaled { buffer, mask }
 * @param {object} options
 * @param {number} [options.scale=1]
 * @param {(node: object) => boolean} [options.skip=() => false]
 * @param {string[]} [options.warnings=[]]
 * @returns {Promise<{ width: number, height: number, data: Float32Array }>}
 */
export async function composeTree(
  tree,
  pixels,
  { scale = 1, skip = () => false, warnings = [] } = {}
) {
  const docW = Math.max(1, Math.round((tree.width || 100) * scale));
  const docH = Math.max(1, Math.round((tree.height || 100) * scale));

  const rootBuffer = createBuffer(docW, docH);

  await composeNodeList(tree.nodes || [], rootBuffer, {
    pixels,
    scale,
    skip,
    warnings,
    docW,
    docH,
    inheritedOpacity: 1,
    inheritedMask: null,
  });

  return rootBuffer;
}

/**
 * Recursively composes a list of sibling nodes into a target buffer.
 */
async function composeNodeList(nodes, targetBuffer, options) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Rule 1: Invisible node: skip
    if (node.visible === false || options.skip(node)) {
      continue;
    }

    // Check if this unclipped node is followed by clipped nodes
    const clippedNodes = [];
    while (i + 1 < nodes.length && nodes[i + 1].clipping) {
      if (nodes[i + 1].visible !== false && !options.skip(nodes[i + 1])) {
        clippedNodes.push(nodes[i + 1]);
      }
      i++;
    }

    if (clippedNodes.length > 0) {
      // Rule 4: Clipping group ("Blend Clipped Layers As Group")
      // Compose base layer into an isolated buffer with mode 'normal'
      const clipGroupBuf = createBuffer(options.docW, options.docH);

      await composeSingleNode(node, clipGroupBuf, {
        ...options,
        overrideMode: 'normal',
        overrideClipAlpha: null,
      });

      // Capture base layer alpha in document space
      const clipAlpha = new Float32Array(options.docW * options.docH);
      for (let p = 0; p < clipAlpha.length; p++) {
        clipAlpha[p] = clipGroupBuf.data[p * 4 + 3];
      }

      // Compose subsequent clipped nodes into clipGroupBuf using base's alpha mask
      for (const clipped of clippedNodes) {
        await composeSingleNode(clipped, clipGroupBuf, {
          ...options,
          overrideClipAlpha: clipAlpha,
        });
      }

      // Composite clipGroupBuf onto targetBuffer using base node's blend mode and opacity
      const baseMode = resolveMode(node.blend, options.warnings);
      compositeLayer(targetBuffer, clipGroupBuf, {
        mode: baseMode,
        opacity: (node.opacity ?? 1) * options.inheritedOpacity,
        mask: options.inheritedMask,
        left: 0,
        top: 0,
      });
    } else {
      // Standard unclipped node
      await composeSingleNode(node, targetBuffer, options);
    }
  }
}

/**
 * Composes a single node into a target buffer.
 */
async function composeSingleNode(node, targetBuffer, options) {
  const {
    pixels,
    scale,
    skip,
    warnings,
    docW,
    docH,
    inheritedOpacity,
    inheritedMask,
    overrideMode,
    overrideClipAlpha,
  } = options;

  // Check vector mask
  if (node.vectorMask && !warnings.includes('vector-mask')) {
    warnings.push('vector-mask');
  }

  // Check layer effects
  if (Array.isArray(node.effects) && node.effects.length > 0) {
    for (const eff of node.effects) {
      const mark = `effect:${eff}`;
      if (!warnings.includes(mark)) warnings.push(mark);
    }
  }

  const effectiveOpacity = (node.opacity ?? 1) * inheritedOpacity;

  // Group layer
  if (node.kind === 'group') {
    const isPassThrough = node.blend === 'pass-through';

    if (isPassThrough) {
      // Rule 2: Pass-through group: children composed directly into targetBuffer
      await composeNodeList(node.children || [], targetBuffer, {
        ...options,
        inheritedOpacity: effectiveOpacity,
        inheritedMask: inheritedMask,
      });
    } else {
      // Rule 3: Isolated group
      const groupBuffer = createBuffer(docW, docH);
      await composeNodeList(node.children || [], groupBuffer, {
        ...options,
        inheritedOpacity: 1,
        inheritedMask: null,
      });

      const mode = overrideMode || resolveMode(node.blend, warnings);
      compositeLayer(targetBuffer, groupBuffer, {
        mode,
        opacity: effectiveOpacity,
        mask: inheritedMask,
        clipAlpha: overrideClipAlpha,
        left: 0,
        top: 0,
      });
    }
    return;
  }

  // Adjustment layer
  if (node.kind === 'adjust' && node.adjust) {
    let maskBuf = inheritedMask;
    if (pixels) {
      try {
        const res = await pixels(node);
        if (res?.mask) maskBuf = res.mask;
      } catch {
        // ignore
      }
    }

    adjustBuffer(targetBuffer, node.adjust, {
      mask: maskBuf,
      clipAlpha: overrideClipAlpha,
      opacity: effectiveOpacity,
      warnings,
    });
    return;
  }

  // Pixel, Smart, or Text layer
  if (pixels) {
    let res = null;
    try {
      res = await pixels(node);
    } catch (err) {
      warnings.push(`pixels-error:${node.name}:${err.message}`);
    }

    if (res && res.buffer) {
      const layerBuf = res.buffer;
      const layerMask = res.mask || inheritedMask;
      const left = Math.round((node.bounds?.left ?? 0) * scale);
      const top = Math.round((node.bounds?.top ?? 0) * scale);
      const mode = overrideMode || resolveMode(node.blend, warnings);

      compositeLayer(targetBuffer, layerBuf, {
        mode,
        opacity: effectiveOpacity,
        mask: layerMask,
        clipAlpha: overrideClipAlpha,
        left,
        top,
      });
    }
  }
}

function resolveMode(blend, warnings) {
  if (!blend || blend === 'pass-through') return 'normal';
  const clean = blend.replace(/\s+/g, '-').toLowerCase();
  if (clean.startsWith('unsupported:')) {
    if (!warnings.includes(clean)) warnings.push(clean);
    return 'normal';
  }
  return clean;
}

