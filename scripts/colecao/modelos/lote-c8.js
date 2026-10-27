/**
 * Lote C8 · Investigação e Estado (25 modelos novos): polícia e investigação, forense e perícia,
 * oficial e jurídico, militar e governo. Montados com ./montagem.js sobre o universo (instituições e elenco).
 */
import { A4, T, IMG, FOTO, RULE, BOX, base, formulario, carta, tabela, modelo } from './montagem.js';
import { initials, tape, clip, barcode } from '../kit.js';

const RET = { bigode: 'casa-foto-retrato-homem-bigode-oculos', rapaz: 'casa-foto-retrato-rapaz-cdv', senhora: 'casa-foto-retrato-senhora-capa', hussardo: 'casa-foto-retrato-jovem-hussardo', oficial: 'casa-foto-retrato-oficial-sabre', mulher: 'casa-foto-retrato-mulher-sanfona' };
const EMB = org => `casa-emblema-universo-${org}`;
const CAR = 'Polícia e investigação';

/** Silhueta de corpo (frente ou costas) só com traço, para marcar ferimentos. */
function corpo(x, y, k, nome) {
  const s = (name, box, o = {}) => BOX(`${nome} · ${name}`, { x: x + box[0] * k, y: y + box[1] * k, w: box[2] * k, h: box[3] * k }, { stroke: '#333333', weight: 2.2, fill: '#00000008', ...o });
  return [
    s('cabeça', [70, 0, 60, 74], { type: 'ellipse', radius: 0 }),
    s('tronco', [48, 82, 104, 150], { radius: 26 }),
    s('braço esquerdo', [6, 88, 34, 150], { radius: 16, rot: 4 }),
    s('braço direito', [160, 88, 34, 150], { radius: 16, rot: -4 }),
    s('perna esquerda', [52, 238, 46, 190], { radius: 18 }),
    s('perna direita', [102, 238, 46, 190], { radius: 18 }),
  ];
}

const cena = (slug, name, o) => modelo({ slug, name, ...o });

