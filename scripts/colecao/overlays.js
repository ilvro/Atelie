import { Raster, parseColor } from './raster.js';
import { mulberry32, valueNoise2D, fbm } from './noise.js';

export const OVERLAYS = [
  // Manchas de café (8)
  { id: 'casa-manchas-cafe-1', name: 'Mancha de café · anel', category: 'Manchas', tags: ['café', 'anel', 'xícara'], width: 1024, height: 1024, type: 'coffee-ring', seed: 201 },
  { id: 'casa-manchas-cafe-2', name: 'Mancha de café · anel duplo', category: 'Manchas', tags: ['café', 'anel', 'caneca'], width: 1024, height: 1024, type: 'coffee-double-ring', seed: 202 },
  { id: 'casa-manchas-cafe-3', name: 'Mancha de café · respingos', category: 'Manchas', tags: ['café', 'respingos', 'gotas'], width: 1024, height: 1024, type: 'coffee-splatters', seed: 203 },
  { id: 'casa-manchas-cafe-4', name: 'Mancha de café · xícara incompleta', category: 'Manchas', tags: ['café', 'xícara', 'falha'], width: 1024, height: 1024, type: 'coffee-half-ring', seed: 204 },
  { id: 'casa-manchas-cafe-5', name: 'Mancha de café · poça densa', category: 'Manchas', tags: ['café', 'poça', 'pesada'], width: 1024, height: 1024, type: 'coffee-puddle', seed: 205 },
  { id: 'casa-manchas-cafe-6', name: 'Mancha de café · escorrido', category: 'Manchas', tags: ['café', 'escorrido', 'gota'], width: 1024, height: 1024, type: 'coffee-drip', seed: 206 },
  { id: 'casa-manchas-cafe-7', name: 'Mancha de café · três anéis', category: 'Manchas', tags: ['café', 'múltiplo', 'xícaras'], width: 1024, height: 1024, type: 'coffee-triple-ring', seed: 207 },
  { id: 'casa-manchas-cafe-8', name: 'Mancha de café · mancha com satélites', category: 'Manchas', tags: ['café', 'satélites', 'mesa'], width: 1024, height: 1024, type: 'coffee-satellites', seed: 208 },

  // Água e umidade (6)
  { id: 'casa-agua-umidade-1', name: 'Umidade · mancha d\'água suave', category: 'Água', tags: ['água', 'umidade', 'suave'], width: 1024, height: 1024, type: 'water-soft', seed: 221 },
  { id: 'casa-agua-umidade-2', name: 'Umidade · cantos molhados', category: 'Água', tags: ['água', 'cantos', 'mancha'], width: 2048, height: 2048, type: 'water-corners', seed: 222 },
  { id: 'casa-agua-umidade-3', name: 'Umidade · escorrido vertical', category: 'Água', tags: ['água', 'escorrido', 'gotas'], width: 1024, height: 1024, type: 'water-drips', seed: 223 },
  { id: 'casa-agua-umidade-4', name: 'Umidade · secagem irregular', category: 'Água', tags: ['água', 'secagem', 'anel'], width: 1024, height: 1024, type: 'water-irregular', seed: 224 },
  { id: 'casa-agua-umidade-5', name: 'Umidade · escorridos paralelos', category: 'Água', tags: ['água', 'chuva', 'escorrido'], width: 1024, height: 1024, type: 'water-parallel-drips', seed: 225 },
  { id: 'casa-agua-umidade-6', name: 'Umidade · absorção de borda', category: 'Água', tags: ['água', 'borda', 'infiltração'], width: 2048, height: 2048, type: 'water-edge', seed: 226 },

  // Sangue (12)
  { id: 'casa-sangue-1', name: 'Sangue · gota com cauda', category: 'Sangue', tags: ['sangue', 'gota', 'impacto'], width: 1024, height: 1024, type: 'blood-drop', seed: 241 },
  { id: 'casa-sangue-2', name: 'Sangue · gotas múltiplas', category: 'Sangue', tags: ['sangue', 'gotas', 'pingos'], width: 1024, height: 1024, type: 'blood-multi-drops', seed: 242 },
  { id: 'casa-sangue-3', name: 'Sangue · respingos em leque', category: 'Sangue', tags: ['sangue', 'respingo', 'spray'], width: 1024, height: 1024, type: 'blood-splatter', seed: 243 },
  { id: 'casa-sangue-4', name: 'Sangue · arrasto de dedo', category: 'Sangue', tags: ['sangue', 'arrasto', 'dedo'], width: 1024, height: 1024, type: 'blood-smear', seed: 244 },
  { id: 'casa-sangue-5', name: 'Sangue · poça seca oxidada', category: 'Sangue', tags: ['sangue', 'poça', 'seco'], width: 1024, height: 1024, type: 'blood-puddle', seed: 245 },
  { id: 'casa-sangue-6', name: 'Sangue · palma parcial', category: 'Sangue', tags: ['sangue', 'palma', 'mão'], width: 1024, height: 1024, type: 'blood-handprint', seed: 246 },
  { id: 'casa-sangue-7', name: 'Sangue · borrão espalhado', category: 'Sangue', tags: ['sangue', 'borrão', 'esfregado'], width: 1024, height: 1024, type: 'blood-blot', seed: 247 },
  { id: 'casa-sangue-8', name: 'Sangue · micro-respingos', category: 'Sangue', tags: ['sangue', 'spray', 'fino'], width: 1024, height: 1024, type: 'blood-microspray', seed: 248 },
  { id: 'casa-sangue-9', name: 'Sangue · arrasto duplo', category: 'Sangue', tags: ['sangue', 'arrasto', 'duplo'], width: 1024, height: 1024, type: 'blood-double-smear', seed: 249 },
  { id: 'casa-sangue-10', name: 'Sangue · mancha coagulada', category: 'Sangue', tags: ['sangue', 'coágulo', 'escuro'], width: 1024, height: 1024, type: 'blood-coagulated', seed: 250 },
  { id: 'casa-sangue-11', name: 'Sangue · pingos pesados', category: 'Sangue', tags: ['sangue', 'pingos', 'vertical'], width: 1024, height: 1024, type: 'blood-heavy-drops', seed: 251 },
  { id: 'casa-sangue-12', name: 'Sangue · salpicos mistos', category: 'Sangue', tags: ['sangue', 'misto', 'fresco'], width: 1024, height: 1024, type: 'blood-mixed', seed: 252 },

  // Sujeira e poeira (6)
  { id: 'casa-sujeira-1', name: 'Sujeira · poeira fina', category: 'Sujeira', tags: ['sujeira', 'poeira', 'pontos'], width: 2048, height: 2048, type: 'dirt-dust', seed: 261 },
  { id: 'casa-sujeira-2', name: 'Sujeira · mancha de graxa', category: 'Sujeira', tags: ['graxa', 'óleo', 'mancha'], width: 1024, height: 1024, type: 'dirt-grease', seed: 262 },
  { id: 'casa-sujeira-3', name: 'Sujeira · marcas de fuligem', category: 'Sujeira', tags: ['fuligem', 'carvão', 'dedo'], width: 1024, height: 1024, type: 'dirt-soot', seed: 263 },
  { id: 'casa-sujeira-4', name: 'Sujeira · cantos empoeirados', category: 'Sujeira', tags: ['cantos', 'fuligem', 'armazenamento'], width: 2048, height: 2048, type: 'dirt-corners', seed: 264 },
  { id: 'casa-sujeira-5', name: 'Sujeira · marcas de atrito', category: 'Sujeira', tags: ['mesa', 'atrito', 'arranhões'], width: 2048, height: 2048, type: 'dirt-scratches', seed: 265 },
  { id: 'casa-sujeira-6', name: 'Sujeira · fuligem difusa', category: 'Sujeira', tags: ['fuligem', 'fumaça', 'mancha'], width: 2048, height: 2048, type: 'dirt-diffuse', seed: 266 },

  // Queimado (5)
  { id: 'casa-queimado-1', name: 'Queimado · bordas chamuscadas', category: 'Queimado', tags: ['fogo', 'borda', 'queimado'], width: 2048, height: 2048, type: 'burn-perimeter', seed: 271 },
  { id: 'casa-queimado-2', name: 'Queimado · furo de cigarro', category: 'Queimado', tags: ['cigarro', 'furo', 'brasa'], width: 1024, height: 1024, type: 'burn-cigarette', seed: 272 },
  { id: 'casa-queimado-3', name: 'Queimado · canto chamuscado', category: 'Queimado', tags: ['canto', 'fogo', 'chamuscado'], width: 2048, height: 2048, type: 'burn-corner', seed: 273 },
  { id: 'casa-queimado-4', name: 'Queimado · lateral queimada', category: 'Queimado', tags: ['lateral', 'fogo', 'labareda'], width: 2048, height: 2048, type: 'burn-lateral', seed: 274 },
  { id: 'casa-queimado-5', name: 'Queimado · furos múltiplos', category: 'Queimado', tags: ['furos', 'brasas', 'destruição'], width: 2048, height: 2048, type: 'burn-holes', seed: 275 },

  // Amassados (4)
  { id: 'casa-amassados-1', name: 'Amassado · vincos suaves', category: 'Amassados', tags: ['amassado', 'suave', 'vincos'], width: 2048, height: 2048, type: 'crumple-soft', seed: 281 },
  { id: 'casa-amassados-2', name: 'Amassado · vincos médios', category: 'Amassados', tags: ['amassado', 'médio', 'diagonal'], width: 2048, height: 2048, type: 'crumple-medium', seed: 282 },
  { id: 'casa-amassados-3', name: 'Amassado · papel esmagado', category: 'Amassados', tags: ['amassado', 'pesado', 'bolsa'], width: 2048, height: 2048, type: 'crumple-heavy', seed: 283 },
  { id: 'casa-amassados-4', name: 'Amassado · amassado de bolso', category: 'Amassados', tags: ['amassado', 'bolso', 'dobras'], width: 2048, height: 2048, type: 'crumple-pocket', seed: 284 },

  // Dobras (4)
  { id: 'casa-dobras-1', name: 'Dobras · dobra central', category: 'Dobras', tags: ['dobra', 'meio', 'folha'], width: 2048, height: 2048, type: 'fold-single', seed: 291 },
  { id: 'casa-dobras-2', name: 'Dobras · carta em três', category: 'Dobras', tags: ['dobra', 'carta', 'envelope'], width: 2048, height: 2048, type: 'fold-letter', seed: 292 },
  { id: 'casa-dobras-3', name: 'Dobras · dobra em cruz', category: 'Dobras', tags: ['dobra', 'cruz', 'quatro'], width: 2048, height: 2048, type: 'fold-cross', seed: 293 },
  { id: 'casa-dobras-4', name: 'Dobras · mapa desdobrado', category: 'Dobras', tags: ['dobra', 'mapa', 'grade'], width: 2048, height: 2048, type: 'fold-map', seed: 294 },

  // Digitais (4)
  { id: 'casa-digitais-1', name: 'Digital · impressão em tinta', category: 'Digitais', tags: ['digital', 'tinta', 'perícia'], width: 1024, height: 1024, type: 'fingerprint-ink', seed: 301 },
  { id: 'casa-digitais-2', name: 'Digital · tinta gasta', category: 'Digitais', tags: ['digital', 'gasta', 'falhada'], width: 1024, height: 1024, type: 'fingerprint-worn', seed: 302 },
  { id: 'casa-digitais-3', name: 'Digital · impressão em sangue', category: 'Digitais', tags: ['digital', 'sangue', 'crime'], width: 1024, height: 1024, type: 'fingerprint-blood', seed: 303 },
  { id: 'casa-digitais-4', name: 'Digital · polegar e indicador', category: 'Digitais', tags: ['digital', 'dupla', 'polegar'], width: 1024, height: 1024, type: 'fingerprint-double', seed: 304 },

  // Rasgos (4)
  { id: 'casa-rasgos-1', name: 'Rasgo · borda inferior', category: 'Rasgos', tags: ['rasgo', 'inferior', 'recorte'], width: 2048, height: 2048, type: 'tear-bottom', seed: 311 },
  { id: 'casa-rasgos-2', name: 'Rasgo · borda superior', category: 'Rasgos', tags: ['rasgo', 'superior', 'recorte'], width: 2048, height: 2048, type: 'tear-top', seed: 312 },
  { id: 'casa-rasgos-3', name: 'Rasgo · canto arrancado', category: 'Rasgos', tags: ['rasgo', 'canto', 'recorte'], width: 2048, height: 2048, type: 'tear-corner', seed: 313 },
  { id: 'casa-rasgos-4', name: 'Rasgo · lateral irregular', category: 'Rasgos', tags: ['rasgo', 'lateral', 'recorte'], width: 2048, height: 2048, type: 'tear-side', seed: 314 },
];

