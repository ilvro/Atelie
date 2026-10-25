/**
 * Client-side Just-In-Time (JIT) PSD Converter for Browser (Etapa 30)
 * Dynamically loads ag-psd on demand, parses layer tree and typography,
 * renders background layers to Canvas/WebP, and registers loaded fonts in document.fonts.
 */
import { textBoxInDocument, cornersToAffine, composeAffine } from '../../scripts/library/lib/psd-geometry.js';
import { normalizeTree } from '../../scripts/library/lib/psd-tree.js';

/**
 * Maps Photoshop blend mode to Canvas 2D globalCompositeOperation.
 */
export function mapBlendMode(psdBlend) {
  const blend = String(psdBlend || '').toLowerCase();
  switch (blend) {
    case 'multiply': return 'multiply';
    case 'screen': return 'screen';
    case 'overlay': return 'overlay';
    case 'darken': return 'darken';
    case 'lighten': return 'lighten';
    case 'color dodge':
    case 'color-dodge': return 'color-dodge';
    case 'color burn':
    case 'color-burn': return 'color-burn';
    case 'hard light':
    case 'hard-light': return 'hard-light';
    case 'soft light':
    case 'soft-light': return 'soft-light';
    case 'difference': return 'difference';
    case 'exclusion': return 'exclusion';
    case 'hue': return 'hue';
    case 'saturation': return 'saturation';
    case 'color': return 'color';
    case 'luminosity': return 'luminosity';
    default: return 'source-over';
  }
}

/**
 * Parses RGB or Hex color to hex string '#rrggbb'.
 */
function parseHexColor(c) {
  if (!c) return '#1a1816';
  if (typeof c === 'string' && c.startsWith('#')) return c;
  if (typeof c === 'object') {
    const r = Math.round(Math.max(0, Math.min(255, (c.r ?? c.red ?? 0) * (c.r <= 1 ? 255 : 1))));
    const g = Math.round(Math.max(0, Math.min(255, (c.g ?? c.green ?? 0) * (c.g <= 1 ? 255 : 1))));
    const b = Math.round(Math.max(0, Math.min(255, (c.b ?? c.blue ?? 0) * (c.b <= 1 ? 255 : 1))));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  return '#1a1816';
}

/**
 * Converts a Canvas element to Blob (WebP with fallback to PNG).
 */
function canvasToBlob(canvas, mimeType = 'image/webp', quality = 0.85) {
  return new Promise((resolve) => {
    if (typeof canvas?.toBlob === 'function') {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else {
            // Fallback to PNG
            canvas.toBlob((pngBlob) => resolve(pngBlob), 'image/png');
          }
        },
        mimeType,
        quality
      );
    } else {
      resolve(null);
    }
  });
}

/**
 * Extracts and loads fonts into document.fonts from the bundle's fontFiles.
 */
async function loadBundleFonts(fontFiles, { signal } = {}) {
  if (!Array.isArray(fontFiles) || fontFiles.length === 0) return;
  if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) return;

  let unzipSync = null;

  for (const fontItem of fontFiles) {
    if (signal?.aborted) return;
    try {
      const fileName = fontItem.name || fontItem.fileName || '';
      const isZip = /\.zip$/i.test(fileName);
      const isFont = /\.(ttf|otf|woff2?)$/i.test(fileName);

      if (isZip) {
        if (!unzipSync) {
          const fflate = await import('fflate');
          unzipSync = fflate.unzipSync;
        }
        const buf = await fontItem.arrayBuffer();
        const unzipped = unzipSync(new Uint8Array(buf));
        for (const [entryName, bytes] of Object.entries(unzipped)) {
          if (/\.(ttf|otf)$/i.test(entryName)) {
            const fontName = entryName.replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '');
            try {
              const face = new FontFace(fontName, bytes);
              await face.load();
              document.fonts.add(face);
            } catch {}
          }
        }
      } else if (isFont) {
        const fontName = fileName.replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '');
        const buf = await fontItem.arrayBuffer();
        try {
          const face = new FontFace(fontName, buf);
          await face.load();
          document.fonts.add(face);
        } catch {}
      }
    } catch (err) {
      console.warn('[atelie-jit] Não foi possível carregar fonte do bundle:', err);
    }
  }
}

/**
 * Converts a single PSD file to an editable handout Just-In-Time.
 */
