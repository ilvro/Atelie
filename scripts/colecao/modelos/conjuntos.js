/**
 * Conjuntos (C12): de 4 a 6 modelos da mesma instituição, com nomes, datas e rostos que combinam entre si.
 * Entram no manifesto como `kind: 'set'`, com `templates: [ids]`; a gaveta Modelos trata o conjunto como um
 * card próprio e "Usar conjunto" abre cada modelo numa aba.
 */
export const CONJUNTOS = [
  {
    slug: 'caso-sanatorio-serra-do-mar', name: 'Caso do Sanatório da Serra do Mar', org: 'sanatorio', era: '1920', tom: 'horror',
    descricao: 'A internação de Helena Marques de Alencar: triagem, ficha de internação, prontuário, um desenho e a certidão de óbito.',
    tags: ['conjunto', 'sanatório', 'internação', 'Helena'],
    modelos: ['ficha-triagem-sanatorio', 'internacao-sanatorio', 'prontuario', 'desenho-paciente', 'certidao-obito'],
  },
  {
    slug: 'arquivos-instituto-halden', name: 'Arquivos do Instituto Halden', org: 'halden', era: '1980', tom: 'sci-fi',
    descricao: 'Os experimentos do subsolo do Instituto Halden: relatório, cobaia, planta, memorando, caderno com segredo UV e o sismógrafo.',
    tags: ['conjunto', 'ciência', 'Halden', 'subsolo'],
    modelos: ['relatorio-experimento', 'ficha-cobaia', 'planta-laboratorio', 'memorando-interno', 'caderno-pesquisa-uv', 'grafico-sismografo'],
  },
  {
    slug: 'dossie-lua-triplice', name: 'Dossiê da Lua Tríplice', org: 'irmandade', era: '1980', tom: 'horror',
    descricao: 'O culto da Lua Tríplice visto por dentro e por fora: panfleto, diário, ordem de missão, relatório redigido e uma invocação sob luz negra.',
    tags: ['conjunto', 'culto', 'Lua Tríplice', 'ocultismo'],
    modelos: ['panfleto-culto', 'diario-culto-uv', 'ordem-missao-ultrassecreta', 'relatorio-redigido', 'invocacao-uv'],
  },
  {
    slug: 'caso-solar-dos-pinhais', name: 'Caso do Solar dos Pinhais', org: 'delegacia', era: '1950', tom: 'investigação',
    descricao: 'A investigação do porão do Solar: depoimento, apreensão, laudo, cadeia de custódia, desaparecimento e o quadro do caso.',
    tags: ['conjunto', 'polícia', 'Solar dos Pinhais', 'investigação'],
    modelos: ['termo-depoimento', 'auto-apreensao', 'laudo-pericial', 'cadeia-custodia', 'ficha-desaparecido', 'quadro-investigacao'],
  },
];