/**
 * Generates an overlay raster based on definition.
 */
export function generateOverlay(def, { width, height } = {}) {
  const W = width || def.width;
  const H = height || def.height;
  const scale = W / def.width;

  const rand = mulberry32(def.seed);
  const noise = valueNoise2D(def.seed);

  // Default transparent canvas [0, 0, 0, 0], except crumple which uses neutral 50% gray [0.5, 0.5, 0.5, 1.0] for soft-light
  const isCrumple = def.type.startsWith('crumple');
  const raster = new Raster(W, H, isCrumple ? [0.5, 0.5, 0.5, 1.0] : [0, 0, 0, 0]);

  switch (def.type) {
    // --- Coffee stains ---
    case 'coffee-ring':
    case 'coffee-double-ring':
    case 'coffee-half-ring':
    case 'coffee-triple-ring':
    case 'coffee-puddle':
    case 'coffee-drip':
    case 'coffee-splatters':
    case 'coffee-satellites':
      drawCoffeeOverlay(raster, def.type, W, H, scale, rand, noise);
      break;

    // --- Water & Dampness ---
    case 'water-soft':
    case 'water-corners':
    case 'water-drips':
    case 'water-irregular':
    case 'water-parallel-drips':
    case 'water-edge':
      drawWaterOverlay(raster, def.type, W, H, scale, rand, noise);
      break;

    // --- Blood ---
    case 'blood-drop':
    case 'blood-multi-drops':
    case 'blood-splatter':
    case 'blood-smear':
    case 'blood-puddle':
    case 'blood-handprint':
    case 'blood-blot':
    case 'blood-microspray':
    case 'blood-double-smear':
    case 'blood-coagulated':
    case 'blood-heavy-drops':
    case 'blood-mixed':
      drawBloodOverlay(raster, def.type, W, H, scale, rand, noise);
      break;

    // --- Dirt & Dust ---
    case 'dirt-dust':
    case 'dirt-grease':
    case 'dirt-soot':
    case 'dirt-corners':
    case 'dirt-scratches':
    case 'dirt-diffuse':
      drawDirtOverlay(raster, def.type, W, H, scale, rand, noise);
      break;

    // --- Burn ---
    case 'burn-perimeter':
    case 'burn-cigarette':
    case 'burn-corner':
    case 'burn-lateral':
    case 'burn-holes':
      drawBurnOverlay(raster, def.type, W, H, scale, rand, noise);
      break;

    // --- Crumple (soft-light crease map) ---
    case 'crumple-soft':
    case 'crumple-medium':
    case 'crumple-heavy':
    case 'crumple-pocket':
      drawCrumpleOverlay(raster, def.type, W, H, scale, rand, noise);
      break;

    // --- Folds ---
    case 'fold-single':
    case 'fold-letter':
    case 'fold-cross':
    case 'fold-map':
      drawFoldOverlay(raster, def.type, W, H, scale, rand, noise);
      break;

    // --- Fingerprints ---
    case 'fingerprint-ink':
    case 'fingerprint-worn':
    case 'fingerprint-blood':
    case 'fingerprint-double':
      drawFingerprintOverlay(raster, def.type, W, H, scale, rand, noise);
      break;

    // --- Tears (cutout masks) ---
    case 'tear-bottom':
    case 'tear-top':
    case 'tear-corner':
    case 'tear-side':
      drawTearOverlay(raster, def.type, W, H, scale, rand, noise);
      break;

    default:
      break;
  }

  return raster;
}