export default [
  // ---------------------------------------------------------------- Polícia e investigação
  cena('termo-depoimento', 'Termo de depoimento', {
    category: CAR, era: '1950', tom: 'investigação', org: 'delegacia', tags: ['polícia', 'depoimento', 'formulário'],
    layers: [
      ...formulario({
        org: 'delegacia', emblem: EMB('delegacia'), paper: 'papel-maquina', seed: 101, aging: 'usado',
        title: ['DELEGACIA DE INVESTIGAÇÕES ESPECIAIS', 'CARTÓRIO DO 1º DISTRITO'], titleSize: 26, formTitle: 'TERMO DE DEPOIMENTO',
        rows: [['Depoente', 'Joaquim Pereira Dutra, 52 anos, vigia noturno'], ['Data', '03 de abril de 1954'], ['Escrivão', 'Marta Quintanilha'], ['Local', 'Sala de oitivas da Delegacia, Praça Velha, 120', { col: 2 }]],
        sections: [{ h: 'Depoimento', field: 'Depoimento', size: 22, text: 'Aos três dias do mês de abril de mil novecentos e cinquenta e quatro, perante a autoridade policial, compareceu o depoente acima qualificado, que, devidamente compromissado, declarou o seguinte: que trabalha como vigia no Solar dos Pinhais há onze anos; que na noite de 14 de março, por volta das vinte e três horas, ouviu passos no porão, embora a porta estivesse trancada por dentro; que desceu com a lanterna e encontrou a chave sobre a mesa, o que o depoente não soube explicar; que sentiu um cheiro de terra úmida e de vela queimada; que não viu ninguém, mas que a lanterna se apagou duas vezes; que não tocou em coisa alguma e subiu para chamar o patrão. Nada mais disse nem lhe foi perguntado. Lido e achado conforme, vai assinado.' }],
        signatures: [{ nome: 'Joaquim P. Dutra', cargo: 'Depoente' }, { nome: 'Marta Quintanilha', cargo: 'Escrivã' }], signY: 1450,
        stamps: [{ id: 'casa-carimbo-br-recebido-em', x: 870, y: 1180, size: 250, h: 190, rot: 5, opacity: 0.8 }],
        extras: [350, 700, 1050, 1400].map((yy, i) => ({ ...initials('Joaquim Pereira Dutra', { x: 1130, y: yy, size: 28 }), name: `Rubrica ${i + 1}` })),
      }),
    ],
  }),
  cena('auto-apreensao', 'Auto de apreensão', {
    category: CAR, era: '1970', tom: 'investigação', org: 'delegacia', tags: ['polícia', 'apreensão', 'formulário'],
    layers: (() => {
      const t = { y: 640, size: 22, columns: [{ h: 'Nº', w: 90, key: 'n' }, { h: 'Descrição do item', w: 560, key: 'd' }, { h: 'Qtd.', w: 100, key: 'q', align: 'center' }, { h: 'Estado', w: 260, key: 'e' }], rows: [
        { n: '01', d: 'Caderno de capa preta, 48 folhas, com anotações', q: '1', e: 'Regular' }, { n: '02', d: 'Chave de ferro, cabo em argola, etiqueta "Porão"', q: '1', e: 'Bom' },
        { n: '03', d: 'Fotografias em preto e branco, 12 por 9 cm', q: '6', e: 'Amareladas' }, { n: '04', d: 'Vela de sebo, parcialmente consumida', q: '3', e: 'Usada' }, { n: '05', d: 'Envelope pardo lacrado, sem remetente', q: '1', e: 'Lacre intacto' }] };
      return [
        ...formulario({ org: 'delegacia', emblem: EMB('delegacia'), paper: 'oficio-creme', seed: 102, aging: 'usado', title: ['DELEGACIA DE INVESTIGAÇÕES ESPECIAIS', 'SEÇÃO DE DILIGÊNCIAS'], titleSize: 26, formTitle: 'AUTO DE APREENSÃO',
          rows: [['Número', 'AA-0417/72'], ['Data', '09 de agosto de 1972'], ['Local', 'Solar dos Pinhais, porão, Vila Aurora', { col: 2 }], ['Autoridade', 'Inspetor Heitor Barroso', { col: 2 }]],
          sections: [], signatures: [{ nome: 'Heitor Barroso', cargo: 'Inspetor' }, { nome: 'Álvaro Teixeira', cargo: 'Testemunha 1' }, { nome: 'Dalva Nunes', cargo: 'Testemunha 2', field: 'Testemunhas' }], signY: 1430,
          stamps: [{ id: 'casa-carimbo-br-protocolo', x: 820, y: 1150, size: 280, h: 190, rot: -5 }], extras: tabela({ ...t, font: 'Courier Prime', ink: '#1d1b24' }) }),
      ];
    })(),
  }),
  cena('ficha-desaparecido', 'Ficha de pessoa desaparecida', {
    category: CAR, era: '1990', tom: 'investigação', org: 'delegacia', tags: ['polícia', 'desaparecido', 'cartaz'],
    layers: [
      ...base({ paper: 'papel-maquina', age: 'usado', aging: 'usado', seed: 103, intensity: 0.8 }),
      T('Título', 'DESAPARECIDA', { x: 110, y: 110, w: 1020, h: 130 }, { family: 'Anton', size: 94, bold: false, align: 'center', color: '#a3182b', style: 'clean', wear: 0.1 }),
      T('Subtítulo', 'AJUDE A ENCONTRAR', { x: 110, y: 250, w: 1020, h: 44 }, { family: 'Oswald', size: 34, align: 'center', color: '#1d1b24', style: 'clean', wear: 0 }),
      ...[FOTO('Foto', RET.mulher, { x: 330, y: 340, w: 580, h: 640 }, { field: 'Foto', rot: -1.5 }), tape('topo-esquerda', { x: 330, y: 340, width: 580, height: 640 }), tape('topo-direita', { x: 330, y: 340, width: 580, height: 640 })],
      T('Nome', 'HELENA MARQUES DE ALENCAR', { x: 110, y: 1010, w: 1020, h: 70 }, { family: 'Oswald', size: 56, align: 'center', color: '#1d1b24', style: 'clean', wear: 0, field: 'Nome' }),
      T('Idade e traços', '24 anos · 1,62 m · cabelos castanhos · olhos verdes\nCicatriz pequena no queixo. Usava casaco verde e brincos de pérola.', { x: 130, y: 1100, w: 980, h: 110 }, { family: 'Courier Prime', size: 26, align: 'center', color: '#1d1b24', field: 'Idade' }),
      T('Visto por último', 'Vista pela última vez em 14 de março, às 22h, na saída do Teatro Municipal de Vila Aurora.', { x: 130, y: 1230, w: 980, h: 100 }, { family: 'Courier Prime', size: 26, bold: true, align: 'center', color: '#1d1b24', field: 'Visto por último' }),
      T('Contato', 'Quem tiver informações: Delegacia de Investigações Especiais\n(011) 3250-4471 · não é preciso se identificar', { x: 130, y: 1370, w: 980, h: 90 }, { family: 'Courier Prime', size: 24, align: 'center', color: '#1d1b24', style: 'clean', wear: 0.05 }),
      ...Array.from({ length: 9 }, (_, i) => T(`Tira ${i + 1}`, '(011) 3250-4471', { x: 110 + i * 112, y: 1530, w: 108, h: 150 }, { family: 'Courier Prime', size: 18, rot: 0, color: '#1d1b24', style: 'clean', wear: 0.05, align: 'center' })).map((l, i) => ({ ...l, text: { ...l.text, content: '(011)\n3250-\n4471' } })),
      ...Array.from({ length: 8 }, (_, i) => RULE(110 + (i + 1) * 112 - 2, 1530, 0, { weight: 1.4, color: '#555555', name: `Corte da tira ${i + 1}` })).map(l => ({ ...l, height: 150, shape: { type: 'line', stroke: '#555555', strokeWidth: 1.4, dash: [6, 5] }, width: 0 })),
    ],
  }),
  cena('relatorio-vigilancia', 'Relatório de vigilância', {
    category: CAR, era: '1980', tom: 'investigação', org: 'delegacia', tags: ['polícia', 'vigilância', 'formulário'],
    layers: (() => {
      const t = { y: 560, size: 22, columns: [{ h: 'Hora', w: 130, key: 'h' }, { h: 'Local', w: 360, key: 'l' }, { h: 'Registro', w: 530, key: 'r' }], rows: [
        { h: '21:05', l: 'Rua das Acácias, 88', r: 'Alvo sai de casa com maleta escura' }, { h: '21:22', l: 'Ponto de ônibus, linha 4', r: 'Aguarda 10 min; olha o relógio' }, { h: '21:48', l: 'Armazém da Rua do Porto', r: 'Entra pela porta lateral' },
        { h: '22:31', l: 'Armazém da Rua do Porto', r: 'Duas pessoas chegam de carro' }, { h: '23:10', l: 'Armazém da Rua do Porto', r: 'Luz do segundo andar apaga' }] };
      return [
        ...formulario({ org: 'delegacia', emblem: EMB('delegacia'), paper: 'papel-de-fax', age: 'usado', seed: 104, aging: 'usado', title: ['DIE · SEÇÃO DE VIGILÂNCIA', 'RELATÓRIO RESERVADO'], titleSize: 26,
          rows: [['Agente', 'Cássio Prado, matrícula 2218'], ['Alvo', 'Sr. R. T. M. (codinome "Maleta")'], ['Período', '12 e 13 de junho de 1984', { col: 2 }]], sections: [{ h: 'Fotos', text: 'Registro fotográfico em anexo. Teleobjetiva 300 mm, filme de alta sensibilidade (granulação visível).', field: 'Fotos', size: 21 }].slice(0, 0), signatures: [{ nome: 'Cássio Prado', cargo: 'Agente' }], signY: 1500,
          extras: [...tabela({ ...t, ink: '#1d1b24' }),
            FOTO('Foto 1', RET.bigode, { x: 110, y: 1040, w: 420, h: 320 }, { field: 'Fotos', filter: { grayscale: 1, contrast: 0.25, brightness: -0.05 }, rot: -1 }),
            FOTO('Foto 2', 'casa-foto-lugar-fabrica-obra', { x: 570, y: 1040, w: 560, h: 320 }, { filter: { grayscale: 1, contrast: 0.3 }, rot: 0.8 }),
            T('Legenda das fotos', '13/06 · 21h05 — saída da residência          13/06 · 22h31 — chegada ao armazém', { x: 110, y: 1370, w: 1020, h: 50 }, { family: 'Courier Prime', size: 18, color: '#444444', style: 'clean', wear: 0 }),
            T('Anotação à mão', 'conferir placa do carro!\nmesmo homem da foto de 82?', { x: 800, y: 1440, w: 340, h: 90 }, { family: 'Caveat', size: 34, color: '#1c2a5a', style: 'handwriting', wear: 0.2, rot: -3 })] }),
      ];
    })(),
  }),
  cena('quadro-investigacao', 'Quadro de investigação', {
    category: CAR, page: { width: 1600, height: 1100 }, background: '#6a4423', era: 'hoje', tom: 'investigação', tags: ['investigação', 'composição', 'quadro'],
    layers: [
      IMG('Cortiça', 'casa-superficie-cork002', { x: 0, y: 0, w: 1600, h: 1100 }),
      IMG('Moldura de madeira', 'casa-superficie-wood060', { x: 0, y: 0, w: 1600, h: 40 }), IMG('Moldura inferior', 'casa-superficie-wood060', { x: 0, y: 1060, w: 1600, h: 40 }),
      T('Título do caso', 'CASO SOLAR DOS PINHAIS', { x: 440, y: 60, w: 720, h: 70 }, { family: 'Permanent Marker', size: 50, color: '#1d1b24', style: 'clean', wear: 0, align: 'center', field: 'Título do caso', rot: -1.2 }),
      ...[[RET.bigode, 120, 220, -4], [RET.oficial, 520, 200, 3], [RET.mulher, 940, 230, -2], [RET.senhora, 1290, 210, 4]].flatMap(([id, x, y, r], i) => [
        IMG(`Moldura da foto ${i + 1}`, 'casa-moldura-foto-antiga-serrilhada', { x, y, w: 250, h: 320 }, { rot: r }),
        FOTO(`Foto ${i + 1}`, id, { x: x + 18, y: y + 18, w: 214, h: 250 }, { rot: r, field: i === 0 ? 'Fotos' : undefined }),
        IMG(`Alfinete ${i + 1}`, ['casa-investigacao-alfinete-vermelho', 'casa-investigacao-alfinete-azul', 'casa-investigacao-alfinete-amarelo', 'casa-investigacao-alfinete-verde'][i], { x: x + 100, y: y - 20, w: 70, h: 90 }),
      ]),
      IMG('Barbante 1', 'casa-investigacao-barbante-curvo', { x: 220, y: 270, w: 480, h: 170 }, { rot: 8 }), IMG('Barbante 2', 'casa-investigacao-barbante-reto', { x: 640, y: 340, w: 480, h: 80 }, { rot: -4 }),
      IMG('Barbante 3', 'casa-investigacao-barbante-frouxo', { x: 1040, y: 330, w: 480, h: 150 }, { rot: 5 }),
      ...[['casa-investigacao-postit-amarelo', 130, 640, -3, 'quem tinha a\nchave do porão?'], ['casa-investigacao-postit-rosa', 560, 700, 2, 'vigia mente?\nlanterna apagou 2x'], ['casa-investigacao-postit-azul', 1000, 650, -2, 'ligar p/ o IML\nsegunda cedo']].flatMap(([id, x, y, r, txt], i) => [
        IMG(`Post-it ${i + 1}`, id, { x, y, w: 300, h: 300 }, { rot: r }),
        T(`Nota ${i + 1}`, txt, { x: x + 36, y: y + 70, w: 230, h: 150 }, { family: 'Caveat', size: 34, color: '#1c2a5a', style: 'handwriting', wear: 0.2, rot: r, field: i === 0 ? 'Notas' : undefined }),
      ]),
      IMG('Recorte de jornal', 'casa-papel-papel-jornal-antigo', { x: 1290, y: 700, w: 250, h: 330 }, { rot: 5 }),
      T('Manchete do recorte', 'VIGIA DIZ TER OUVIDO PASSOS NO PORÃO', { x: 1305, y: 730, w: 220, h: 200 }, { family: 'Playfair Display', size: 24, bold: true, color: '#1d1b24', style: 'clean', wear: 0.1, rot: 5 }),
      IMG('Etiqueta numerada', 'casa-investigacao-etiqueta-numerada-2', { x: 860, y: 770, w: 130, h: 180 }, { rot: -6 }),
      { kind: 'effect', name: 'Sombra do quadro', blend: 'multiply', opacity: 0.35, effect: { type: 'damp', seed: 105, amount: 0.5, params: { color: '#3a2512' } } },
      { kind: 'effect', name: 'Grão da cortiça', blend: 'soft-light', opacity: 0.3, effect: { type: 'grain', seed: 106, amount: 0.5, params: { size: 1.5 } } },
    ],
  }),
  // ---------------------------------------------------------------- Forense e perícia
  cena('laudo-necropsia', 'Laudo de necropsia', {
    category: 'Forense e perícia', era: '1960', tom: 'investigação', org: 'iml', tags: ['perícia', 'necropsia', 'formulário'],
    layers: [
      ...formulario({ org: 'iml', emblem: EMB('iml'), paper: 'oficio-branco', seed: 111, aging: 'usado', title: ['INSTITUTO MÉDICO LEGAL DO ESTADO', 'SERVIÇO DE NECROPSIA'], titleSize: 26, formTitle: 'LAUDO DE EXAME NECROSCÓPICO',
        rows: [['Número', 'NEC-1.386/63'], ['Data do exame', '22 de setembro de 1963'], ['Vítima', 'Homem, cerca de 40 anos, não identificado', { col: 2 }]],
        sections: [{ h: 'Achados', field: 'Achados', size: 21, text: 'Cadáver em decúbito dorsal, rigidez cadavérica generalizada. Equimose circular de 3 cm na região cervical anterior. Ausência de lesões perfurantes. Pulmões congestos e edemaciados; coração sem alterações macroscópicas. Estômago contendo líquido escuro e fragmentos vegetais não identificados.' }, { h: 'Causa da morte', field: 'Causa', size: 22, text: 'Asfixia mecânica, a esclarecer quanto ao instrumento. Remessa de vísceras para exame toxicológico.' }],
        signatures: [{ nome: 'Dr. Gaspar Lemos', cargo: 'Médico-legista' }], signY: 1560, stamps: [{ id: 'casa-carimbo-br-autenticado', x: 880, y: 1460, size: 230, rot: 8, opacity: 0.8 }],
        extras: [...corpo(130, 1050, 1.0, 'Frente'), ...corpo(520, 1050, 1.0, 'Costas'),
          T('Legenda do diagrama', 'FRENTE                       COSTAS', { x: 130, y: 1500, w: 700, h: 30 }, { size: 17, color: '#444444', style: 'clean', wear: 0, family: 'Courier Prime' }),
          T('Marca no pescoço', '✕', { x: 195, y: 1118, w: 60, h: 60 }, { family: 'Caveat', size: 56, color: '#a3182b', style: 'clean', wear: 0 }),
          T('Marca no pulso', '✕', { x: 150, y: 1260, w: 60, h: 60 }, { family: 'Caveat', size: 50, color: '#a3182b', style: 'clean', wear: 0 })] }),
    ],
  }),
  cena('cadeia-custodia', 'Cadeia de custódia', {
    category: 'Forense e perícia', era: '1990', tom: 'investigação', org: 'iml', tags: ['perícia', 'evidência', 'formulário'],
    layers: (() => {
      const t = { y: 560, size: 21, columns: [{ h: 'Data', w: 150, key: 'd' }, { h: 'De', w: 270, key: 'a' }, { h: 'Para', w: 270, key: 'b' }, { h: 'Assinatura', w: 330, key: 's' }], rows: [
        { d: '14/03/91', a: 'Perito Gaspar Lemos', b: 'Almoxarifado IML', s: '____________' }, { d: '15/03/91', a: 'Almoxarifado IML', b: 'Lab. Toxicologia', s: '____________' }, { d: '02/04/91', a: 'Lab. Toxicologia', b: 'Almoxarifado IML', s: '____________' }, { d: '09/04/91', a: 'Almoxarifado IML', b: 'Fórum Criminal', s: '____________' }] };
      return [...formulario({ org: 'iml', emblem: EMB('iml'), paper: 'formulario-continuo', age: 'usado', seed: 112, aging: 'usado', title: ['INSTITUTO MÉDICO LEGAL', 'CADEIA DE CUSTÓDIA DE VESTÍGIOS'], titleSize: 26, margin: 150,
        rows: [['Item', 'Frasco de vidro âmbar, 100 ml'], ['Número', 'EV-1991-0388'], ['Origem', 'Porão do Solar dos Pinhais, bancada de madeira', { col: 2 }]], signatures: [], extras: [...tabela({ ...t, margin: 150, ink: '#1d1b24' }), barcode('1991038802', { x: 150, y: 1050, width: 360, height: 90 }), T('Observação', 'Frasco recebido lacrado. Lacre rompido em 15/03 para coleta de amostra; refeito com lacre nº 4417.', { x: 150, y: 1180, w: 940, h: 90 }, { size: 21, family: 'Courier Prime', color: '#1d1b24' })] })];
    })(),
  }),
  cena('etiqueta-corpo', 'Etiqueta de corpo', {
    category: 'Forense e perícia', page: { width: 900, height: 1300 }, background: '#c9b48a', era: '1970', tom: 'investigação', org: 'iml', tags: ['perícia', 'etiqueta', 'cartolina', 'formulário'],
    layers: [
      IMG('Mesa', 'casa-papel-kraft-usado', { x: 0, y: 0, w: 900, h: 1300 }),
      IMG('Etiqueta', 'casa-objeto-etiqueta-corpo', { x: 130, y: 80, w: 640, h: 1220 }, { rot: -2 }),
      T('Instituição', 'I.M.L.\nNECROTÉRIO', { x: 290, y: 400, w: 330, h: 90 }, { family: 'Courier Prime', size: 30, bold: true, align: 'center', color: '#1d1b24', rot: -2 }),
      T('Nome', 'Nome: desconhecido (homem, adulto)', { x: 270, y: 560, w: 380, h: 100 }, { family: 'Caveat', size: 38, color: '#1c2a5a', style: 'handwriting', wear: 0.2, rot: -2, field: 'Nome' }),
      T('Data', 'Entrada: 22/09/1973, 06h40', { x: 270, y: 700, w: 400, h: 80 }, { family: 'Caveat', size: 38, color: '#1c2a5a', style: 'handwriting', wear: 0.2, rot: -2, field: 'Data' }),
      T('Número', 'Nº 386', { x: 270, y: 800, w: 380, h: 120 }, { family: 'Permanent Marker', size: 78, color: '#8a1414', style: 'clean', wear: 0, rot: -2, field: 'Número' }),
      T('Gaveta', 'Gaveta 7-B', { x: 270, y: 960, w: 380, h: 60 }, { family: 'Caveat', size: 38, color: '#1c2a5a', style: 'handwriting', wear: 0.2, rot: -2, field: 'Gaveta' }),
    ],
  }),
  cena('laudo-balistica', 'Laudo de balística', {
    category: 'Forense e perícia', era: '1980', tom: 'investigação', org: 'iml', tags: ['perícia', 'balística', 'formulário'],
    layers: [
      ...formulario({ org: 'iml', emblem: EMB('iml'), paper: 'papel-maquina', seed: 113, aging: 'usado', title: ['INSTITUTO MÉDICO LEGAL', 'SEÇÃO DE BALÍSTICA FORENSE'], titleSize: 26, formTitle: 'LAUDO DE EXAME DE ARMA E PROJÉTIL',
        rows: [['Arma', 'Revólver Taurus, 6 tiros, nº de série raspado'], ['Calibre', '.38 Special'], ['Material', 'Um projétil deformado e um estojo', { col: 2 }]],
        sections: [{ h: 'Conclusão', field: 'Conclusão', size: 22, text: 'O projétil recolhido na parede do corredor foi disparado pela arma examinada, conforme comparação das microestrias no microscópio de comparação. O estojo, porém, apresenta marcas de percussão incompatíveis, o que indica outra arma. Sugere-se nova perícia no local.' }],
        signatures: [{ nome: 'Gaspar Lemos', cargo: 'Perito criminal' }], signY: 1580,
        extras: [BOX('Diagrama do projétil', { x: 150, y: 1140, w: 300, h: 70 }, { stroke: '#222', weight: 2.5, radius: 34, fill: '#b8895a30' }), BOX('Ponta do projétil', { x: 120, y: 1140, w: 100, h: 70 }, { stroke: '#222', weight: 2.5, type: 'ellipse', fill: '#b8895a40' }),
          RULE(150, 1235, 300, { color: '#222', name: 'Cota do comprimento' }), T('Cota', '38,1 mm', { x: 230, y: 1242, w: 150, h: 30 }, { size: 18, family: 'Courier Prime', style: 'clean', wear: 0, align: 'center' }),
          RULE(500, 1175, 0, { name: 'Eixo' }), T('Medida do diâmetro', 'Ø 9,0 mm   ·   massa 10,2 g   ·   6 raias, sentido à direita', { x: 500, y: 1150, w: 640, h: 70 }, { size: 21, family: 'Courier Prime' })] }),
    ],
  }),
  cena('analise-digitais', 'Análise de digitais', {
    category: 'Forense e perícia', era: '1950', tom: 'investigação', org: 'delegacia', tags: ['perícia', 'digitais', 'ficha', 'formulário'],
    layers: (() => {
      const dedos = ['Polegar D.', 'Indicador D.', 'Médio D.', 'Anelar D.', 'Mínimo D.', 'Polegar E.', 'Indicador E.', 'Médio E.', 'Anelar E.', 'Mínimo E.'];
      return [...formulario({ org: 'delegacia', emblem: EMB('delegacia'), paper: 'cartolina', age: 'usado', seed: 114, aging: 'usado', title: ['GABINETE DE IDENTIFICAÇÃO', 'SEÇÃO DATILOSCÓPICA'], titleSize: 26, formTitle: 'FICHA DATILOSCÓPICA',
        rows: [['Nome', 'Valentin Moraes, vulgo "Olho de Vidro"'], ['Classificação', 'V-3243 / I-3342'], ['Observações', 'Cicatriz transversal no polegar direito; digital do indicador esquerdo incompleta.', { col: 2 }]], signatures: [{ nome: 'Gaspar Lemos', cargo: 'Perito datiloscopista', field: 'Perito' }], signY: 1570,
        extras: dedos.flatMap((d, i) => {
          const x = 110 + (i % 5) * 204; const y = 880 + Math.floor(i / 5) * 320;
          return [BOX(`Quadro ${d}`, { x, y, w: 190, h: 270 }, { stroke: '#333', weight: 2 }), IMG(`Digital ${d}`, `casa-digitais-${(i % 4) + 1}`, { x: x + 15, y: y + 25, w: 160, h: 200 }, { blend: 'multiply', opacity: 0.9 }), T(`Rótulo ${d}`, d, { x, y: y + 232, w: 190, h: 30 }, { size: 17, family: 'Courier Prime', align: 'center', color: '#333', style: 'clean', wear: 0 })];
        }) })];
    })(),
  }),
  cena('relatorio-cena-crime', 'Relatório de cena de crime', {
    category: 'Forense e perícia', era: 'hoje', tom: 'investigação', org: 'delegacia', tags: ['perícia', 'cena do crime', 'planta', 'formulário'],
    layers: [
      ...formulario({ org: 'delegacia', emblem: EMB('delegacia'), paper: 'oficio-branco', age: 'novo', seed: 115, aging: 'novo', title: ['POLÍCIA CIVIL · PERÍCIA CRIMINAL', 'LEVANTAMENTO DE LOCAL DE CRIME'], titleSize: 26,
        rows: [['Local', 'Sala de estar, Solar dos Pinhais, Vila Aurora'], ['Data', '03/05/2023, 02h15'], ['Legenda', '1 Corpo · 2 Cápsula · 3 Vidro quebrado · 4 Pegadas', { col: 2 }]], signatures: [{ nome: 'Marcos Reis', cargo: 'Perito', field: 'Perito' }], signY: 1580,
        extras: [BOX('Planta · cômodo', { x: 130, y: 600, w: 700, h: 700 }, { stroke: '#222', weight: 6 }), BOX('Planta · quarto', { x: 830, y: 600, w: 280, h: 380 }, { stroke: '#222', weight: 6 }),
          BOX('Planta · cozinha', { x: 830, y: 980, w: 280, h: 320 }, { stroke: '#222', weight: 6 }), BOX('Porta', { x: 495, y: 1292, w: 120, h: 16 }, { fill: '#f4f1ea', stroke: '#222', weight: 2 }), BOX('Janela', { x: 122, y: 780, w: 16, h: 160 }, { fill: '#cfe3f0', stroke: '#222', weight: 2 }),
          BOX('Sofá', { x: 170, y: 1100, w: 300, h: 110 }, { stroke: '#555', weight: 2, radius: 14, fill: '#00000010' }), BOX('Mesa', { x: 520, y: 760, w: 200, h: 200 }, { stroke: '#555', weight: 2, type: 'ellipse', fill: '#00000010' }),
          IMG('Marcador 1', 'casa-investigacao-etiqueta-numerada-1', { x: 380, y: 950, w: 70, h: 96 }), IMG('Marcador 2', 'casa-investigacao-etiqueta-numerada-2', { x: 590, y: 1090, w: 70, h: 96 }), IMG('Marcador 3', 'casa-investigacao-etiqueta-numerada-3', { x: 160, y: 960, w: 70, h: 96 }),
          IMG('Régua', 'casa-investigacao-regua-forense', { x: 130, y: 1350, w: 700, h: 117 }),
          T('Norte', 'N ↑', { x: 1010, y: 540, w: 90, h: 50 }, { family: 'Courier Prime', size: 30, bold: true, style: 'clean', wear: 0 })] }),
    ],
  }),
  // ---------------------------------------------------------------- Oficial e jurídico
  cena('certidao-nascimento', 'Certidão de nascimento', {
    category: 'Oficial e jurídico', era: '1920', tom: 'investigação', org: 'cartorio', tags: ['certidão', 'cartório', 'formulário'],
    layers: [
      ...carta({ paper: 'almaco', aging: 'antigo', seed: 121, intensity: 0.8, font: 'Pinyon Script', size: 46, color: '#2a1f14', typed: false, top: 360, date: '', greeting: '', header: 'CERTIDÃO DE NASCIMENTO\nCARTÓRIO DO 2º OFÍCIO DE NOTAS DE VILA AURORA', headFont: 'Old Standard TT', headColor: '#2a1f14', bodyField: 'Nome',
        body: 'Certifico que, ao folhas 112 do Livro B-14 de Registro de Nascimentos, foi lavrado o assento de ELIAS MARQUES DE ALENCAR, do sexo masculino, nascido aos nove dias do mês de março de mil novecentos e vinte e dois, às cinco horas da manhã, na casa de sua residência, filho legítimo de ANTÔNIO MARQUES DE ALENCAR, lavrador, e de dona CARLOTA DE ALENCAR, de prendas domésticas, naturais deste município. Foram avós paternos Joaquim e Rosa; maternos, Cristóvão e Maria. Foi declarante o próprio pai.',
        closing: 'Vila Aurora, 12 de março de 1922.', signature: 'Oficial: F. Camargo',
        extras: [IMG('Selo do cartório', 'casa-selo-cartorio', { x: 860, y: 1360, w: 240, h: 240 }, { blend: 'multiply', opacity: 0.8, rot: -6 }), IMG('Emblema do cartório', EMB('cartorio'), { x: 520, y: 140, w: 200, h: 227 }, { blend: 'multiply', opacity: 0.8 })] }),
      T('Pais', 'Filiação: Antônio Marques de Alencar e Carlota de Alencar', { x: 120, y: 1500, w: 1000, h: 40 }, { family: 'Old Standard TT', size: 22, color: '#2a1f14', style: 'clean', wear: 0.05, field: 'Pais' }),
      T('Data de nascimento', 'Nascido em 09/03/1922, às 5h', { x: 120, y: 1550, w: 700, h: 40 }, { family: 'Old Standard TT', size: 22, color: '#2a1f14', style: 'clean', wear: 0.05, field: 'Data' }),
      T('Local de nascimento', 'Local: Vila Aurora (SP)', { x: 120, y: 1600, w: 700, h: 40 }, { family: 'Old Standard TT', size: 22, color: '#2a1f14', style: 'clean', wear: 0.05, field: 'Local' }),
    ],
  }),
  cena('certidao-casamento', 'Certidão de casamento', {
    category: 'Oficial e jurídico', era: '1950', tom: 'cotidiano', org: 'cartorio', tags: ['certidão', 'cartório', 'casamento', 'formulário'],
    layers: [
      ...base({ paper: 'oficio-creme', aging: 'usado', seed: 122 }),
      IMG('Moldura', 'casa-moldura-diploma-1', { x: 60, y: 60, w: 1120, h: 1634 }),
      T('Título', 'CERTIDÃO DE CASAMENTO', { x: 180, y: 220, w: 880, h: 110 }, { family: 'Pinyon Script', size: 74, align: 'center', color: '#3a2a1a', style: 'clean', wear: 0.05 }),
      T('Testemunhas', 'Testemunhas: Abílio Cunha e Dalva Nunes', { x: 200, y: 1175, w: 840, h: 36 }, { family: 'Old Standard TT', size: 24, align: 'center', color: '#2a1f14', style: 'clean', wear: 0.05, field: 'Testemunhas' }),
      T('Cartório', 'Registro Civil das Pessoas Naturais · 2º Ofício de Vila Aurora', { x: 180, y: 330, w: 880, h: 40 }, { family: 'Old Standard TT', size: 24, align: 'center', color: '#3a2a1a', style: 'clean', wear: 0 }),
      T('Cônjuges', 'LUÍS CARLOS DE ALMEIDA\ne\nHELENA MARIA PIRES', { x: 180, y: 470, w: 880, h: 260 }, { family: 'Old Standard TT', size: 50, bold: true, align: 'center', color: '#2a1f14', style: 'clean', wear: 0.05, field: 'Cônjuges', lh: 1.35 }),
      T('Texto', 'contraíram matrimônio civil nesta cidade, perante o Oficial do Registro e as testemunhas abaixo assinadas, sob o regime da comunhão parcial de bens, tendo a noiva passado a assinar-se Helena Maria Pires de Almeida.', { x: 200, y: 790, w: 840, h: 230 }, { family: 'Old Standard TT', size: 30, align: 'center', color: '#2a1f14', style: 'clean', wear: 0.05, lh: 1.4 }),
      T('Data', 'Celebrado em 22 de novembro de 1952', { x: 200, y: 1060, w: 840, h: 50 }, { family: 'Old Standard TT', size: 32, align: 'center', color: '#2a1f14', style: 'clean', wear: 0.05, field: 'Data' }),
      T('Cartório (campo)', '2º Ofício de Notas de Vila Aurora', { x: 200, y: 1120, w: 840, h: 44 }, { family: 'Old Standard TT', size: 28, align: 'center', color: '#2a1f14', style: 'clean', wear: 0.05, field: 'Cartório', italic: true }),
      IMG('Selo do cartório', 'casa-selo-cartorio', { x: 480, y: 1210, w: 280, h: 280 }, { blend: 'multiply', opacity: 0.85, rot: -5 }),
      T('Assinatura 1', 'Luís C. de Almeida', { x: 200, y: 1480, w: 400, h: 80 }, { family: 'Great Vibes', size: 44, color: '#1c2a5a', style: 'handwriting', wear: 0.2 }), T('Assinatura 2', 'Helena M. Pires', { x: 660, y: 1480, w: 400, h: 80 }, { family: 'Great Vibes', size: 44, color: '#1c2a5a', style: 'handwriting', wear: 0.2 }),
      RULE(200, 1545, 380, { color: '#3a2a1a' }), RULE(660, 1545, 380, { color: '#3a2a1a' }),
    ],
  }),
  cena('carteira-identidade-antiga', 'Carteira de identidade antiga', {
    category: 'Oficial e jurídico', page: { width: 1400, height: 1000 }, background: '#5b4a36', era: '1960', tom: 'investigação', tags: ['identidade', 'cartão', 'objeto', 'formulário'],
    layers: [
      IMG('Mesa', 'casa-superficie-wood060', { x: 0, y: 0, w: 1400, h: 1000 }),
      BOX('Cartão verde', { x: 100, y: 120, w: 1200, h: 760 }, { fill: '#4f7a54', radius: 28 }), BOX('Cartão · fundo claro', { x: 126, y: 146, w: 1148, h: 708 }, { fill: '#d6e3c8', radius: 20 }),
      IMG('Guilhochê', 'casa-codigo-guilhoche-verde', { x: 560, y: 220, w: 520, h: 520 }, { blend: 'multiply', opacity: 0.55 }),
      BOX('Dobra do cartão', { x: 697, y: 126, w: 6, h: 748 }, { fill: '#00000018' }),
      T('Cabeçalho', 'REPÚBLICA FEDERATIVA DO BRASIL\nSECRETARIA DE SEGURANÇA PÚBLICA · CARTEIRA DE IDENTIDADE', { x: 160, y: 168, w: 1080, h: 90 }, { family: 'Old Standard TT', size: 26, bold: true, align: 'center', color: '#1f3a24', style: 'clean', wear: 0 }),
      FOTO('Foto 3x4', RET.rapaz, { x: 170, y: 290, w: 270, h: 360 }, { field: 'Foto' }),
      IMG('Digital', 'casa-digitais-2', { x: 190, y: 670, w: 130, h: 160 }, { blend: 'multiply', opacity: 0.85 }),
      T('Nome', 'NOME\nEdmundo Vaz Cavalcanti', { x: 480, y: 290, w: 740, h: 110 }, { family: 'Courier Prime', size: 32, color: '#1d1b24', field: 'Nome' }),
      T('Filiação', 'FILIAÇÃO\nJoão Vaz Cavalcanti e Dalila Vaz Cavalcanti', { x: 480, y: 420, w: 740, h: 110 }, { family: 'Courier Prime', size: 30, color: '#1d1b24', field: 'Filiação' }),
      T('Número', 'REGISTRO GERAL\n3.482.119-SP', { x: 480, y: 550, w: 360, h: 100 }, { family: 'Courier Prime', size: 30, bold: true, color: '#1d1b24', field: 'Número' }),
      T('Nascimento', 'NASCIMENTO\n02/11/1931', { x: 860, y: 550, w: 360, h: 100 }, { family: 'Courier Prime', size: 30, color: '#1d1b24' }),
      T('Assinatura do titular', 'Edmundo V. Cavalcanti', { x: 800, y: 720, w: 440, h: 70 }, { family: 'Homemade Apple', size: 34, color: '#1c2a5a', style: 'handwriting', wear: 0.2 }),
      IMG('Carimbo', 'casa-carimbo-br-autenticado', { x: 1020, y: 650, w: 210, h: 210 }, { blend: 'multiply', opacity: 0.7, rot: 8 }),
    ],
  }),
  cena('passaporte-dados', 'Passaporte · página de dados', {
    category: 'Oficial e jurídico', page: { width: 1300, height: 1000 }, background: '#d8d2c0', era: '1970', tom: 'investigação', tags: ['passaporte', 'viagem', 'formulário'],
    layers: [
      IMG('Papel de segurança', 'casa-papel-papel-timbrado-bancario-usado', { x: 0, y: 0, w: 1300, h: 1000 }),
      ...aging2('usado', 131, { width: 1300, height: 1000 }),
      T('Título', 'PASSAPORTE · PASSPORT', { x: 80, y: 60, w: 1140, h: 60 }, { family: 'Courier Prime', size: 38, bold: true, align: 'center', color: '#1f3a5f', style: 'clean', wear: 0 }),
      FOTO('Foto', RET.oficial, { x: 90, y: 160, w: 300, h: 400 }, { field: 'Foto' }),
      T('Nome', 'SOBRENOME / NOME\nTEIXEIRA, ÁLVARO MENDES', { x: 430, y: 170, w: 760, h: 100 }, { family: 'Courier Prime', size: 34, color: '#1d1b24', field: 'Nome' }),
      T('Nacionalidade', 'NACIONALIDADE\nBRASILEIRA', { x: 430, y: 290, w: 360, h: 90 }, { family: 'Courier Prime', size: 30, color: '#1d1b24' }), T('Nascimento', 'DATA DE NASC.\n17 JUN 1938', { x: 820, y: 290, w: 360, h: 90 }, { family: 'Courier Prime', size: 30, color: '#1d1b24' }),
      T('Validade', 'VÁLIDO ATÉ\n04 MAI 1978', { x: 430, y: 400, w: 360, h: 90 }, { family: 'Courier Prime', size: 30, color: '#1d1b24' }), T('Número', 'Nº\nCY 417883', { x: 820, y: 400, w: 360, h: 90 }, { family: 'Courier Prime', size: 30, bold: true, color: '#8a1414', field: 'Número' }),
      T('Zona de leitura', 'P<BRATEIXEIRA<<ALVARO<MENDES<<<<<<<<<<<<<<\nCY4178830BRA3806176M7805049<<<<<<<<<<<<<<04', { x: 80, y: 800, w: 1140, h: 110 }, { family: 'Courier Prime', size: 31, color: '#1d1b24', style: 'clean', wear: 0 }),
      IMG('Carimbo de entrada', 'casa-postal-carimbo-correio-santos-1924', { x: 140, y: 590, w: 420, h: 178 }, { blend: 'multiply', opacity: 0.8, rot: -8, _field: 'Carimbos' }),
      IMG('Carimbo de saída', 'casa-carimbo-br-recebido-em', { x: 560, y: 560, w: 300, h: 210 }, { blend: 'multiply', opacity: 0.75, rot: 6 }),
      IMG('Selo postal', 'casa-postal-selo-1970', { x: 960, y: 520, w: 190, h: 233 }, { rot: 4 }),
    ],
  }),
  cena('testamento', 'Testamento', {
    category: 'Oficial e jurídico', era: '1890', tom: 'horror', org: 'solar', tags: ['testamento', 'manuscrito', 'formulário'],
    layers: [
      ...carta({ paper: 'oficio-creme', aging: 'antigo', seed: 132, intensity: 0.7, font: 'Mrs Saint Delafield', size: 58, color: '#2a1f14', top: 170, header: 'TESTAMENTO', headFont: 'Old Standard TT', headColor: '#2a1f14', greeting: 'Eu, Cornélio de Albuquerque Pinhais,', greetingField: 'Testador', bodyField: 'Texto', lh: 1.28,
        body: 'em pleno gozo de minhas faculdades, ainda que enfermo do corpo, faço este meu testamento. Deixo o Solar dos Pinhais, com todas as suas terras e o que nele se achar, a minha sobrinha Helena, com a condição de que jamais abra o porão da ala velha. Aos meus criados deixo seis meses de ordenado. Ao Sr. vigário, cem mil réis para missas. Quem violar a vontade aqui escrita responderá por tudo o que dali sair.',
        closing: 'Vila Aurora, 3 de novembro de 1893.', signature: 'Cornélio de A. Pinhais',
        extras: [T('Testemunhas', 'Testemunhas: Dr. Teodoro Brandão · Pe. Anselmo Freitas · Sr. Abílio Cunha', { x: 120, y: 1430, w: 1000, h: 90 }, { family: 'Old Standard TT', size: 24, color: '#2a1f14', style: 'clean', wear: 0.05, field: 'Testemunhas' }),
          IMG('Lacre preto', 'casa-lacre-preto-liso', { x: 820, y: 1500, w: 200, h: 200 }, { rot: 8 }), IMG('Reconhecimento de firma', 'casa-carimbo-br-reconheco-firma', { x: 140, y: 1530, w: 420, h: 160 }, { blend: 'multiply', opacity: 0.75, rot: -3 })] }),
    ],
  }),
  cena('escritura-imovel', 'Escritura de imóvel', {
    category: 'Oficial e jurídico', era: '1930', tom: 'investigação', org: 'cartorio', tags: ['escritura', 'cartório', 'formulário'],
    layers: [
      ...formulario({ org: 'cartorio', emblem: EMB('cartorio'), paper: 'oficio-creme', seed: 133, aging: 'antigo', intensity: 0.6, title: ['CARTÓRIO DO 2º OFÍCIO DE NOTAS', 'VILA AURORA · ESTADO DE SÃO PAULO'], titleSize: 26, formTitle: 'ESCRITURA PÚBLICA DE COMPRA E VENDA', font: 'Old Standard TT',
        rows: [['Imóvel', 'Solar dos Pinhais, Estrada Velha, km 7', { col: 2 }], ['Outorgantes', 'Cornélio de A. Pinhais, vendedor, e Banco Comercial do Planalto, comprador', { col: 2 }], ['Valor', '180:000$000 (cento e oitenta contos de réis)']],
        sections: [{ h: 'Cláusulas', field: 'Cláusulas', size: 22, text: '1. O imóvel é vendido livre e desembaraçado de quaisquer ônus.\n2. O pagamento será feito em três parcelas iguais, a primeira neste ato.\n3. O vendedor reserva-se o uso do porão da ala velha até o fim da vida.\n4. As custas e os impostos correm por conta do comprador.\n5. Assim o disseram e outorgaram, do que dou fé.' }],
        signatures: [{ nome: 'Cornélio A. Pinhais', cargo: 'Vendedor' }, { nome: 'R. Siqueira', cargo: 'p/ Banco Comercial do Planalto' }], signY: 1430, stamps: [{ id: 'casa-carimbo-br-cartorio', x: 840, y: 1140, size: 260, rot: -7, opacity: 0.8 }] }),
    ],
  }),
  cena('procuracao', 'Procuração', {
    category: 'Oficial e jurídico', era: '1980', tom: 'cotidiano', org: 'cartorio', tags: ['procuração', 'cartório', 'formulário'],
    layers: [
      ...formulario({ org: 'cartorio', emblem: EMB('cartorio'), paper: 'papel-maquina', age: 'usado', seed: 134, aging: 'usado', title: ['CARTÓRIO DO 2º OFÍCIO DE NOTAS', 'LIVRO 112 · FOLHA 047'], titleSize: 26, formTitle: 'PROCURAÇÃO',
        rows: [['Outorgante', 'Helena Marques de Alencar, solteira, professora'], ['Procurador', 'Dr. Teodoro Brandão, advogado, OAB/SP 41.920'], ['Poderes', 'Representá-la perante repartições públicas, bancos e juízos; receber e dar quitação; vender o imóvel da Rua das Acácias, 88; assinar escrituras e requerimentos.', { col: 2 }]],
        sections: [{ h: 'Prazo', text: 'A presente procuração vale por dois anos, a contar de hoje, podendo ser revogada a qualquer tempo.', size: 22, field: false }],
        signatures: [{ nome: 'Helena M. Alencar', cargo: 'Outorgante', field: 'Assinatura' }, { nome: 'F. Camargo', cargo: 'Oficial do cartório' }], signY: 1470,
        stamps: [{ id: 'casa-selo-cartorio', x: 850, y: 1180, size: 240, rot: 6, opacity: 0.8 }], extras: ['Rubrica 1', 'Rubrica 2'].map((n, i) => ({ ...initials('Helena Marques de Alencar', { x: 1130, y: 600 + i * 500, size: 28 }), name: n })) }),
    ],
  }),
  // ---------------------------------------------------------------- Militar e governo
  cena('ordem-missao-ultrassecreta', 'Ordem de missão · ultrassecreto', {
    category: 'Militar e governo', era: '1960', tom: 'investigação', org: 'doe', tags: ['governo', 'missão', 'sigilo', 'formulário'],
    layers: [
      ...formulario({ org: 'doe', emblem: EMB('doe'), paper: 'papel-maquina', seed: 141, aging: 'usado', title: ['DEPARTAMENTO DE OCORRÊNCIAS EXTRAORDINÁRIAS', 'ORDEM DE MISSÃO Nº 0417'], titleSize: 25, ink: '#111111',
        rows: [['Código', 'LUA-TRÍPLICE / FASE 2'], ['Agentes', 'A-4 (comando), A-7, A-9'], ['Objetivo', 'Averiguar a atividade no subsolo do Solar dos Pinhais e recolher o material encontrado, sem contato com a imprensa.', { col: 2 }]],
        sections: [{ h: 'Instruções', field: 'Instruções', size: 22, text: 'Os agentes seguirão em veículo sem identificação até Vila Aurora. Ao chegar, estabelecerão contato apenas com o vigia, cuja versão deve ser conferida. Qualquer indício de culto organizado será comunicado por rádio ao Comando. Nada será levado por escrito. Esta ordem deve ser destruída após a leitura.' }],
        signatures: [{ nome: 'Cel. R. Albuquerque', cargo: 'Diretor do Departamento' }], signY: 1500, stamps: [{ id: 'casa-carimbo-br-sigiloso', x: 100, y: 1250, size: 380, h: 140, rot: -10, opacity: 0.9 }, { id: 'casa-carimbo-ultra-secreto', x: 700, y: 1220, size: 400, h: 150, rot: 7, opacity: 0.85 }],
        extras: [BOX('Tarja 1', { x: 480, y: 780, w: 380, h: 30 }, { fill: '#0b0b0b' }), BOX('Tarja 2', { x: 130, y: 1090, w: 430, h: 28 }, { fill: '#0b0b0b' })] }),
    ],
  }),
  cena('dossie-agente', 'Dossiê de agente', {
    category: 'Militar e governo', page: { width: 1500, height: 1250 }, background: '#4a4540', era: '1970', tom: 'investigação', org: 'doe', tags: ['governo', 'dossiê', 'agente', 'formulário'],
    layers: [
      IMG('Mesa', 'casa-superficie-wood060', { x: 0, y: 0, w: 1500, h: 1250 }),
      IMG('Capa do dossiê', 'casa-objeto-capa-dossie-preta', { x: 60, y: 40, w: 860, h: 1160 }, { rot: -2 }),
      IMG('Ficha de serviço', 'casa-papel-oficio-creme-usado', { x: 640, y: 120, w: 760, h: 1040 }, { rot: 3 }),
      T('Título da capa', 'DOSSIÊ\nPESSOAL', { x: 150, y: 140, w: 480, h: 220 }, { family: 'Stardos Stencil', size: 84, bold: true, align: 'center', color: '#c9c3b0', style: 'clean', wear: 0, rot: -2 }),
      IMG('Selo do departamento', EMB('doe'), { x: 340, y: 700, w: 250, h: 283 }, { opacity: 0.55, rot: -2 }),
      FOTO('Foto', RET.hussardo, { x: 730, y: 190, w: 280, h: 360 }, { field: 'Foto', rot: 3 }), IMG('Clipe', 'casa-prendedor-clipe-prata-1', { x: 840, y: 160, w: 60, h: 120 }, { rot: 3 }),
      T('Nome', 'NOME: Rodrigo Fernandes Lessa', { x: 1030, y: 230, w: 330, h: 120 }, { family: 'Courier Prime', size: 24, bold: true, color: '#1d1b24', field: 'Nome', rot: 3 }),
      T('Codinome', 'CODINOME: "Corvo"', { x: 1030, y: 350, w: 330, h: 60 }, { family: 'Courier Prime', size: 24, color: '#1d1b24', field: 'Codinome', rot: 3 }),
      T('Histórico', 'HISTÓRICO DE SERVIÇO\n1958 — ingressa no Departamento\n1961 — missão em Paranapiacaba\n1964 — afastado por motivo de saúde\n1967 — retorna; designado ao caso "Lua Tríplice"\n1970 — último relatório recebido', { x: 700, y: 600, w: 640, h: 380 }, { family: 'Courier Prime', size: 23, color: '#1d1b24', field: 'Histórico', lh: 1.4, rot: 3 }),
      IMG('Carimbo SIGILOSO', 'casa-carimbo-br-sigiloso', { x: 1000, y: 950, w: 320, h: 120 }, { blend: 'multiply', opacity: 0.85, rot: -8 }),
    ],
  }),
  cena('telegrama-militar', 'Telegrama militar', {
    category: 'Militar e governo', page: { width: 1500, height: 1000 }, background: '#d8cdb0', era: '1940', tom: 'investigação', tags: ['telegrama', 'militar', 'censura', 'formulário'],
    layers: [
      IMG('Papel', 'casa-papel-telegrama-usado', { x: 0, y: 0, w: 1500, h: 1000 }), ...aging2('usado', 142, { width: 1500, height: 1000 }),
      T('Cabeçalho', 'REDE TELEGRÁFICA MILITAR · SERVIÇO URGENTE', { x: 100, y: 60, w: 1300, h: 50 }, { family: 'Old Standard TT', size: 34, bold: true, align: 'center', color: '#1d1b24', style: 'clean', wear: 0 }),
      T('Origem', 'ORIGEM: Comando da 2ª Região', { x: 100, y: 150, w: 600, h: 40 }, { family: 'Courier Prime', size: 26, color: '#1d1b24', field: 'Origem' }), T('Destino', 'DESTINO: Posto Avançado de Paranapiacaba', { x: 700, y: 150, w: 700, h: 40 }, { family: 'Courier Prime', size: 26, color: '#1d1b24', field: 'Destino' }),
      T('Prioridade', 'PRIORIDADE: A-1 · HORA: 03H42', { x: 100, y: 205, w: 800, h: 40 }, { family: 'Courier Prime', size: 26, color: '#1d1b24', field: 'Prioridade' }),
      ...[['SEGUIMOS INSTRUÇÕES STOP DESLOCAR TROPA À', 300, -0.8], ['VILA AURORA AO AMANHECER STOP SIGILO ABSOLUTO', 410, 0.6], ['NÃO PERMITIR ENTRADA NO SOLAR STOP AGUARDAR', 520, -0.4], ['ORDENS DO COMANDO CENTRAL STOP', 630, 0.9]].flatMap(([txt, y, r], i) => [
        BOX(`Tira ${i + 1}`, { x: 120 + (i % 2) * 18, y, w: 1180, h: 84 }, { fill: '#efe6cf', stroke: '#b8ab88', weight: 1.4, rot: r }),
        T(i === 0 ? 'Mensagem' : `Linha ${i + 1}`, txt, { x: 150 + (i % 2) * 18, y: y + 20, w: 1130, h: 50 }, { family: 'Courier Prime', size: 32, bold: true, color: '#1d1b24', rot: r, field: i === 0 ? 'Mensagem' : undefined }),
      ]),
      BOX('Tarja de censura', { x: 760, y: 428, w: 480, h: 46 }, { fill: '#0b0b0b', rot: 0.6 }),
      IMG('Carimbo de censura', 'casa-carimbo-aprovado', { x: 1000, y: 700, w: 340, h: 170 }, { blend: 'multiply', opacity: 0.8, rot: -9 }),
    ],
  }),
  cena('mapa-tatico', 'Mapa tático', {
    category: 'Militar e governo', page: { width: 1600, height: 1100 }, background: '#b8946a', era: '1940', tom: 'investigação', tags: ['mapa', 'militar', 'tático', 'formulário'],
    layers: [
      IMG('Papel kraft', 'casa-papel-papel-de-embrulho-antigo', { x: 0, y: 0, w: 1600, h: 1100 }), ...aging2('antigo', 143, { width: 1600, height: 1100 }, 0.7),
      FOTO('Mapa', 'casa-foto-mapa-fortificacoes-1816', { x: 90, y: 90, w: 1050, h: 780 }, { field: 'Mapa', filter: { sepia: 0.4 } }),
      ...Array.from({ length: 11 }, (_, i) => RULE(90 + i * 105, 90, 0, { color: '#2a2a2a', weight: 1.2, name: `Quadrícula V${i + 1}` })).map(l => ({ ...l, height: 780 })),
      ...Array.from({ length: 8 }, (_, i) => RULE(90, 90 + i * 112, 1050, { color: '#2a2a2a', weight: 1.2, name: `Quadrícula H${i + 1}` })),
      IMG('Seta de avanço', 'casa-rabisco-seta-curva', { x: 250, y: 380, w: 420, h: 190 }, { blend: 'multiply', rot: -8 }), IMG('Círculo de posição', 'casa-rabisco-circulo-duplo', { x: 760, y: 260, w: 260, h: 120 }, { blend: 'multiply' }),
      T('Anotação', 'posto B\nfogo cruzado\naqui', { x: 820, y: 400, w: 280, h: 150 }, { family: 'Caveat', size: 36, color: '#8a1414', style: 'handwriting', wear: 0.2, rot: -4 }),
      BOX('Quadro da legenda', { x: 1190, y: 90, w: 330, h: 780 }, { fill: '#efe6cf', stroke: '#6a5a3a', weight: 2, opacity: 0.9 }),
      T('Legenda', 'LEGENDA\n\n▲ Posto avançado\n● Ponto de encontro\n━ Estrada principal\n┅ Trilha a pé\n✕ Obstáculo\n⇢ Linha de avanço\n\nEscala 1:25.000\nQuadrícula de 1 km', { x: 1210, y: 120, w: 300, h: 700 }, { family: 'Courier Prime', size: 24, color: '#1d1b24', lh: 1.45, field: 'Legenda' }),
      T('Escala', 'Escala 1:25.000', { x: 100, y: 910, w: 500, h: 50 }, { family: 'Courier Prime', size: 28, color: '#1d1b24', field: 'Escala' }),
      T('Data do levantamento', 'Levantamento de 1943', { x: 100, y: 970, w: 500, h: 50 }, { family: 'Courier Prime', size: 28, color: '#1d1b24', field: 'Data' }),
      IMG('Carimbo secreto', 'casa-carimbo-secreto', { x: 1180, y: 900, w: 340, h: 130 }, { blend: 'multiply', opacity: 0.85, rot: 6 }),
    ],
  }),
  cena('relatorio-redigido', 'Relatório redigido', {
    category: 'Militar e governo', era: '1980', tom: 'investigação', org: 'doe', tags: ['governo', 'redigido', 'tarjas', 'formulário'],
    layers: [
      ...formulario({ org: 'doe', emblem: EMB('doe'), paper: 'papel-maquina', seed: 144, aging: 'usado', title: ['DEPARTAMENTO DE OCORRÊNCIAS EXTRAORDINÁRIAS', 'RELATÓRIO DE CAMPO Nº 77/83'], titleSize: 25, ink: '#111111',
        rows: [['Data', '14 de março de 1983'], ['Local', 'Vila Aurora (SP)'], ['Assunto', 'Fenômeno luminoso e ruídos subterrâneos no Solar dos Pinhais', { col: 2 }]],
        sections: [{ h: 'Texto', field: 'Texto', size: 23, text: 'Em 14 de março, a equipe chegou ao local às 22h. O vigia confirmou os relatos anteriores. No porão foram encontrados símbolos desenhados com giz e restos de velas. Às 23h40, o agente A-7 relatou uma luz azulada vinda da parede norte, seguida de um som grave contínuo, que cessou às 00h05. O agente A-9 recusou-se a descer pela segunda vez. Recomenda-se o isolamento da propriedade e a retirada imediata do material do subsolo.' }],
        signatures: [{ nome: 'A-4', cargo: 'Chefe de equipe' }], signY: 1560, stamps: [{ id: 'casa-carimbo-confidencial', x: 780, y: 1330, size: 360, h: 140, rot: -6, opacity: 0.8 }],
        extras: [BOX('Tarja nome', { x: 430, y: 618, w: 300, h: 30 }, { fill: '#0b0b0b' }), BOX('Tarja 1', { x: 110, y: 924, w: 760, h: 30 }, { fill: '#0b0b0b' }), BOX('Tarja 2', { x: 480, y: 1013, w: 640, h: 30 }, { fill: '#0b0b0b' }), BOX('Tarja 3', { x: 110, y: 1130, w: 520, h: 30 }, { fill: '#0b0b0b' }),
          T('Trechos tarjados', 'LIBERADO PARCIALMENTE', { x: 110, y: 1450, w: 560, h: 60 }, { family: 'Courier Prime', size: 26, bold: true, color: '#a3182b', style: 'clean', wear: 0, rot: -2, field: 'Trechos tarjados' })] }),
    ],
  }),
  cena('cracha-acesso', 'Crachá de acesso', {
    category: 'Militar e governo', page: { width: 800, height: 1200 }, background: '#c9c4b6', era: 'hoje', tom: 'investigação', org: 'doe', tags: ['crachá', 'acesso', 'objeto', 'formulário'],
    layers: [
      IMG('Mesa', 'casa-superficie-metal032', { x: 0, y: 0, w: 800, h: 1200 }),
      IMG('Crachá', 'casa-objeto-cracha-azul', { x: 110, y: 60, w: 580, h: 904 }),
      T('Instituição', 'DOE · ACESSO RESTRITO', { x: 180, y: 520, w: 440, h: 50 }, { family: 'Oswald', size: 36, bold: true, color: '#ffffff', align: 'center', style: 'clean', wear: 0 }),
      FOTO('Foto', RET.bigode, { x: 280, y: 590, w: 240, h: 240 }, { field: 'Foto' }),
      T('Nome', 'MARCOS REIS', { x: 195, y: 832, w: 410, h: 56 }, { family: 'Oswald', size: 44, bold: true, align: 'center', color: '#1d1b24', style: 'clean', wear: 0, field: 'Nome' }),
      T('Nível', 'NÍVEL DE ACESSO: 4-B', { x: 195, y: 890, w: 410, h: 44 }, { family: 'Oswald', size: 28, align: 'center', color: '#a3182b', style: 'clean', wear: 0, field: 'Nível' }),
      T('Matrícula', 'MATRÍCULA 00417804', { x: 160, y: 1000, w: 480, h: 40 }, { family: 'Oswald', size: 26, align: 'center', color: '#1d1b24', style: 'clean', wear: 0, field: 'Matrícula' }),
      barcode('00417804', { x: 230, y: 1060, width: 340, height: 80 }),
    ],
  }),
];

/** Envelhecimento por receita (atalho para aging do kit, com intensidade). */
function aging2(preset, seed, page, intensity = 1) { return base({ page, paper: 'x', aging: preset, seed, intensity }).slice(1); }
