/**
 * Variações (C8 a C11): o mesmo documento limpo, ensanguentado, queimado, molhado, sob luz negra ou de
 * arquivo morto. Cada variação é um modelo derivado de uma base por uma receita de envelhecimento:
 * tem id e prévia próprios, entra no manifesto com `family: <slug da base>` e a gaveta Modelos agrupa as duas.
 */
import { aging } from '../kit.js';
import { META } from './meta.js';
import { T, BOX } from './montagem.js';

const uvNota = (page, texto) => [
  BOX('Faixa do aviso de luz negra', { x: 0, y: 0, w: page.width, h: 72 }, { fill: '#2a1760', opacity: 0.92 }),
  T('Aviso de luz negra', 'EXAMINAR SOB LUZ NEGRA', { x: 100, y: 14, w: page.width - 200, h: 44 }, { family: 'Courier Prime', size: 30, bold: true, color: '#e6dcff', style: 'clean', wear: 0, align: 'center' }),
  T('Mensagem sob luz negra', texto, { x: 130, y: page.height - 360, w: page.width - 260, h: 220 }, { family: 'La Belle Aurore', size: 52, color: '#c8ffd4', style: 'handwriting', wear: 0.1, light: 'uv', lh: 1.3, rot: -1.5 }),
];

export const VARIACOES = {
  'mandado': [{ suffix: 'ensanguentado', label: 'ensanguentado', preset: 'ensanguentado', seed: 401 }],
  'carta-envelhecida': [{ suffix: 'ensanguentado', label: 'ensanguentada', preset: 'ensanguentado', seed: 402 }, { suffix: 'queimado', label: 'queimada', preset: 'queimado', seed: 403 }],
  'bilhete-caderno-rasgado': [{ suffix: 'ensanguentado', label: 'ensanguentado', preset: 'ensanguentado', seed: 404 }, { suffix: 'molhado', label: 'molhado', preset: 'molhado', seed: 405 }],
  'diario-aberto-dupla': [{ suffix: 'ensanguentado', label: 'ensanguentado', preset: 'ensanguentado', seed: 406 }, { suffix: 'molhado', label: 'molhado', preset: 'molhado', seed: 407 }],
  'ficha-criminal': [{ suffix: 'ensanguentado', label: 'ensanguentada', preset: 'ensanguentado', seed: 408 }],
  'relatorio-policial': [{ suffix: 'ensanguentado', label: 'ensanguentado', preset: 'ensanguentado', seed: 409 }, { suffix: 'uv', label: 'luz negra', preset: null, seed: 410, extra: p => uvNota(p, 'O vigia não está sozinho.\nHá mais um nome na lista: o seu.') }],
  'laudo-pericial': [{ suffix: 'ensanguentado', label: 'ensanguentado', preset: 'ensanguentado', seed: 411 }],
  'laudo-necropsia': [{ suffix: 'uv', label: 'luz negra', preset: null, seed: 412, extra: p => uvNota(p, 'A marca no pescoço brilha.\nNão é de corda: é de mão.') }],
  'ficha-cobaia': [{ suffix: 'uv', label: 'luz negra', preset: null, seed: 413, extra: p => uvNota(p, 'H-0417 não é um rato.\nNunca foi.') }],
  'pagina-grimorio': [{ suffix: 'queimado', label: 'queimada', preset: 'queimado', seed: 414 }],
  'mapa-rasgado': [{ suffix: 'queimado', label: 'queimado', preset: 'queimado', seed: 415 }],
  'certidao-obito': [{ suffix: 'arquivo-morto', label: 'arquivo morto', preset: 'arquivo-morto', seed: 416 }],
  'certidao-nascimento': [{ suffix: 'arquivo-morto', label: 'arquivo morto', preset: 'arquivo-morto', seed: 417 }],
  'certidao-casamento': [{ suffix: 'arquivo-morto', label: 'arquivo morto', preset: 'arquivo-morto', seed: 418 }],
  'dossie-agente': [{ suffix: 'arquivo-morto', label: 'arquivo morto', preset: 'arquivo-morto', seed: 419 }],
  'testamento': [{ suffix: 'queimado', label: 'queimado', preset: 'queimado', seed: 427 }],
  'recorte-jornal-anos-20': [{ suffix: 'queimado', label: 'queimado', preset: 'queimado', seed: 421 }],
  'termo-depoimento': [{ suffix: 'ensanguentado', label: 'ensanguentado', preset: 'ensanguentado', seed: 422 }],
  'diario-culto-uv': [{ suffix: 'molhado', label: 'molhado', preset: 'molhado', seed: 423 }],
  'prontuario': [{ suffix: 'arquivo-morto', label: 'arquivo morto', preset: 'arquivo-morto', seed: 424 }],
  'caderno-espiral-pagina': [{ suffix: 'molhado', label: 'molhado', preset: 'molhado', seed: 425 }],
};

export function expandir(specs) {
  const out = [];
  for (const base of specs) {
    for (const v of VARIACOES[base.slug] || []) {
      const meta = base.meta || { era: META[base.slug].era, tom: META[base.slug].tom, tags: META[base.slug].tags, org: META[base.slug].org };
      const page = base.page;
      const pilha = v.preset ? aging(v.preset, { seed: v.seed, page: { width: page.width, height: page.height } }) : [];
      out.push({
        ...base, slug: `${base.slug}-${v.suffix}`, name: `${base.name} · ${v.label}`, family: base.slug,
        meta: { ...meta, addedIn: '2026-10-27', tags: [...(meta.tags || []), v.suffix === 'uv' ? 'luz negra' : v.label] },
        layers: [...base.layers, ...pilha, ...(v.extra ? v.extra(page) : [])],
        fields: base.fields, variants: undefined, backTemplate: undefined,
      });
    }
  }
  return out;
}