// --- Generator Implementations ---

function drawCoffeeOverlay(raster, type, W, H, scale, rand, noise) {
  const [cr, cg, cb] = parseColor('#6d3f18');
  const rings = type === 'coffee-triple-ring' ? 3 : type === 'coffee-double-ring' ? 2 : 1;

  for (let r = 0; r < rings; r++) {
    const cx = W / 2 + (rings > 1 ? (rand() - 0.5) * W * 0.4 : (rand() - 0.5) * 60 * scale);
    const cy = H / 2 + (rings > 1 ? (rand() - 0.5) * H * 0.4 : (rand() - 0.5) * 60 * scale);
    const radius = (200 + rand() * 80) * scale;
    const isHalf = type === 'coffee-half-ring' && r === 0;

    const numPoints = Math.round(2 * Math.PI * radius * 1.5);
    const radRange = isHalf ? Math.PI * 1.25 : Math.PI * 2;
    const startAngle = rand() * Math.PI * 2;

    for (let i = 0; i < numPoints; i++) {
      const frac = i / numPoints;
      if (isHalf && frac > 0.65) continue;
      const angle = startAngle + frac * radRange;
      const jag = (noise(Math.cos(angle) * 3, Math.sin(angle) * 3) - 0.5) * (14 * scale);
      const curR = radius + jag;

      const px = cx + Math.cos(angle) * curR;
      const py = cy + Math.sin(angle) * curR;

      // Dark edge
      const th = (2.5 + rand() * 3) * scale;
      const alpha = 0.55 + rand() * 0.35;
      raster.drawCircle(px, py, th, [cr, cg, cb, alpha]);
    }

    // Inner subtle wash
    if (type === 'coffee-puddle' || type === 'coffee-ring') {
      const innerSteps = 60;
      for (let s = 0; s < innerSteps; s++) {
        const inA = rand() * Math.PI * 2;
        const inD = rand() * radius * 0.85;
        const ix = cx + Math.cos(inA) * inD;
        const iy = cy + Math.sin(inA) * inD;
        raster.drawCircle(ix, iy, (18 + rand() * 25) * scale, [cr, cg, cb, 0.05 + rand() * 0.08]);
      }
    }
  }

  // Splatters and drips
  if (type === 'coffee-splatters' || type === 'coffee-satellites' || type === 'coffee-drip') {
    const drops = type === 'coffee-splatters' ? 45 : 18;
    for (let i = 0; i < drops; i++) {
      const dx = rand() * W;
      const dy = rand() * H;
      const rad = (1.5 + rand() * 6) * scale;
      raster.drawCircle(dx, dy, rad, [cr, cg, cb, 0.6 + rand() * 0.3]);

      if (type === 'coffee-drip' && i < 4) {
        const dLen = (60 + rand() * 140) * scale;
        raster.drawLine(dx, dy, dx + (rand() - 0.5) * 8 * scale, dy + dLen, [cr, cg, cb, 0.65], Math.max(1, 2.5 * scale), 1, 0.2, rand);
      }
    }
  }
}

