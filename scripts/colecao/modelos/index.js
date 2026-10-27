/**
 * Todos os modelos da coleção da casa, por categoria, na ordem da galeria.
 * Cada arquivo exporta um array de especificações; o pipeline está em ../templates.js.
 */
import cartasEBilhetes from './cartas-e-bilhetes.js';
import jornal from './jornal.js';
import policiaEInvestigacao from './policia-e-investigacao.js';
import medico from './medico.js';
import ocultismo from './ocultismo.js';
import fantasia from './fantasia.js';
import cotidiano from './cotidiano.js';
import tecnologia from './tecnologia.js';

export const CATEGORIES = [
  { slug: 'cartas-e-bilhetes', name: 'Cartas e bilhetes' },
  { slug: 'jornal', name: 'Jornal' },
  { slug: 'policia-e-investigacao', name: 'Polícia e investigação' },
  { slug: 'medico', name: 'Médico' },
  { slug: 'ocultismo', name: 'Ocultismo' },
  { slug: 'fantasia', name: 'Fantasia' },
  { slug: 'cotidiano', name: 'Cotidiano' },
  { slug: 'tecnologia', name: 'Tecnologia' },
  { slug: 'forense-e-pericia', name: 'Forense e perícia' },
  { slug: 'oficial-e-juridico', name: 'Oficial e jurídico' },
  { slug: 'militar-e-governo', name: 'Militar e governo' },
  { slug: 'cadernos-diarios-e-livros', name: 'Cadernos, diários e livros' },
  { slug: 'escola-e-juventude', name: 'Escola e juventude' },
  { slug: 'ciencia-e-laboratorio', name: 'Ciência e laboratório' },
  { slug: 'fotografias-e-objetos', name: 'Fotografias e objetos' },
  { slug: 'destruidos-e-composicoes', name: 'Destruídos e composições' },
];

export const TEMPLATES_BY_CATEGORY = {
  'Cartas e bilhetes': cartasEBilhetes,
  'Jornal': jornal,
  'Polícia e investigação': policiaEInvestigacao,
  'Médico': medico,
  'Ocultismo': ocultismo,
  'Fantasia': fantasia,
  'Cotidiano': cotidiano,
  'Tecnologia': tecnologia,
};

import { reformarTodos } from './reforma.js';
import loteC8 from './lote-c8.js';
import loteC9 from './lote-c9.js';
import loteC10 from './lote-c10.js';
import loteC11 from './lote-c11.js';
import { expandir } from './variacoes.js';

const ORIGINAIS = [
  ...cartasEBilhetes,
  ...jornal,
  ...policiaEInvestigacao,
  ...medico,
  ...ocultismo,
  ...fantasia,
  ...cotidiano,
  ...tecnologia,
];

/** Os modelos publicados: as especificações por categoria, reformadas pela C7 (ver reforma.js). */
const BASES = [...reformarTodos(ORIGINAIS), ...loteC8, ...loteC9, ...loteC10, ...loteC11];
export const TEMPLATES = [...BASES, ...expandir(BASES)];
