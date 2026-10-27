/**
 * Pequenas peças comuns dos geradores de SVG novos (Fase C5): semente, envelope, sombra, linha à mão.
 * Tudo determinístico; nenhum texto vira <text> (as letras vêm de letters.js como traços).
 */

export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909);
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };
}

export const f = n => Math.round(n * 100) / 100;

export function svg(w, h, body, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
}

/** Soft drop shadow filter (objects that sit on the page or the desk). */
export const shadowDef = (id, blur = 4, dy = 3, opacity = 0.35) =>
  `<filter id="${id}" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="#000" flood-opacity="${opacity}"/></filter>`;

/** Paper/leather grain: turbulence turned into a faint dark speckle laid over a shape. */
export const grainDef = (id, seed, freq = 0.8, strength = 0.18) =>
  `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${strength * 2} ${-strength * 0.4}" result="g"/><feComposite in="g" in2="SourceAlpha" operator="in"/></filter>`;

export const linearDef = (id, stops, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;

export const radialDef = (id, stops) =>
  `<radialGradient id="${id}" cx="0.4" cy="0.35" r="0.75">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;

/** A hand-drawn polyline: smooth quadratic curve through jittered points. */
export function wobblyPath(points, rand, jitter = 1.2) {
  const pts = points.map(([x, y]) => [x + (rand() - 0.5) * jitter * 2, y + (rand() - 0.5) * jitter * 2]);
  if (pts.length < 3) return `M ${f(pts[0][0])} ${f(pts[0][1])} L ${f(pts[1][0])} ${f(pts[1][1])}`;
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q ${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L ${f(last[0])} ${f(last[1])}`;
}

/** Item record in the shape build.js expects. */
export const item = (id, name, category, tags, svgText, w, h) => ({ id, name, category, tags, width: w, height: h, svg: svgText });