function drawWaterOverlay(raster, type, W, H, scale, rand, noise) {
  const [wr, wg, wb] = parseColor('#7e7256');

  if (type === 'water-soft' || type === 'water-irregular') {
    const count = type === 'water-irregular' ? 3 : 1;
    for (let k = 0; k < count; k++) {
      const cx = W / 2 + (rand() - 0.5) * W * 0.4;
      const cy = H / 2 + (rand() - 0.5) * H * 0.4;
      const baseR = (160 + rand() * 180) * scale;
      const steps = 180;

      for (let s = 0; s < steps; s++) {
        const angle = (s / steps) * Math.PI * 2;
        const jag = (fbm(noise, Math.cos(angle) * 2, Math.sin(angle) * 2) - 0.5) * (baseR * 0.5);
        const curR = baseR + jag;
        const px = cx + Math.cos(angle) * curR;
        const py = cy + Math.sin(angle) * curR;

        // Dark dry-edge rim
        raster.drawCircle(px, py, (2 + rand() * 3) * scale, [wr, wg, wb, 0.45]);
        // Faint wash towards center
        const inD = curR * (0.4 + rand() * 0.55);
        raster.drawCircle(cx + Math.cos(angle) * inD, cy + Math.sin(angle) * inD, (20 + rand() * 30) * scale, [wr, wg, wb, 0.04]);
      }
    }
  } else if (type === 'water-drips' || type === 'water-parallel-drips') {
    const lines = type === 'water-parallel-drips' ? 6 : 3;
    for (let i = 0; i < lines; i++) {
      const x = (0.2 + 0.6 * (i / lines)) * W + (rand() - 0.5) * 40 * scale;
      const y0 = rand() * H * 0.2;
      const y1 = y0 + (300 + rand() * 450) * scale;
      raster.drawLine(x, y0, x, y1, [wr, wg, wb, 0.35], Math.max(1, 3 * scale), 1, 0.8, rand);
      raster.drawCircle(x, y1, (4 + rand() * 5) * scale, [wr, wg, wb, 0.5]);
    }
  } else if (type === 'water-corners' || type === 'water-edge') {
    for (let y = 0; y < H; y += Math.max(1, Math.round(3 * scale))) {
      for (let x = 0; x < W; x += Math.max(1, Math.round(3 * scale))) {
        const edgeDist = type === 'water-corners'
          ? Math.min(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y))
          : Math.min(x, W - x, y, H - y);
        if (edgeDist < 250 * scale) {
          const n = noise(x * 0.01, y * 0.01);
          if (n > 0.4) {
            raster.blendPixel(x, y, wr, wg, wb, (1 - edgeDist / (250 * scale)) * 0.15 * n, 'normal');
          }
        }
      }
    }
  }
}

