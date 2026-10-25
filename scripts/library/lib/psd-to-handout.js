/**
 * PSD to Handout Template Converter (Etapa 25)
 * Pure functions to convert a normalized PSD layer tree and raster pixels into an
 * editable Ateliê handout template with fields, adjustments, image layers, and UV support.
 */
import { createBuffer, cloneBuffer } from './raster.js';
import { compositeLayer } from './blend.js';
import { composeTree } from './compose.js';
import { cornersToAffine, textBoxInDocument, composeAffine } from './psd-geometry.js';
import { looksLikeUv, variantGroups } from './psd-tree.js';
import { matchFont } from './font-match.js';
import {
  cleanTemplateCategory,
  cleanTemplateName,
  templateId as makeTemplateId,
  templateTags,
} from './catalog.js';
import {
  validateHandout,
  DEFAULT_PAGE_UV,
  imageLayer,
  textLayer,
  adjustLayer,
  BLEND_MODES,
} from '../../../src/domain/handouts.js';

const VALID_ATELIE_BLENDS = new Set(BLEND_MODES.map(([b]) => b));

function sanitizeBlend(rawBlend, warnings, layerName) {
  if (!rawBlend) return 'normal';
  const clean = String(rawBlend).toLowerCase().trim();
  if (VALID_ATELIE_BLENDS.has(clean)) return clean;
  if (warnings) {
    warnings.push(`Modo de mesclagem "${rawBlend}" não suportado na camada "${layerName}". Ajustado para normal.`);
  }
  return 'normal';
}

const IMAGE_PLACEHOLDER_RE = /foto|imagem|retrato|brasão|brasao|coloque|insira|sua imagem|placeholder/i;

function parseHexColor(c) {
  if (!c) return '#000000';
  if (typeof c === 'string') return c.startsWith('#') ? c : `#${c}`;
  const r = Math.min(255, Math.max(0, Math.round(c.r ?? 0))).toString(16).padStart(2, '0');
  const g = Math.min(255, Math.max(0, Math.round(c.g ?? 0))).toString(16).padStart(2, '0');
  const b = Math.min(255, Math.max(0, Math.round(c.b ?? 0))).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function resolveAlign(justification) {
  if (!justification) return 'left';
  const j = String(justification).toLowerCase();
  if (j.includes('center')) return 'center';
  if (j.includes('right')) return 'right';
  if (j.includes('justify')) return 'justify';
  return 'left';
}

function resolveInkStyle(fontItem, postscript) {
  const cat = (fontItem?.category || '').toLowerCase();
  const name = (fontItem?.name || fontItem?.family || postscript || '').toLowerCase();

  if (
    cat.includes('máquina de escrever') ||
    cat.includes('maquina de escrever') ||
    /type|courier|trypewriter|executive|remington/.test(name)
  ) {
    return 'typewriter';
  }
  if (/hand|script|brush|marker|pen/.test(name)) {
    return 'handwriting';
  }
  return 'clean';
}

function sampleLevelsPoints(rgb) {
  if (!rgb) {
    return [
      [0, 0],
      [255, 255],
    ];
  }
  const shadowIn = rgb.shadowInput ?? 0;
  const highlightIn = rgb.highlightInput ?? 255;
  const midtoneIn = rgb.midtoneInput ?? 1.0;
  const shadowOut = rgb.shadowOutput ?? 0;
  const highlightOut = rgb.highlightOutput ?? 255;

  const samplePoint = (x) => {
    const rangeIn = highlightIn - shadowIn;
    let norm = 0;
    if (rangeIn > 0) {
      norm = Math.max(0, Math.min(1, (x - shadowIn) / rangeIn));
    }
    if (midtoneIn > 0 && midtoneIn !== 1.0) {
      norm = Math.pow(norm, 1 / midtoneIn);
    }
    const out = shadowOut + norm * (highlightOut - shadowOut);
    return Math.round(Math.max(0, Math.min(255, out)));
  };

  // 9 strictly increasing input samples: 0, 32, 64, 96, 128, 160, 192, 224, 255
  const inputs = [0, 32, 64, 96, 128, 160, 192, 224, 255];
  return inputs.map(x => [x, samplePoint(x)]);
}

function normalizeCurvePoints(rawPoints) {
  if (!Array.isArray(rawPoints) || rawPoints.length < 2) {
    return [
      [0, 0],
      [255, 255],
    ];
  }

  // Convert objects {input, output} or pairs [x, y]
  const pairs = rawPoints.map(p => {
    if (Array.isArray(p)) return [Math.round(p[0]), Math.round(p[1])];
    return [Math.round(p.input ?? 0), Math.round(p.output ?? 0)];
  });

  // Sort by x
  pairs.sort((a, b) => a[0] - b[0]);

  // Ensure strictly increasing x values (strictly > previous)
  const strictlyIncreasing = [];
  for (const [x, y] of pairs) {
    const clampedX = Math.max(0, Math.min(255, x));
    const clampedY = Math.max(0, Math.min(255, y));
    if (strictlyIncreasing.length === 0) {
      strictlyIncreasing.push([clampedX, clampedY]);
    } else {
      const prevX = strictlyIncreasing[strictlyIncreasing.length - 1][0];
      if (clampedX > prevX) {
        strictlyIncreasing.push([clampedX, clampedY]);
      }
    }
  }

  if (strictlyIncreasing.length < 2) {
    strictlyIncreasing.push([255, 255]);
  }

  return strictlyIncreasing.slice(0, 16);
}

function sanitizeName(name, maxLen = 80) {
  if (!name) return 'Camada';
  const clean = String(name).trim().replace(/\s+/g, ' ');
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen).trim();
}

