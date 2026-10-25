/**
 * Normalized Layer Tree representation for PSD/PSB files (Etapa 23)
 * Pure functions to parse ag-psd structures into a normalized tree independent of ag-psd,
 * extract text layers with document-space geometry, detect variants, and identify UV layers.
 */
import { cornersToAffine, composeAffine, textBoxInDocument } from './psd-geometry.js';

export const PSD_BLENDS = {
  // ag-psd → id do ateliê (BLEND_MODES da etapa 3); null = sem equivalente
  'normal': 'normal',
  'pass through': 'pass-through',
  'multiply': 'multiply',
  'screen': 'screen',
  'overlay': 'overlay',
  'soft light': 'soft-light',
  'hard light': 'hard-light',
  'darken': 'darken',
  'lighten': 'lighten',
  'color dodge': 'color-dodge',
  'color burn': 'color-burn',
  'linear dodge': 'linear-dodge',
  'linear burn': 'linear-burn',
  'lighter color': 'lighter-color',
  'darker color': 'darker-color',
  'difference': 'difference',
  'exclusion': 'exclusion',
  'hue': 'hue',
  'saturation': 'saturation',
  'color': 'color',
  'luminosity': 'luminosity',
  'dissolve': null,
  'vivid light': null,
  'linear light': null,
  'pin light': null,
  'hard mix': null,
  'subtract': null,
  'divide': null,
};

function parseColor(c) {
  if (!c) return '#000000';
  if (typeof c === 'string') return c.startsWith('#') ? c : `#${c}`;
  const r = Math.min(255, Math.max(0, Math.round(c.r ?? 0))).toString(16).padStart(2, '0');
  const g = Math.min(255, Math.max(0, Math.round(c.g ?? 0))).toString(16).padStart(2, '0');
  const b = Math.min(255, Math.max(0, Math.round(c.b ?? 0))).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function resolveBlend(rawMode, layerName, warnings) {
  if (!rawMode) return 'normal';
  const lower = String(rawMode).toLowerCase().trim();

  if (Object.prototype.hasOwnProperty.call(PSD_BLENDS, lower)) {
    const mapped = PSD_BLENDS[lower];
    if (mapped === null) {
      warnings.push(`Modo de mesclagem sem equivalente: "${rawMode}" na camada "${layerName}"`);
      return `unsupported:${lower}`;
    }
    return mapped;
  }

  // Check if it already matches a known atelie blend mode
  const knownAtelieBlends = new Set(Object.values(PSD_BLENDS).filter(Boolean));
  if (knownAtelieBlends.has(lower)) {
    return lower;
  }

  warnings.push(`Modo de mesclagem desconhecido: "${rawMode}" na camada "${layerName}"`);
  return `unsupported:${lower}`;
}

/**
 * Normalizes an ag-psd document into a standardized tree structure.
 * @param {object} psd
 * @param {{ linked?: (id: string) => object | null, _idCounter?: { current: number } }} options
 * @returns {{ width: number, height: number, nodes: object[], warnings: string[] }}
 */
export function normalizeTree(psd, { linked = () => null, _idCounter = { current: 1 } } = {}) {
  const warnings = [];
  const width = psd.width || 0;
  const height = psd.height || 0;

  function nextId() {
    return `n${_idCounter.current++}`;
  }

  function transformLayer(layer, parentPath) {
    const id = nextId();
    const name = layer.name || '';
    const isHidden = Boolean(layer.hidden);
    const visible = !isHidden;
    const clipping = Boolean(layer.clipping);
    const blend = resolveBlend(layer.blendMode, name, warnings);

    const bounds = {
      left: layer.left ?? 0,
      top: layer.top ?? 0,
      right: layer.right ?? 0,
      bottom: layer.bottom ?? 0,
    };

    const mask = layer.mask
      ? {
          left: layer.mask.left ?? 0,
          top: layer.mask.top ?? 0,
          right: layer.mask.right ?? 0,
          bottom: layer.mask.bottom ?? 0,
          defaultColor: layer.mask.defaultColor,
          disabled: Boolean(layer.mask.disabled),
        }
      : null;

    const effects = Object.keys(layer.effects ?? {}).filter(
      key => Boolean(layer.effects[key]) && key !== 'scale'
    );

    let kind = 'pixel';
    if (Array.isArray(layer.children)) {
      kind = 'group';
    } else if (layer.text) {
      kind = 'text';
    } else if (layer.placedLayer) {
      kind = 'smart';
    } else if (layer.adjustment) {
      kind = 'adjust';
    }

    // Opacity: layer.opacity (0–1) * (layer.fillOpacity ?? 1) for pixel/smart/text; only opacity for groups
    const opacity =
      kind === 'group'
        ? layer.opacity ?? 1
        : (layer.opacity ?? 1) * (layer.fillOpacity ?? 1);

    const node = {
      id,
      name,
      path: parentPath,
      kind,
      blend,
      opacity,
      visible,
      clipping,
      bounds,
      mask,
      effects,
    };

    if (kind === 'group') {
      const childPath = parentPath ? `${parentPath}/${name}` : name;
      node.children = (layer.children || []).map(child => transformLayer(child, childPath));
    } else if (kind === 'text') {
      const t = layer.text;
      const style = t.style || t.styleRuns?.[0]?.style || {};
      const postscript = style.font?.name || t.styleRuns?.[0]?.style?.font?.name || null;
      const size = style.fontSize ?? t.styleRuns?.[0]?.style?.fontSize ?? 12;
      const color = parseColor(style.fillColor || t.styleRuns?.[0]?.style?.fillColor);
      const leading = style.leading !== undefined ? style.leading : null;
      const tracking = style.tracking ?? 0;
      const justification = t.paragraphStyle?.justification ?? 'left';
      const shape = t.shapeType || t.shape || 'point';
      const box = t.boxBounds || t.box || [0, 0, 0, 0];
      const matrix = t.transform || t.matrix || [1, 0, 0, 1, 0, 0];

      node.text = {
        content: t.text ?? '',
        postscript,
        size,
        color,
        leading,
        tracking,
        justification,
        shape,
        box,
        matrix,
      };
    } else if (kind === 'smart') {
      const placed = layer.placedLayer;
      const linkedId = placed.id;
      const corners = placed.transform || [];
      const smartWidth = placed.width ?? 0;
      const smartHeight = placed.height ?? 0;

      let content = null;
      if (linked) {
        const rawContent = linked(linkedId);
        if (rawContent) {
          if (Array.isArray(rawContent.nodes)) {
            content = rawContent;
          } else {
            const innerTree = normalizeTree(rawContent, { linked, _idCounter });
            warnings.push(...innerTree.warnings);
            content = innerTree;
          }
        }
      }

      node.smart = {
        linkedId,
        corners,
        width: smartWidth,
        height: smartHeight,
        content,
      };
    } else if (kind === 'adjust') {
      node.adjust = layer.adjustment || null;
    }

    return node;
  }

  const rawNodes = psd.children || psd.layers || [];
  const nodes = rawNodes.map(layer => transformLayer(layer, ''));

  return {
    width,
    height,
    nodes,
    warnings,
  };
}

/**
 * Recursively extracts all text nodes with their document-space bounding box.
 * @param {object | object[]} tree
 * @returns {object[]}
 */
export function textNodes(tree) {
  const results = [];

  function collect(nodeList, currentAffine) {
    if (!Array.isArray(nodeList)) return;

    for (const node of nodeList) {
      if (node.kind === 'text' && node.text) {
        const box = textBoxInDocument(node.text, currentAffine);
        const scale = box.scale ?? 1;

        const item = {
          id: node.id,
          name: node.name,
          path: node.path,
          content: node.text.content,
          postscript: node.text.postscript,
          size: Math.round(node.text.size * scale * 10) / 10,
          fontSize: node.text.size,
          color: node.text.color,
          cor: node.text.color,
          leading: node.text.leading,
          tracking: node.text.tracking,
          justification: node.text.justification,
          shape: node.text.shape,
          x: box.x,
          y: box.y,
          width: box.width,
          largura: box.width,
          height: box.height,
          altura: box.height,
          rotation: box.rotation,
          scale,
          box: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            rotation: box.rotation,
            scale,
          },
          caixa: {
            x: box.x,
            y: box.y,
            largura: box.width,
            altura: box.height,
            rotacao: box.rotation,
            escala: scale,
          },
        };
        results.push(item);
      }

      if (node.kind === 'group' && Array.isArray(node.children)) {
        collect(node.children, currentAffine);
      }

      if (node.kind === 'smart' && node.smart?.content?.nodes) {
        const smartAffine = cornersToAffine(
          node.smart.corners,
          node.smart.width,
          node.smart.height
        );
        const composedAffine =
          currentAffine && !currentAffine.perspective
            ? composeAffine(currentAffine, smartAffine)
            : smartAffine;

        collect(node.smart.content.nodes, composedAffine);
      }
    }
  }

  const nodes = Array.isArray(tree) ? tree : tree?.nodes || tree?.children || [];
  collect(nodes, null);
  return results;
}

