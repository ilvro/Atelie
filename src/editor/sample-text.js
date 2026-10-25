/**
 * Plausible sample text in Portuguese for filling handout template fields.
 * Covers names, dates (1890-2020), locations, titles, and descriptive letter/report paragraphs.
 */

const SAMPLE_NAMES = [
  'Arthur Pendelton',
  'Dr. Alistair Finch',
  'Helena Soares',
  'Inspetor Silva',
  'Augusto Silveira',
  'Beatriz Alencar',
  'Capitão Thomas Vargas',
  'Clara Monteiro',
  'Padre Vicente de Carvalho',
  'Prof. Harold Vance',
  'Eduardo Fontes',
  'Dra. Margarida Lins',
];

const SAMPLE_DATES = [
  '14 de Outubro de 1924',
  '03/11/1932',
  '27 de Março de 1945',
  '12 de Janeiro de 1898',
  '19 de Agosto de 1912',
  '05/09/1954',
  '22 de Julho de 1973',
  '18/11/2001',
  '31 de Dezembro de 1929',
  '08 de Junho de 1968',
];

const SAMPLE_ADDRESSES = [
  'Rua das Flores, 42 — São Paulo',
  'Beco do Rato, Galpão 7',
  'Arkham Sanatorium, Ala Oeste',
  'Avenida Central, nº 108 — Sala 4B',
  'Estrada Velha de Santos, Km 18',
  'Cais do Porto, Armazém 3',
  'Largo da Misericórdia, 15',
  'Vila Mariana, Travessa dos Pássaros, 9',
];

const SAMPLE_TITLES = [
  'Relatório Confidencial nº 104',
  'Declaração Oficial de Testemunha',
  'Registro Pericial de Ocorrência',
  'Autópsia nº 89/1928',
  'Ordem de Busca e Apreensão',
  'Inventário de Bens Encontrados',
  'Certidão Notarial de Registro',
  'Despacho Geral de Evidências',
];

const SAMPLE_PARAGRAPHS = [
  'Querida Lia, não procure por mim. O que descobri no porão do sanatório não deve ser revelado a ninguém. Queime esta carta assim que terminar de ler.',
  'Conforme solicitado pelo departamento, realizamos a vistoria no local às 23:45. Os vestígios encontrados indicam atividade recente e perturbação da ordem. Recomendo isolamento imediato da área.',
  'O paciente apresenta episódios recorrentes de delírio e insônia severa desde a expedição ao vale. Relata ouvir sussurros vindos do piso inferior durante o repouso noturno.',
  'Certifico para os devidos fins que o material recolhido permanece sob custódia rigorosa no cofre central, aguardando deliberação da comissão especial designada.',
  'Em decorrência dos eventos presenciados na noite anterior, todos os registros anteriores ficam revogados e classificados sob sigilo nível quatro.',
];

/**
 * Returns a plausible sample text in Portuguese based on the field label and current value.
 */
export function getSampleText(fieldLabel = '', currentContent = '') {
  const label = (fieldLabel || '').toLowerCase();

  let pool = SAMPLE_PARAGRAPHS;

  if (
    label.includes('nome') ||
    label.includes('paciente') ||
    label.includes('autor') ||
    label.includes('vítima') ||
    label.includes('vitima') ||
    label.includes('testemunha') ||
    label.includes('agente') ||
    label.includes('investigador') ||
    label.includes('pessoa') ||
    label.includes('destinatário') ||
    label.includes('destinatario')
  ) {
    pool = SAMPLE_NAMES;
  } else if (
    label.includes('data') ||
    label.includes('quando') ||
    label.includes('período') ||
    label.includes('periodo') ||
    label.includes('dia') ||
    label.includes('nascimento') ||
    label.includes('ano')
  ) {
    pool = SAMPLE_DATES;
  } else if (
    label.includes('local') ||
    label.includes('endereço') ||
    label.includes('endereco') ||
    label.includes('cidade') ||
    label.includes('lugar') ||
    label.includes('sala') ||
    label.includes('armazém') ||
    label.includes('armazem')
  ) {
    pool = SAMPLE_ADDRESSES;
  } else if (
    label.includes('título') ||
    label.includes('titulo') ||
    label.includes('assunto') ||
    label.includes('caso') ||
    label.includes('código') ||
    label.includes('codigo') ||
    label.includes('nº') ||
    label.includes('número') ||
    label.includes('numero')
  ) {
    pool = SAMPLE_TITLES;
  }

  // Find an entry different from current content
  const filtered = pool.filter(item => item !== currentContent);
  if (filtered.length > 0) {
    const idx = Math.floor(Math.random() * filtered.length);
    return filtered[idx];
  }
  return pool[0];
}

