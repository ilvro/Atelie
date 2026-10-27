/**
 * Silhuetas da coleção: cada uma é UMA camada `cut` (Fase C1), com os contornos criados por código e
 * sorteados pela semente. O resultado é o mesmo que a pessoa faria com a tesoura, o rasgar ou o isqueiro,
 * e pode ser editado do mesmo jeito (Propriedades › corte). Tudo é determinístico: mesma semente, mesmos pontos.
 */
import { createRng } from '../../src/render/handout-effects.js';
import { cutEffect, cornerTear } from '../../src/domain/cut.js';

export const SILHOUETTES = ['rasgado-topo', 'rasgado-bordas', 'queimado', 'recorte-tesoura', 'picote', 'deckle', 'canto-arrancado', 'meia-folha'];

const clamp01 = v => Math.max(0, Math.min(1, Math.round(v * 10000) / 10000));
const unit = ([x, y]) => [clamp01(x), clamp01(y)];

/** A line from one end to the other, wandering slowly around `level` (what the hand does when it cuts). */
function wander(rand, from, to, level, amount, steps = 14) {
  const phase = rand() * Math.PI * 2;
  const wobble = rand() * 0.6 + 0.7;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const drift = Math.sin(t * Math.PI * wobble * 2 + phase) * amount + (rand() - 0.5) * amount * 0.5;
    return [from + (to - from) * t, level + drift];
  });
}

/** Strip along one side of the sheet, `depth` thick, with an irregular inner edge. */
function strip(side, depth, rand, amount = depth * 0.25) {
  const line = wander(rand, 0, 1, depth, amount);
  const top = line.map(([t, y]) => [t, y]);
  if (side === 'topo') return [[0, 0], [1, 0], ...top.reverse().map(([t, y]) => [t, y])].map(unit);
  if (side === 'base') return [[0, 1], [1, 1], ...line.reverse().map(([t, y]) => [t, 1 - y])].map(unit);
  if (side === 'esquerda') return [[0, 0], [0, 1], ...line.reverse().map(([t, y]) => [y, t])].map(unit);
  return [[1, 0], [1, 1], ...line.reverse().map(([t, y]) => [1 - y, t])].map(unit);
}

/** Frame (even-odd: outer box minus a slightly crooked inner box), as two contours. */
function frame(inset, rand, crooked = 0) {
  const j = () => (rand() - 0.5) * crooked;
  const inner = [[inset + j(), inset + j()], [1 - inset + j(), inset + j()], [1 - inset + j(), 1 - inset + j()], [inset + j(), 1 - inset + j()]].map(unit);
  return [[[0, 0], [1, 0], [1, 1], [0, 1]], inner];
}

/**
 * Camada de corte pronta para a lista de camadas de um modelo.
 * `kind` é uma de SILHOUETTES; `page` serve ao raio do queimado (px da página).
 */
export function silhouette(kind, { seed = 1, page = { width: 1240, height: 1754 }, side = null } = {}) {
  if (!SILHOUETTES.includes(kind)) throw new Error(`Silhueta desconhecida: ${kind}`);
  const rand = createRng(seed * 7919 + 13);
  const base = { seed: Math.max(1, Math.floor(seed)) };
  const layer = (name, effect, params = {}) => ({
    kind: 'effect',
    name,
    effect: { ...cutEffect({ ...base, ...effect }), params },
  });
  const pick = list => list[Math.floor(rand() * list.length)];

  switch (kind) {
    case 'rasgado-topo':
      return layer('Rasgo · topo', { edge: 'rasgado', remove: [strip('topo', 0.04 + rand() * 0.04, rand)], fiber: 0.8 }, { rough: 0.8 });
    case 'rasgado-bordas': {
      const sides = ['topo', 'base', 'esquerda', 'direita'].sort(() => rand() - 0.5).slice(0, 2 + Math.floor(rand() * 2));
      return layer('Rasgo · bordas', { edge: 'rasgado', remove: sides.map(s => strip(s, 0.012 + rand() * 0.02, rand)), fiber: 0.9 }, { rough: 0.9 });
    }
    case 'queimado': {
      // Corner (or base) eaten by fire: a trail of growing discs from the edge inwards
      const from = side || pick(['nw', 'ne', 'se', 'sw', 'base']);
      const r0 = Math.min(page.width, page.height) * 0.05;
      const start = { nw: [0, 0], ne: [1, 0], se: [1, 1], sw: [0, 1], base: [0.15 + rand() * 0.2, 1] }[from];
      const end = { nw: [0.12, 0.09], ne: [0.88, 0.09], se: [0.88, 0.91], sw: [0.12, 0.91], base: [0.8 - rand() * 0.2, 0.96] }[from];
      const trail = Array.from({ length: 9 }, (_, i) => {
        const t = i / 8;
        const jitter = (rand() - 0.5) * 0.03;
        return [clamp01(start[0] + (end[0] - start[0]) * t + jitter), clamp01(start[1] + (end[1] - start[1]) * t + jitter),
          Math.round(r0 * (0.6 + 0.9 * Math.sin(t * Math.PI) + rand() * 0.4))];
      });
      return layer('Queimado', { edge: 'queimado', holes: [trail], char: 0.55 });
    }
    case 'recorte-tesoura':
      return layer('Recorte · tesoura', { edge: 'tesoura', remove: frame(0.018 + rand() * 0.012, rand, 0.012) });
    case 'picote':
      return layer('Recorte · picote', { edge: 'picote', remove: frame(0.022, rand, 0) });
    case 'deckle':
      return layer('Borda irregular', { edge: 'rasgado', remove: frame(0.007, rand, 0.004), fiber: 1 }, { rough: 1 });
    case 'canto-arrancado': {
      const corner = side || pick(['nw', 'ne', 'se', 'sw']);
      return layer('Canto arrancado', { edge: 'rasgado', remove: cornerTear(corner, 0.1 + rand() * 0.12, rand), fiber: 0.8 }, { rough: 0.8 });
    }
    case 'meia-folha': {
      // The lower half is gone: a ragged line a little below the middle, slightly tilted
      const line = wander(rand, 0, 1, 0.5 + rand() * 0.14, 0.03, 18);
      return layer('Meia folha', { edge: 'rasgado', remove: [[...line, [1, 1], [0, 1]].map(unit)], fiber: 0.85 }, { rough: 0.85 });
    }
    default:
      throw new Error(`Silhueta desconhecida: ${kind}`);
  }
}