/**
 * Detects top-level variant groups where exactly one group is visible.
 * Returns [{ names: [string], visible: string }].
 * @param {object | object[]} tree
 * @returns {{ names: string[], visible: string }[]}
 */
export function variantGroups(tree) {
  const rootNodes = Array.isArray(tree) ? tree : tree?.nodes || tree?.children || [];
  const topGroups = rootNodes.filter(
    n => n.kind === 'group' || (Array.isArray(n.children) && n.children.length > 0)
  );

  if (topGroups.length < 2) {
    return [];
  }

  const visibleGroups = topGroups.filter(g => g.visible !== false && !g.hidden);

  if (visibleGroups.length === 1) {
    return [
      {
        names: topGroups.map(g => g.name),
        visible: visibleGroups[0].name,
      },
    ];
  }

  // Scan for contiguous subsets of sibling groups with exactly one visible
  const variants = [];
  let currentRun = [];

  for (const g of topGroups) {
    currentRun.push(g);
    const visInRun = currentRun.filter(x => x.visible !== false && !x.hidden);
    if (visInRun.length > 1) {
      // More than one visible, start fresh with just this group
      currentRun = [g];
    }
  }

  if (currentRun.length >= 2) {
    const vis = currentRun.filter(x => x.visible !== false && !x.hidden);
    if (vis.length === 1) {
      variants.push({
        names: currentRun.map(x => x.name),
        visible: vis[0].name,
      });
    }
  }

  return variants;
}

/**
 * Checks whether a node or name indicates UV / Black light layer.
 * @param {string | object} nodeOrName
 * @returns {boolean}
 */
export function looksLikeUv(nodeOrName) {
  if (!nodeOrName) return false;
  const name = typeof nodeOrName === 'string' ? nodeOrName : nodeOrName.name || '';
  return /\buv\b/i.test(name) || /luz\s*negra/i.test(name);
}