function drawBloodOverlay(raster, type, W, H, scale, rand, noise) {
  const isDark = type === 'blood-puddle' || type === 'blood-coagulated';
  const [br, bg, bb] = parseColor(isDark ? '#4f0808' : '#7d0c0c');

  if (type === 'blood-drop' || type === 'blood-multi-drops' || type === 'blood-heavy-drops') {
    const drops = type === 'blood-drop' ? 1 : type === 'blood-heavy-drops' ? 4 : 8;
    for (let d = 0; d < drops; d++) {
      const dx = W / 2 + (drops > 1 ? (rand() - 0.5) * W * 0.6 : 0);
      const dy = H / 2 + (drops > 1 ? (rand() - 0.5) * H * 0.6 : 0);
      const r = (10 + rand() * 24) * scale;

      // Core pool
      raster.drawCircle(dx, dy, r, [br, bg, bb, 0.95]);

      // Splash tail
      const tailAngle = rand() * Math.PI * 2;
      const tailLen = r * (2 + rand() * 3);
      raster.drawLine(
        dx,
        dy,
        dx + Math.cos(tailAngle) * tailLen,
        dy + Math.sin(tailAngle) * tailLen,
        [br, bg, bb, 0.85],
        Math.max(1, r * 0.6),
        1,
        0.5,
        rand
      );

      // Satellites
      for (let s = 0; s < 7; s++) {
        const sDist = tailLen * (1.1 + rand() * 0.8);
        const sAngle = tailAngle + (rand() - 0.5) * 0.7;
        raster.drawCircle(dx + Math.cos(sAngle) * sDist, dy + Math.sin(sAngle) * sDist, (1.5 + rand() * 4) * scale, [br, bg, bb, 0.8]);
      }
    }
  } else if (type === 'blood-splatter' || type === 'blood-microspray' || type === 'blood-mixed') {
    const originX = W * 0.3;
    const originY = H * 0.7;
    const count = type === 'blood-microspray' ? 90 : 45;
    const fanAngle = -Math.PI / 4;

    for (let i = 0; i < count; i++) {
      const spread = (rand() - 0.5) * 0.8;
      const dist = (50 + rand() * (type === 'blood-microspray' ? 500 : 700)) * scale;
      const px = originX + Math.cos(fanAngle + spread) * dist;
      const py = originY + Math.sin(fanAngle + spread) * dist;
      const rad = (1 + rand() * (type === 'blood-microspray' ? 3 : 7)) * scale;
      raster.drawCircle(px, py, rad, [br, bg, bb, 0.85]);
    }
  } else if (type === 'blood-smear' || type === 'blood-double-smear') {
    const smears = type === 'blood-double-smear' ? 2 : 1;
    for (let m = 0; m < smears; m++) {
      const x0 = W * 0.25 + m * 40 * scale;
      const y0 = H * 0.35 + m * 20 * scale;
      const x1 = x0 + (350 + rand() * 200) * scale;
      const y1 = y0 + (100 + rand() * 120) * scale;

      const numLines = 5;
      for (let l = 0; l < numLines; l++) {
        const off = (l - numLines / 2) * (7 * scale);
        raster.drawLine(x0, y0 + off, x1, y1 + off, [br, bg, bb, 0.55 + rand() * 0.3], Math.max(1, (8 + rand() * 10) * scale), 1, 1.2, rand);
      }
    }
  } else if (type === 'blood-puddle' || type === 'blood-coagulated' || type === 'blood-blot' || type === 'blood-handprint') {
    const cx = W / 2;
    const cy = H / 2;
    const rad = 140 * scale;

    for (let a = 0; a < 200; a++) {
      const angle = (a / 200) * Math.PI * 2;
      const r = rad * (0.6 + 0.4 * noise(Math.cos(angle) * 3, Math.sin(angle) * 3));
      raster.drawLine(cx, cy, cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, [br, bg, bb, 0.9], Math.max(1, 6 * scale), 1, 0, rand);
    }
  }
}

