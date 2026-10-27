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
export const TEMPLATES = reformarTodos(ORIGINAIS);