function cropToVisible(buffer, x0, y0) {
  const { width, height, data } = buffer;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (data[(row + x) * 4 + 3] > 0.005) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      x: x0,
      y: y0,
      width: Math.max(1, width),
      height: Math.max(1, height),
      buffer,
    };
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const cropped = createBuffer(cropW, cropH);

  for (let y = 0; y < cropH; y++) {
    const srcRow = (minY + y) * width;
    const dstRow = y * cropW;
    for (let x = 0; x < cropW; x++) {
      const srcIdx = (srcRow + minX + x) * 4;
      const dstIdx = (dstRow + x) * 4;
      cropped.data[dstIdx] = data[srcIdx];
      cropped.data[dstIdx + 1] = data[srcIdx + 1];
      cropped.data[dstIdx + 2] = data[srcIdx + 2];
      cropped.data[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return {
    x: x0 + minX,
    y: y0 + minY,
    width: cropW,
    height: cropH,
    buffer: cropped,
  };
}

/**
 * Converts a normalized PSD tree into an Ateliê Handout template.
 * @param {object} tree Normalized tree from normalizeTree()
 * @param {(node: object) => Promise<{ buffer: object | null, mask: object | null }>} pixels Resolver returning scaled { buffer, mask }
 * @param {object} options
 * @param {string} [options.tplId='tpl-default']
 * @param {string} [options.category='Documentos']
 * @param {string} [options.name='Documento']
 * @param {string} [options.sourcePath='']
 * @param {number} [options.scale=1]
 * @param {Array<object>} [options.libraryFonts=[]]
 * @param {string[]} [options.warnings=[]]
 * @returns {Promise<{ handout: object, rasters: Array<object>, report: object }>}
 */
export async function psdToHandout(
  tree,
  pixels,
  {
    tplId = 'tpl-default',
    category = 'Documentos',
    name = 'Documento',
    sourcePath = '',
    scale = 1,
    libraryFonts = [],
    warnings = [],
  } = {}
) {
  const docW = Math.max(64, Math.round((tree.width || 1240) * scale));
  const docH = Math.max(64, Math.round((tree.height || 1754) * scale));

  const missingFonts = new Set();
  const reportWarnings = [...warnings];

  // Identify variant groups from root
  const variantsDetected = variantGroups(tree);
  const variantMap = new Map();
  for (const v of variantsDetected) {
    for (const gName of v.names) {
      variantMap.set(gName, {
        groupName: gName,
        isVisible: gName === v.visible,
      });
    }
  }

  const flattenedLayers = [];
  const fieldCounts = new Map();

  function uniqueFieldLabel(rawLabel) {
    const clean = sanitizeName(rawLabel || 'Campo', 100);
    const count = (fieldCounts.get(clean) || 0) + 1;
    fieldCounts.set(clean, count);
    return count === 1 ? clean : `${clean} ${count}`;
  }

  /**
   * Recursively flattens layer tree into raw candidate layers.
   */
  async function processNodeList(
    nodes,
    {
      parentPrefix = '',
      parentOpacity = 1,
      parentBlend = null,
      isUv = false,
      isVariation = false,
      isVariantHidden = false,
      parentAffine = null,
      parentMask = null,
    } = {}
  ) {
    for (const node of nodes) {
      if (node.visible === false && !node.clipping && !variantMap.has(node.name)) {
        // Invisible node (not part of a variant) is skipped
        continue;
      }

      const rawCombined = parentPrefix ? `${parentPrefix} · ${node.name}` : node.name;
      const effectiveName = sanitizeName(rawCombined, 80);
      const effectiveOpacity = (node.opacity ?? 1) * parentOpacity;
      const effectiveUv = isUv || looksLikeUv(node);

      // 1. Group nodes
      if (node.kind === 'group' || (Array.isArray(node.children) && node.children.length > 0)) {
        const isVariantGroup = variantMap.has(node.name);
        const variantInfo = isVariantGroup ? variantMap.get(node.name) : null;
        const groupIsHidden = variantInfo ? !variantInfo.isVisible : false;

        const groupPrefix = isVariantGroup
          ? `Variação · ${node.name}`
          : effectiveName;

        const isPassThrough = node.blend === 'pass-through';

        if (isPassThrough || isVariantGroup) {
          // Flatten children directly
          await processNodeList(node.children || [], {
            parentPrefix: groupPrefix,
            parentOpacity: effectiveOpacity,
            isUv: effectiveUv,
            isVariation: isVariation || isVariantGroup,
            isVariantHidden: isVariantHidden || groupIsHidden,
            parentAffine,
            parentMask: node.mask || parentMask,
          });
        } else {
          // Isolated group: compose entire group into a single image layer
          const groupTree = {
            width: tree.width,
            height: tree.height,
            nodes: node.children || [],
          };

          const groupBuffer = await composeTree(groupTree, pixels, {
            scale,
            warnings: reportWarnings,
          });

          const cropped = cropToVisible(groupBuffer, 0, 0);

          flattenedLayers.push({
            name: effectiveName,
            kind: 'image',
            blend: node.blend || 'normal',
            opacity: effectiveOpacity,
            clip: Boolean(node.clipping),
            light: effectiveUv ? 'uv' : 'both',
            visible: isVariantHidden ? false : node.visible !== false,
            x: cropped.x,
            y: cropped.y,
            width: cropped.width,
            height: cropped.height,
            buffer: cropped.buffer,
            isField: false,
            isVariation,
          });
        }
        continue;
      }

      // 2. Text nodes
      if (node.kind === 'text' || node.text) {
        const t = node.text;
        const boxDoc = textBoxInDocument(t, parentAffine);

        const x = Math.round(boxDoc.x * scale);
        const y = Math.round(boxDoc.y * scale);
        const w = Math.max(1, Math.round(boxDoc.width * scale));
        const h = Math.max(1, Math.round(boxDoc.height * scale));
        const rot = Math.round(boxDoc.rotation * 10) / 10;

        const fontSize = Math.max(4, Math.round((t.size || 12) * boxDoc.scale * scale));
        const lineHeight =
          t.leading && t.size
            ? Math.max(0.6, Math.min(4, Math.round((t.leading / t.size) * 100) / 100))
            : 1.25;

        const letterSpacing = Math.max(-200, Math.min(1000, Math.round(t.tracking ?? 0)));
        const align = resolveAlign(t.justification);
        const boxShape = t.shape === 'box' || t.shapeType === 'box' ? 'area' : 'point';
        const textColor = parseHexColor(t.color || t.style?.fillColor);

        // Font matching
        const postscript = t.postscript || t.font?.name || null;
        const matched = matchFont(postscript, libraryFonts);

        let fontConfig = {
          family: postscript || 'IM Fell English',
          library: null,
          weight: 400,
          italic: false,
        };

        if (matched) {
          fontConfig = {
            family: matched.family,
            library: matched.id,
            weight: matched.weight ?? 400,
            italic: matched.style === 'italic',
          };
        } else if (postscript) {
          missingFonts.add(postscript);
        }

        const inkStyle = resolveInkStyle(matched, postscript);

        const content = (t.content || t.text || '').replace(/\r\n|\r/g, '\n');

        flattenedLayers.push({
          name: effectiveName,
          kind: 'text',
          blend: parentBlend || node.blend || 'normal',
          opacity: effectiveOpacity,
          clip: Boolean(node.clipping),
          light: effectiveUv ? 'uv' : 'both',
          visible: isVariantHidden ? false : node.visible !== false,
          x,
          y,
          width: w,
          height: h,
          rotation: rot,
          text: {
            content,
            font: fontConfig,
            size: fontSize,
            color: textColor,
            align,
            valign: 'top',
            lineHeight,
            letterSpacing,
            box: boxShape,
            fit: 'overflow',
            ink: {
              style: inkStyle,
              wear: 0,
              seed: 1,
            },
          },
          isField: true,
          fieldLabel: uniqueFieldLabel(node.name),
          isVariation,
        });
        continue;
      }

      // 3. Smart object nodes
      if (node.kind === 'smart' && node.smart) {
        const placed = node.smart;
        const affine = cornersToAffine(placed.corners, placed.width, placed.height);
        const hasTextInside = Boolean(
          placed.content &&
          (placed.content.nodes || placed.content.children || []).some(
            c => c.kind === 'text' || c.text
          )
        );

        if (affine.perspective) {
          // Perspective smart object: cannot split texts, rasterize as image
          if (hasTextInside) {
            reportWarnings.push(
              `Objeto inteligente em perspectiva com texto ignorado: "${node.name}"`
            );
          }
        } else if (hasTextInside && placed.content) {
          // Smart object with texts:
          // (a) Compose non-text elements into an image layer
          const nonTextBuffer = await composeTree(placed.content, pixels, {
            scale: scale * (affine.scale || 1),
            skip: n => n.kind === 'text' || Boolean(n.text),
            warnings: reportWarnings,
          });

          const cropped = cropToVisible(nonTextBuffer, 0, 0);

          flattenedLayers.push({
            name: effectiveName,
            kind: 'image',
            blend: node.blend || 'normal',
            opacity: effectiveOpacity,
            clip: Boolean(node.clipping),
            light: effectiveUv ? 'uv' : 'both',
            visible: isVariantHidden ? false : node.visible !== false,
            x: Math.round((affine.e || 0) * scale) + cropped.x,
            y: Math.round((affine.f || 0) * scale) + cropped.y,
            width: cropped.width,
            height: cropped.height,
            buffer: cropped.buffer,
            isField: false,
            isVariation,
          });

          // (b) Extract texts with transformed affine position
          const innerAffine = parentAffine
            ? composeAffine(parentAffine, affine)
            : affine;

          await processNodeList(placed.content.nodes || placed.content.children || [], {
            parentPrefix: effectiveName,
            parentOpacity: effectiveOpacity,
            parentBlend: node.blend || parentBlend,
            isUv: effectiveUv,
            isVariation,
            isVariantHidden,
            parentAffine: innerAffine,
            parentMask,
          });
          continue;
        }
      }

      // 4. Adjustment layers
      if (node.kind === 'adjust' && node.adjust) {
        const a = node.adjust;
        const type = String(a.type || '').toLowerCase();
        let mappedAdjust = null;

        if (type === 'hue/saturation') {
          const m = a.master || {};
          mappedAdjust = {
            grayscale: 0,
            sepia: 0,
            brightness: Math.max(-1, Math.min(1, (m.lightness ?? 0) / 100)),
            contrast: 0,
            saturation: Math.max(-1, Math.min(1, (m.saturation ?? 0) / 100)),
            hue: Math.max(-180, Math.min(180, m.hue ?? 0)),
            invert: false,
            curve: null,
          };
        } else if (type === 'black & white') {
          mappedAdjust = {
            grayscale: 1,
            sepia: 0,
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            invert: false,
            curve: null,
          };
        } else if (type === 'brightness/contrast') {
          mappedAdjust = {
            grayscale: 0,
            sepia: 0,
            brightness: Math.max(-1, Math.min(1, (a.brightness ?? 0) / 150)),
            contrast: Math.max(-1, Math.min(1, (a.contrast ?? 0) / 100)),
            saturation: 0,
            hue: 0,
            invert: false,
            curve: null,
          };
        } else if (type === 'invert') {
          mappedAdjust = {
            grayscale: 0,
            sepia: 0,
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            invert: true,
            curve: null,
          };
        } else if (type === 'levels') {
          const rgb = a.rgb || a.red || {};
          const curvePts = sampleLevelsPoints(rgb);
          mappedAdjust = {
            grayscale: 0,
            sepia: 0,
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            invert: false,
            curve: curvePts,
          };
        } else if (type === 'curves') {
          const pts = a.points || a.rgb?.points || a.curves?.[0]?.points || [];
          const curvePts = normalizeCurvePoints(pts);
          mappedAdjust = {
            grayscale: 0,
            sepia: 0,
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            invert: false,
            curve: curvePts,
          };
        } else {
          reportWarnings.push(`Ajuste não mapeável ignorado: "${type}" na camada "${node.name}"`);
        }

        if (mappedAdjust) {
          flattenedLayers.push({
            name: effectiveName,
            kind: 'adjust',
            blend: node.blend || 'normal',
            opacity: effectiveOpacity,
            clip: Boolean(node.clipping),
            light: effectiveUv ? 'uv' : 'both',
            visible: isVariantHidden ? false : node.visible !== false,
            x: 0,
            y: 0,
            width: docW,
            height: docH,
            adjust: mappedAdjust,
            isField: false,
            isVariation,
          });
        }
        continue;
      }

      // 5. Pixel / Raster nodes (and fallback smart objects)
      let rawBuf = node.buffer || null;
      if (!rawBuf && pixels) {
        try {
          const res = await pixels(node);
          rawBuf = res?.buffer || null;
        } catch {
          // ignore
        }
      }

      if (rawBuf) {
        const left = Math.round((node.bounds?.left ?? 0) * scale);
        const top = Math.round((node.bounds?.top ?? 0) * scale);
        const cropped = cropToVisible(rawBuf, left, top);

        const isImageField = IMAGE_PLACEHOLDER_RE.test(node.name);

        flattenedLayers.push({
          name: effectiveName,
          kind: 'image',
          blend: node.blend || 'normal',
          opacity: effectiveOpacity,
          clip: Boolean(node.clipping),
          light: effectiveUv ? 'uv' : 'both',
          visible: isVariantHidden ? false : node.visible !== false,
          x: cropped.x,
          y: cropped.y,
          width: cropped.width,
          height: cropped.height,
          buffer: cropped.buffer,
          isField: isImageField,
          fieldLabel: isImageField ? uniqueFieldLabel(node.name) : null,
          isVariation,
        });
      }
    }
  }

  // 1. Flatten all tree nodes
  await processNodeList(tree.nodes || tree.children || [], {});

  // 2. Merge adjacent normal, unclipped, non-field background image layers
  const mergedLayers = [];
  let i = 0;

  while (i < flattenedLayers.length) {
    const layer = flattenedLayers[i];

    const canMerge =
      layer.kind === 'image' &&
      layer.blend === 'normal' &&
      layer.opacity >= 0.999 &&
      !layer.clip &&
      layer.light === 'both' &&
      !layer.isField &&
      !layer.isVariation &&
      layer.visible !== false;

    if (!canMerge) {
      mergedLayers.push(layer);
      i++;
      continue;
    }

    // Collect contiguous run of mergeable image layers
    const run = [layer];
    let j = i + 1;
    while (j < flattenedLayers.length) {
      const next = flattenedLayers[j];
      const nextCanMerge =
        next.kind === 'image' &&
        next.blend === 'normal' &&
        next.opacity >= 0.999 &&
        !next.clip &&
        next.light === 'both' &&
        !next.isField &&
        !next.isVariation &&
        next.visible !== false;

      if (nextCanMerge) {
        run.push(next);
        j++;
      } else {
        break;
      }
    }

    // Merge if run has >= 2 layers, OR if it's the very first sequence at index 0
    if (run.length >= 2 || i === 0) {
      const isBaseFundo = i === 0;
      const mergedBuffer = createBuffer(docW, docH);

      for (const item of run) {
        if (item.buffer) {
          compositeLayer(mergedBuffer, item.buffer, {
            mode: 'normal',
            opacity: 1,
            left: item.x,
            top: item.y,
          });
        }
      }

      let finalLayer;
      if (isBaseFundo) {
        finalLayer = {
          name: 'Fundo',
          kind: 'image',
          blend: 'normal',
          opacity: 1,
          clip: false,
          light: 'both',
          visible: true,
          x: 0,
          y: 0,
          width: docW,
          height: docH,
          buffer: mergedBuffer,
          isField: false,
          isVariation: false,
        };
      } else {
        const cropped = cropToVisible(mergedBuffer, 0, 0);
        finalLayer = {
          name: run[run.length - 1].name,
          kind: 'image',
          blend: 'normal',
          opacity: 1,
          clip: false,
          light: 'both',
          visible: true,
          x: cropped.x,
          y: cropped.y,
          width: cropped.width,
          height: cropped.height,
          buffer: cropped.buffer,
          isField: false,
          isVariation: false,
        };
      }

      mergedLayers.push(finalLayer);
      i = j;
    } else {
      mergedLayers.push(layer);
      i++;
    }
  }

  // 3. Assemble final layers, rasters, and fields
  const finalLayers = [];
  const finalRasters = [];
  const finalFields = [];
  let rasterCounter = 1;

  for (let idx = 0; idx < mergedLayers.length; idx++) {
    const raw = mergedLayers[idx];
    const layerId = `l-${String(idx + 1).padStart(3, '0')}`;

    if (raw.kind === 'image') {
      const numStr = String(rasterCounter++).padStart(2, '0');
      const layerLibraryId = `${tplId}--${numStr}`;
      const relPath = `templates/${tplId}/${numStr}.webp`;

      const layerObj = imageLayer({
        id: layerId,
        name: sanitizeName(raw.name, 80),
        blend: sanitizeBlend(raw.blend, reportWarnings, raw.name),
        opacity: raw.opacity,
        clip: raw.clip,
        light: raw.light,
        visible: raw.visible,
        x: raw.x,
        y: raw.y,
        width: raw.width,
        height: raw.height,
        image: {
          src: { library: layerLibraryId },
          fit: 'stretch',
        },
      });

      finalLayers.push(layerObj);

      finalRasters.push({
        id: layerLibraryId,
        relativePath: relPath,
        buffer: raw.buffer,
        width: raw.width,
        height: raw.height,
      });

      if (raw.isField && raw.fieldLabel) {
        finalFields.push({
          layerId,
          label: sanitizeName(raw.fieldLabel, 100),
        });
      }
    } else if (raw.kind === 'text') {
      const layerObj = textLayer({
        id: layerId,
        name: sanitizeName(raw.name, 80),
        blend: sanitizeBlend(raw.blend, reportWarnings, raw.name),
        opacity: raw.opacity,
        clip: raw.clip,
        light: raw.light,
        visible: raw.visible,
        x: raw.x,
        y: raw.y,
        width: raw.width,
        height: raw.height,
        rotation: raw.rotation ?? 0,
        text: raw.text,
      });

      finalLayers.push(layerObj);

      if (raw.isField && raw.fieldLabel) {
        finalFields.push({
          layerId,
          label: sanitizeName(raw.fieldLabel, 100),
        });
      }
    } else if (raw.kind === 'adjust') {
      const layerObj = adjustLayer({
        id: layerId,
        name: sanitizeName(raw.name, 80),
        blend: sanitizeBlend(raw.blend, reportWarnings, raw.name),
        opacity: raw.opacity,
        clip: raw.clip,
        light: raw.light,
        visible: raw.visible,
        x: raw.x,
        y: raw.y,
        width: raw.width,
        height: raw.height,
        adjust: raw.adjust,
      });

      finalLayers.push(layerObj);
    }
  }

  // 4. Assemble Handout document
  const cleanCat = cleanTemplateCategory(category);
  const cleanDocName = cleanTemplateName(name);
  const tags = templateTags(cleanCat, cleanDocName, {
    hasUv: finalLayers.some(l => l.light === 'uv'),
    hasVariants: variantsDetected.length > 0,
  });

  const handout = {
    schema: 1,
    id: tplId,
    revision: 0,
    name: cleanDocName,
    category: cleanCat,
    tags,
    folder: null,
    favorite: false,
    guides: { x: [], y: [] },
    page: {
      width: docW,
      height: docH,
      background: '#00000000',
      uv: { ...DEFAULT_PAGE_UV },
    },
    layers: finalLayers,
    fields: finalFields,
    source: {
      kind: 'template',
      templateId: tplId,
      path: sourcePath || undefined,
    },
    back: null,
  };

  // Validate the generated document
  validateHandout(handout);

  const report = {
    tplId,
    name: cleanDocName,
    category: cleanCat,
    layersCount: finalLayers.length,
    fieldsCount: finalFields.length,
    rastersCount: finalRasters.length,
    missingFonts: Array.from(missingFonts),
    warnings: reportWarnings,
  };

  return {
    handout,
    rasters: finalRasters,
    report,
  };
}