function drawDirtOverlay(raster, type, W, H, scale, rand, noise) {
  const [dr, dg, db] = parseColor('#2a241b');

  if (type === 'dirt-dust' || type === 'dirt-scratches') {
    const count = Math.round(1800 * (W / 2048));
    for (let i = 0; i < count; i++) {
      const x = rand() * W;
      const y = rand() * H;
      raster.set(Math.floor(x), Math.floor(y), dr, dg, db, 0.2 + rand() * 0.5);
    }
    if (type === 'dirt-scratches') {
      for (let s = 0; s < 35; s++) {
        const sx = rand() * W;
        const sy = rand() * H;
        const len = (20 + rand() * 60) * scale;
        const angle = rand() * Math.PI * 2;
        raster.drawLine(sx, sy, sx + Math.cos(angle) * len, sy + Math.sin(angle) * len, [dr, dg, db, 0.35], Math.max(1, 1 * scale), 1, 0.2, rand);
      }
    }
  } else if (type === 'dirt-grease' || type === 'dirt-soot' || type === 'dirt-diffuse') {
    const cx = W * 0.5 + (rand() - 0.5) * W * 0.3;
    const cy = H * 0.5 + (rand() - 0.5) * H * 0.3;
    const rad = (120 + rand() * 150) * scale;

    for (let i = 0; i < 400; i++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * rad;
      const px = cx + Math.cos(a) * d;
      const py = cy + Math.sin(a) * d;
      const alpha = (1 - d / rad) * (0.2 + rand() * 0.35);
      raster.drawCircle(px, py, (12 + rand() * 20) * scale, [dr, dg, db, alpha]);
    }
  } else if (type === 'dirt-corners') {
    for (let y = 0; y < H; y += 4) {
      for (let x = 0; x < W; x += 4) {
        const dist = Math.min(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));
        if (dist < 320 * scale) {
          const n = noise(x * 0.015, y * 0.015);
          if (n > 0.45) {
            raster.blendPixel(x, y, dr, dg, db, (1 - dist / (320 * scale)) * 0.4 * n, 'normal');
          }
        }
      }
    }
  }
}