export async function convertPsdJit({
  psdFile,
  fontFiles = [],
  templateItem,
  db = null,
  onProgress,
  signal,
}) {
  if (!psdFile) {
    throw new Error('Arquivo PSD não fornecido para conversão JIT.');
  }

  // 1. Read PSD buffer
  onProgress?.({ step: 'reading', percent: 15, message: 'Lendo arquivo PSD...' });
  if (signal?.aborted) throw new Error('Operação cancelada.');

  const arrayBuffer = await psdFile.arrayBuffer();
  if (signal?.aborted) throw new Error('Operação cancelada.');

  // 2. Dynamically import ag-psd (pure lazy load)
  onProgress?.({ step: 'loading-engine', percent: 25, message: 'Inicializando motor de PSD...' });
  const agPsdModule = await import('ag-psd');
  const readPsd = agPsdModule.readPsd || agPsdModule.default?.readPsd || agPsdModule.default;

  // Initialize stub canvas if running in Node.js environment (e.g. tests)
  if (typeof document === 'undefined' && agPsdModule.initializeCanvas) {
    const makeImageData = (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
    agPsdModule.initializeCanvas(
      (w, h) => ({
        width: w,
        height: h,
        getContext: () => ({
          createImageData: makeImageData,
          putImageData() {},
          getImageData: (x, y, gw, gh) => makeImageData(gw, gh),
          drawImage() {},
        }),
      }),
      makeImageData
    );
  }

  // 3. Parse PSD structure
  onProgress?.({ step: 'parsing', percent: 40, message: 'Analisando camadas e textos...' });
  if (signal?.aborted) throw new Error('Operação cancelada.');

  const psd = readPsd(arrayBuffer, { useImageData: true, useCanvas: true });
  if (!psd || !psd.width || !psd.height) {
    throw new Error('Arquivo PSD inválido ou sem dimensões válidas.');
  }

  const rawW = psd.width;
  const rawH = psd.height;

  // Scale target to standard max 2048 px
  let scale = 1;
  if (rawW >= 2400 && rawH > rawW) {
    scale = Math.min(1, 1240 / rawW);
  } else {
    scale = Math.min(1, 2048 / Math.max(rawW, rawH));
  }

  const targetW = Math.max(64, Math.round(rawW * scale));
  const targetH = Math.max(64, Math.round(rawH * scale));

  // 4. Load bundle typography in browser
  onProgress?.({ step: 'fonts', percent: 55, message: 'Carregando tipografia...' });
  await loadBundleFonts(fontFiles, { signal });

  // 5. Parse Layer Tree
  const tree = normalizeTree(psd);

  // 6. Compose background non-text layers
  onProgress?.({ step: 'rendering', percent: 70, message: 'Compondo camadas de fundo...' });
  if (signal?.aborted) throw new Error('Operação cancelada.');

  let bgBlob = null;
  if (typeof document !== 'undefined') {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = targetW;
    bgCanvas.height = targetH;
    const ctx = bgCanvas.getContext('2d');

    let drawnLayerCount = 0;

    // Draw non-text layers recursively
    function drawLayer(layer) {
      if (layer.visible === false) return;
      if (layer.text) return; // Skip editable text layers!

      if (layer.canvas) {
        ctx.save();
        ctx.globalAlpha = layer.opacity ?? 1;
        if (layer.blendMode) {
          ctx.globalCompositeOperation = mapBlendMode(layer.blendMode);
        }
        const lx = Math.round((layer.left || 0) * scale);
        const ly = Math.round((layer.top || 0) * scale);
        const lw = Math.round((layer.canvas.width || layer.width) * scale);
        const lh = Math.round((layer.canvas.height || layer.height) * scale);
        ctx.drawImage(layer.canvas, lx, ly, lw, lh);
        ctx.restore();
        drawnLayerCount++;
      }

      if (Array.isArray(layer.children)) {
        for (const child of layer.children) {
          drawLayer(child);
        }
      }
    }

    for (const topLayer of psd.children || []) {
      drawLayer(topLayer);
    }

    // Fallback if no individual layer canvases were drawn
    if (drawnLayerCount === 0 && psd.canvas) {
      ctx.drawImage(psd.canvas, 0, 0, targetW, targetH);
    }

    bgBlob = await canvasToBlob(bgCanvas, 'image/webp', 0.85);

    // Free canvas memory
    bgCanvas.width = 0;
    bgCanvas.height = 0;
  }

  // 7. Extract text layers
  onProgress?.({ step: 'extracting-text', percent: 85, message: 'Extraindo campos de texto editáveis...' });

  const textLayers = [];
  const fields = [];
  let layerIndex = 1;

  function collectTextNodes(nodes) {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (node.visible === false) continue;
      if (node.kind === 'text' || node.text) {
        const t = node.text;
        const boxDoc = textBoxInDocument(t);

        const lx = Math.round(boxDoc.x * scale);
        const ly = Math.round(boxDoc.y * scale);
        const lw = Math.max(1, Math.round(boxDoc.width * scale));
        const lh = Math.max(1, Math.round(boxDoc.height * scale));
        const rot = Math.round((boxDoc.rotation || 0) * 10) / 10;
        const fontSize = Math.max(6, Math.round((t.size || 14) * (boxDoc.scale || 1) * scale));
        const color = parseHexColor(t.color);
        const content = String(t.content || t.text || '').replace(/\r\n|\r/g, '\n');
        const postscript = t.postscript || t.font?.name || null;
        const fontName = postscript || 'IM Fell English';
        const align = t.justification === 'center' ? 'center' : (t.justification === 'right' ? 'right' : 'left');

        const layerId = `layer-text-${layerIndex++}`;
        const fieldLabel = node.name || `Campo ${layerIndex - 1}`;

        textLayers.push({
          id: layerId,
          name: fieldLabel,
          kind: 'text',
          x: lx,
          y: ly,
          width: lw,
          height: lh,
          rotation: rot,
          opacity: node.opacity ?? 1,
          blend: 'normal',
          visible: true,
          locked: false,
          text: {
            content,
            font: {
              family: fontName,
              library: null,
              weight: 400,
              italic: false,
            },
            size: fontSize,
            color,
            align,
            valign: 'top',
            lineHeight: 1.25,
            letterSpacing: 0,
            box: 'area',
            fit: 'shrink',
            ink: {
              style: 'black',
              wear: 0,
              seed: 1,
            },
          },
        });

        fields.push({
          id: layerId,
          label: fieldLabel,
          kind: 'text',
          value: content,
        });
      }

      if (Array.isArray(node.children)) {
        collectTextNodes(node.children);
      }
    }
  }

  collectTextNodes(tree.nodes || []);

  // 8. Assemble Handout document
  onProgress?.({ step: 'assembling', percent: 95, message: 'Montando documento...' });

  const tplId = templateItem.id;
  const sourceId = templateItem.source || 'bundle-local';
  const bgFileName = `templates/${tplId}-bg.webp`;
  const tplFileName = `templates/${tplId}.json`;

  const handoutLayers = [];

  // Add background layer if generated
  if (bgBlob) {
    handoutLayers.push({
      id: 'layer-fundo',
      name: 'Fundo',
      kind: 'image',
      file: bgFileName,
      source: sourceId,
      x: 0,
      y: 0,
      width: targetW,
      height: targetH,
      rotation: 0,
      opacity: 1,
      blend: 'normal',
      visible: true,
      locked: true,
    });
  }

  // Add text layers on top
  handoutLayers.push(...textLayers);

  const handout = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `h-${Date.now()}`,
    schemaVersion: 1,
    name: templateItem.name,
    category: templateItem.category,
    tags: ['jit', 'bundle'],
    revision: 1,
    page: {
      width: targetW,
      height: targetH,
      bleed: 0,
      color: '#ffffff',
      tint: '#2d1b4e',
      strength: 0.85,
    },
    layers: handoutLayers,
    fields,
  };

  // 9. Persist to IndexedDB if db provided
  if (db) {
    const tx = db.transaction(['items', 'files'], 'readwrite');
    const itemsStore = tx.objectStore('items');
    const filesStore = tx.objectStore('files');

    // Update item status to 'ready'
    const updatedItem = {
      ...templateItem,
      status: 'ready',
      file: tplFileName,
      fields: fields.map(f => f.label),
      handout,
    };

    itemsStore.put(updatedItem);

    // Save bgBlob
    if (bgBlob) {
      filesStore.put(bgBlob, [sourceId, bgFileName]);
    }

    // Save template JSON
    const tplBlob = new Blob([JSON.stringify(handout)], { type: 'application/json' });
    filesStore.put(tplBlob, [sourceId, tplFileName]);

    await new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }

  onProgress?.({ step: 'done', percent: 100, message: 'Documento pronto!' });

  return {
    handout,
    bgBlob,
    targetW,
    targetH,
    fields,
  };
}