function drawBurnOverlay(raster, type, W, H, scale, rand, noise) {
  const [br, bg, bb] = parseColor('#0a0705');
  const [er, eg, eb] = parseColor('#5c2005');

  if (type === 'burn-cigarette' || type === 'burn-holes') {
    const holes = type === 'burn-holes' ? 3 : 1;
    for (let h = 0; h < holes; h++) {
      const cx = W * (0.3 + 0.4 * (h / Math.max(1, holes)));
      const cy = H * 0.5 + (rand() - 0.5) * 100 * scale;
      const holeR = (30 + rand() * 30) * scale;
      const scorchR = holeR * 2.5;

      // Scorch ring
      for (let r = scorchR; r >= holeR; r -= 2) {
        const t = (r - holeR) / (scorchR - holeR);
        const col = [er * (1 - t) + br * t, eg * (1 - t) + bg * t, eb * (1 - t) + bb * t, (1 - t) * 0.95];
        raster.drawRing(cx, cy, r, Math.max(1, 3 * scale), col, 1);
      }
      // Completely burned out transparent hole
      for (let y = Math.floor(cy - holeR); y <= Math.ceil(cy + holeR); y++) {
        for (let x = Math.floor(cx - holeR); x <= Math.ceil(cx + holeR); x++) {
          if (Math.hypot(x - cx, y - cy) <= holeR) {
            raster.set(x, y, 0, 0, 0, 0);
          }
        }
      }
    }
  } else if (type === 'burn-perimeter' || type === 'burn-corner' || type === 'burn-lateral') {
    const maxBand = (type === 'burn-corner' ? 240 : 160) * scale;

    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        let dist = 9999;
        if (type === 'burn-perimeter') {
          dist = Math.min(x, W - 1 - x, y, H - 1 - y);
        } else if (type === 'burn-corner') {
          dist = Math.hypot(W - 1 - x, y);
        } else if (type === 'burn-lateral') {
          dist = Math.min(x, W - 1 - x);
        }

        if (dist < maxBand) {
          const t = dist / maxBand;
          const n = noise(x * 0.015, y * 0.015);
          const alpha = Math.max(0, Math.min(1, (1 - t) * (0.6 + 0.4 * n)));
          const col = t < 0.2 ? [br, bg, bb] : [er, eg, eb];
          raster.set(x, y, col[0], col[1], col[2], alpha);
          raster.set(x + 1, y, col[0], col[1], col[2], alpha);
          raster.set(x, y + 1, col[0], col[1], col[2], alpha);
          raster.set(x + 1, y + 1, col[0], col[1], col[2], alpha);
        }
      }
    }
  }
}

function drawCrumpleOverlay(raster, type, W, H, scale, rand, noise) {
  // Neutral 50% gray base for soft-light: [0.5, 0.5, 0.5, 1.0]
  const creaseCount = type === 'crumple-heavy' ? 45 : type === 'crumple-medium' ? 25 : type === 'crumple-pocket' ? 20 : 12;

  for (let c = 0; c < creaseCount; c++) {
    const numSegs = 4 + Math.floor(rand() * 4);
    let x = rand() * W;
    let y = type === 'crumple-pocket' ? H * 0.4 + rand() * H * 0.6 : rand() * H;
    let angle = rand() * Math.PI * 2;

    for (let s = 0; s < numSegs; s++) {
      const segLen = (50 + rand() * 120) * scale;
      angle += (rand() - 0.5) * 1.3;
      const nextX = x + Math.cos(angle) * segLen;
      const nextY = y + Math.sin(angle) * segLen;

      // Dark shadow edge
      raster.drawLine(x, y, nextX, nextY, [0.15, 0.15, 0.15, 0.55], Math.max(1, 2.5 * scale), 1, 0, rand);

      // Light highlight edge slightly offset
      const perpX = Math.cos(angle + Math.PI / 2) * (2 * scale);
      const perpY = Math.sin(angle + Math.PI / 2) * (2 * scale);
      raster.drawLine(x + perpX, y + perpY, nextX + perpX, nextY + perpY, [0.95, 0.95, 0.95, 0.55], Math.max(1, 2 * scale), 1, 0, rand);

      x = nextX;
      y = nextY;
    }
  }
}

function drawFoldOverlay(raster, type, W, H, scale, rand) {
  const folds = [];
  if (type === 'fold-single') {
    folds.push({ horiz: true, pos: H / 2 });
  } else if (type === 'fold-letter') {
    folds.push({ horiz: true, pos: H * (1 / 3) });
    folds.push({ horiz: true, pos: H * (2 / 3) });
  } else if (type === 'fold-cross') {
    folds.push({ horiz: true, pos: H / 2 });
    folds.push({ horiz: false, pos: W / 2 });
  } else if (type === 'fold-map') {
    folds.push({ horiz: true, pos: H * 0.25 });
    folds.push({ horiz: true, pos: H * 0.5 });
    folds.push({ horiz: true, pos: H * 0.75 });
    folds.push({ horiz: false, pos: W * 0.5 });
  }

  const band = Math.max(4, 16 * scale);

  for (const fold of folds) {
    if (fold.horiz) {
      const y = Math.round(fold.pos);
      for (let dy = -band; dy <= band; dy++) {
        const curY = y + dy;
        if (curY < 0 || curY >= H) continue;
        const t = Math.abs(dy) / band;
        const alpha = Math.max(0, 1 - t) * 0.45;
        const col = dy <= 0 ? [0.2, 0.18, 0.15] : [0.9, 0.88, 0.85];
        for (let x = 0; x < W; x++) {
          raster.blendPixel(x, curY, col[0], col[1], col[2], alpha, 'normal');
        }
      }
    } else {
      const x = Math.round(fold.pos);
      for (let dx = -band; dx <= band; dx++) {
        const curX = x + dx;
        if (curX < 0 || curX >= W) continue;
        const t = Math.abs(dx) / band;
        const alpha = Math.max(0, 1 - t) * 0.45;
        const col = dx <= 0 ? [0.2, 0.18, 0.15] : [0.9, 0.88, 0.85];
        for (let y = 0; y < H; y++) {
          raster.blendPixel(curX, y, col[0], col[1], col[2], alpha, 'normal');
        }
      }
    }
  }
}

function drawFingerprintOverlay(raster, type, W, H, scale, rand, noise) {
  const isBlood = type === 'fingerprint-blood';
  const isWorn = type === 'fingerprint-worn';
  const [fr, fg, fb] = parseColor(isBlood ? '#7a0e0e' : '#1a1815');
  const prints = type === 'fingerprint-double' ? 2 : 1;

  for (let p = 0; p < prints; p++) {
    const cx = W / 2 + (prints > 1 ? (p === 0 ? -70 : 70) * scale : 0);
    const cy = H / 2 + (prints > 1 ? (p === 0 ? -40 : 40) * scale : 0);
    const radius = 120 * scale;

    const numRidges = 22;
    for (let r = 1; r <= numRidges; r++) {
      const curR = (r / numRidges) * radius;
      const numSteps = Math.ceil(2 * Math.PI * curR * 1.4);

      for (let s = 0; s < numSteps; s++) {
        const angle = (s / numSteps) * Math.PI * 2;
        if (isWorn && rand() > 0.6) continue;

        const ridgeJitter = (noise(Math.cos(angle) * 4 + r, Math.sin(angle) * 4) - 0.5) * (8 * scale);
        const rad = curR + ridgeJitter;
        const px = cx + Math.cos(angle) * (rad * 0.8); // elliptical fingerprint aspect
        const py = cy + Math.sin(angle) * rad;

        raster.drawCircle(px, py, Math.max(1, 1.8 * scale), [fr, fg, fb, 0.7]);
      }
    }
  }
}

function drawTearOverlay(raster, type, W, H, scale, rand, noise) {
  // White opaque mask with cutout transparent areas
  raster.fill(1, 1, 1, 1);
  const depth = (80 + rand() * 40) * scale;

  if (type === 'tear-bottom') {
    for (let x = 0; x < W; x++) {
      const jag = depth * (0.3 + 0.7 * noise(x * 0.02, 1));
      const cutY = H - jag;
      for (let y = Math.floor(cutY); y < H; y++) {
        raster.set(x, y, 0, 0, 0, 0);
      }
    }
  } else if (type === 'tear-top') {
    for (let x = 0; x < W; x++) {
      const cutY = depth * (0.3 + 0.7 * noise(x * 0.02, 2));
      for (let y = 0; y < Math.ceil(cutY); y++) {
        raster.set(x, y, 0, 0, 0, 0);
      }
    }
  } else if (type === 'tear-corner') {
    const cutCorner = (250 + rand() * 100) * scale;
    for (let y = 0; y < cutCorner; y++) {
      for (let x = 0; x < cutCorner; x++) {
        const d = Math.hypot(x, y);
        if (d < cutCorner * (0.8 + 0.4 * noise(x * 0.02, y * 0.02))) {
          raster.set(x, y, 0, 0, 0, 0);
        }
      }
    }
  } else if (type === 'tear-side') {
    for (let y = 0; y < H; y++) {
      const cutX = depth * (0.3 + 0.7 * noise(y * 0.02, 3));
      for (let x = 0; x < Math.ceil(cutX); x++) {
        raster.set(x, y, 0, 0, 0, 0);
      }
    }
  }
}

