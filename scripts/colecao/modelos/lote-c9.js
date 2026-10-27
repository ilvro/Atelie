/**
 * Lote C9 · Papel do dia a dia, escrita e imprensa (21 modelos novos): cadernos, diários e livros,
 * cartas e bilhetes, jornal e impressos, escola e juventude.
 */
import { A4, T, IMG, FOTO, RULE, BOX, base, formulario, carta, tabela, modelo } from './montagem.js';
import { aging } from '../kit.js';

const RET = { bigode: 'casa-foto-retrato-homem-bigode-oculos', rapaz: 'casa-foto-retrato-rapaz-cdv', senhora: 'casa-foto-retrato-senhora-capa', hussardo: 'casa-foto-retrato-jovem-hussardo', oficial: 'casa-foto-retrato-oficial-sabre', mulher: 'casa-foto-retrato-mulher-sanfona' };
const EMB = org => `casa-emblema-universo-${org}`;
const fx = (name, type, o = {}) => ({ kind: 'effect', name, blend: o.blend || 'multiply', opacity: o.opacity ?? 0.4, effect: { type, seed: o.seed || 9, amount: o.amount ?? 0.5, params: o.params || {} } });
const age = (preset, seed, page, intensity = 1) => aging(preset, { seed, intensity, page });

/** Cifra de substituição simples (cada letra vai para a que está 7 depois), em grupos de cinco. */
function cifrar(texto) {
  const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const limpo = texto.toUpperCase().normalize('NFD').replace(/[^A-Z]/g, '');
  const cif = [...limpo].map(c => a[(a.indexOf(c) + 7) % 26]).join('');
  return cif.match(/.{1,5}/g).join(' ');
}

const BLOCOS = [['Playfair Display', '#f3efe2', '#1d1b24', true], ['Anton', '#e9e2cf', '#8a1414', false], ['Special Elite', '#fbfaf5', '#1d1b24', false], ['Oswald', '#d9d2bf', '#1d1b24', false], ['Oswald', '#f1ece0', '#1d1b24', true], ['EB Garamond', '#e4dcc4', '#1d1b24', false], ['Bebas Neue', '#fbfaf5', '#2a2a2a', false]];

export default [
  // ---------------------------------------------------------------- Cadernos, diários e livros
  modelo({
    slug: 'caderno-espiral-pagina', name: 'Caderno espiral · página', category: 'Cadernos, diários e livros', page: { width: 1240, height: 1754 }, background: '#d8d2c0', era: '1990', tom: 'cotidiano', tags: ['caderno', 'espiral', 'manuscrito'],
    layers: [
      ...carta({ paper: 'caderno', age: 'usado', aging: 'usado', seed: 201, intensity: 0.8, font: 'Shadows Into Light', size: 38, color: '#1c3a8a', margin: 190, top: 150, date: 'terça, 14/05/1996', lh: 1.5,
        body: 'Hoje a Carol não foi na aula e eu fiquei sozinha no recreio de novo. A professora de história passou trabalho em dupla e eu fiz com o Beto, que só copiou do livro. Na volta passei na casa velha da Rua dos Pinhais e juro que tinha luz no porão. A Dona Odete disse que ninguém mora lá desde que a família sumiu. Amanhã vou levar a lanterna do meu pai e a máquina de foto. Se eu não voltar, a culpa é da Carol.',
        extras: [IMG('Espiral', 'casa-objeto-espiral-lateral', { x: 40, y: 20, w: 90, h: 1700 }), IMG('Rabisco · estrela', 'casa-rabisco-estrela-margem', { x: 980, y: 1330, w: 170, h: 170 }, { blend: 'multiply', rot: 10 }), IMG('Rabisco · seta', 'casa-rabisco-seta-curva', { x: 760, y: 1500, w: 300, h: 130 }, { blend: 'multiply' }), T('Anotação do canto', 'não esquecer: PILHAS!!', { x: 700, y: 1620, w: 450, h: 60 }, { family: 'Shadows Into Light', size: 36, color: '#b3261e', style: 'handwriting', wear: 0.2, rot: -3 })] }),
    ],
  }),
  modelo({
    slug: 'diario-aberto-dupla', name: 'Diário aberto · página dupla', category: 'Cadernos, diários e livros', page: { width: 2000, height: 1300 }, background: '#4a3a2a', era: '1890', tom: 'horror', org: 'solar', tags: ['diário', 'livro aberto', 'manuscrito'],
    layers: [
      IMG('Mesa', 'casa-superficie-wood060', { x: 0, y: 0, w: 2000, h: 1300 }),
      IMG('Página esquerda (papel)', 'casa-papel-oficio-creme-antigo', { x: 60, y: 50, w: 940, h: 1200 }), IMG('Página direita (papel)', 'casa-papel-oficio-creme-antigo', { x: 1000, y: 50, w: 940, h: 1200 }),
      ...age('antigo', 202, { width: 2000, height: 1300 }, 0.7),
      BOX('Sombra da lombada', { x: 940, y: 50, w: 120, h: 1200 }, { fill: '#3a2a1a', opacity: 0.35, blend: 'multiply' }), BOX('Vinco central', { x: 997, y: 50, w: 6, h: 1200 }, { fill: '#000000', opacity: 0.35 }),
      T('Data', '14 de novembro de 1893', { x: 140, y: 120, w: 780, h: 60 }, { family: 'La Belle Aurore', size: 42, color: '#2a1f14', style: 'handwriting', wear: 0.2, field: 'Data' }),
      T('Página esquerda', 'Hoje o pai voltou a descer ao porão. Ouvi a chave girar às dez e meia e os passos desceram devagar, como quem conta os degraus. Quando subiu, trazia nas botas a terra vermelha que só existe lá embaixo. A mãe não quis jantar. Eu fingi dormir, mas escutei: ele falava baixo com alguém, e ninguém respondia.', { x: 140, y: 200, w: 780, h: 900 }, { family: 'La Belle Aurore', size: 38, color: '#2a1f14', style: 'handwriting', wear: 0.2, lh: 1.5, field: 'Página esquerda' }),
      T('Página direita', 'Quinta-feira. Perguntei à Maria o que há no porão. Ela benzeu-se e disse que eu não pergunte, que a casa escuta. Esta noite as velas da sala apagaram sozinhas, todas ao mesmo tempo. Escrevo isto ao pé da janela, com a vela da cozinha, e juro que a terra vermelha chegou até a escada.', { x: 1080, y: 200, w: 780, h: 900 }, { family: 'La Belle Aurore', size: 38, color: '#2a1f14', style: 'handwriting', wear: 0.2, lh: 1.5, field: 'Página direita' }),
      BOX('Flor seca · pétala 1', { x: 1560, y: 1020, w: 70, h: 120 }, { type: 'ellipse', fill: '#8a4a5a', opacity: 0.6, rot: 20 }), BOX('Flor seca · pétala 2', { x: 1620, y: 1040, w: 70, h: 120 }, { type: 'ellipse', fill: '#9a5a6a', opacity: 0.6, rot: -25 }), BOX('Flor seca · caule', { x: 1612, y: 1120, w: 6, h: 90 }, { fill: '#4a5a2a', opacity: 0.7, rot: 8 }),
    ],
  }),
  modelo({
    slug: 'caderneta-bolso', name: 'Caderneta de bolso', category: 'Cadernos, diários e livros', page: { width: 800, height: 1100 }, background: '#c9c0a8', era: '1950', tom: 'investigação', tags: ['caderneta', 'anotações', 'bolso'],
    layers: [
      ...base({ page: { width: 800, height: 1100 }, paper: 'caderno', age: 'usado', aging: 'usado', seed: 203, intensity: 0.9 }),
      IMG('Argolas', 'casa-objeto-argolas-fichario', { x: 20, y: 280, w: 120, h: 340 }, { opacity: 0.9 }), IMG('Argolas 2', 'casa-objeto-argolas-fichario', { x: 20, y: 640, w: 120, h: 340 }, { opacity: 0.9 }),
      T('Anotações', 'Seg 10/3 — pagar o aluguel\nTer — dentista 15h\nQua — falar c/ Arnaldo sobre o carro\n\nTelefones:\nArnaldo ....... 32-4471\nPadaria ......... 28-1190\nDra. Lúcia ....... 41-0072\n\nComprar: café, fósforos, sabão\nLevar casaco p/ Vila Aurora (frio!)', { x: 170, y: 90, w: 560, h: 880 }, { family: 'Caveat', size: 44, color: '#1c2a5a', style: 'handwriting', wear: 0.2, lh: 1.35, field: 'Anotações' }),
      IMG('Marca de café', 'casa-manchas-cafe-2', { x: 480, y: 700, w: 260, h: 260 }, { blend: 'multiply', opacity: 0.5 }),
    ],
  }),
  modelo({
    slug: 'livro-antigo-pagina', name: 'Livro antigo · página impressa', category: 'Cadernos, diários e livros', page: { width: 1100, height: 1600 }, background: '#d7c9a6', era: '1800', tom: 'horror', tags: ['livro', 'impresso', 'anotações'],
    layers: [
      ...base({ page: { width: 1100, height: 1600 }, paper: 'oficio-creme', age: 'antigo', aging: 'antigo', seed: 204, intensity: 0.7 }),
      T('Título corrente', 'DE REBUS ARCANIS · LIBER SECUNDUS', { x: 120, y: 90, w: 860, h: 36 }, { family: 'Old Standard TT', size: 22, align: 'center', color: '#2a1f14', style: 'clean', wear: 0.05, field: 'Título' }),
      RULE(120, 140, 860, { color: '#2a1f14', weight: 1.4 }),
      T('Capitular', 'A', { x: 120, y: 190, w: 150, h: 190 }, { family: 'IM Fell English', size: 190, bold: true, color: '#7a1f1f', style: 'clean', wear: 0.1 }),
      T('Texto', 'o cabo de muitos anos de estudo, concluiu o autor que certas portas não se abrem com chave, mas com nome. E quem conhece o nome da porta conhece, por consequência, o de quem a guarda. Assim se lê nas antigas crônicas dos monges de São Gabriel, que viram, numa noite de inverno, descer da serra uma luz que não era de fogo nem de lua, e ouviram debaixo da terra um canto de muitas vozes, tão lento que parecia o próprio silêncio a respirar. Dizem que desse dia em diante nenhum deles quis mais ler em voz alta.', { x: 280, y: 190, w: 700, h: 560 }, { family: 'IM Fell English', size: 29, color: '#2a1f14', style: 'clean', wear: 0.1, lh: 1.4, field: 'Texto' }),
      T('Texto (continuação)', 'Pelo que toca à natureza dessa luz, divergem os autores: uns a tomam por fogo-fátuo, outros por sinal dos mortos; o certo é que, onde ela pousa, o capim não torna a crescer por três estações. Notem os curiosos que tal fenômeno cessa ao toque do ferro frio e do sal, o que dá a entender sua origem, ainda que não sua causa.', { x: 120, y: 780, w: 860, h: 300 }, { family: 'IM Fell English', size: 29, color: '#2a1f14', style: 'clean', wear: 0.1, lh: 1.4 }),
      RULE(120, 1320, 300, { color: '#2a1f14', weight: 1.2 }),
      T('Notas de rodapé', '¹ Crônica de São Gabriel, fol. 41v.\n² Cf. o capítulo sobre o ferro, adiante.', { x: 120, y: 1335, w: 860, h: 90 }, { family: 'IM Fell English', size: 22, color: '#2a1f14', style: 'clean', wear: 0.1, field: 'Notas' }),
      T('Anotação a lápis', 'conferir c/ o outro exemplar!\nsal na soleira — funciona?', { x: 640, y: 1100, w: 380, h: 110 }, { family: 'Caveat', size: 34, color: '#555555', style: 'handwriting', wear: 0.4, rot: -3, opacity: 0.85 }),
      T('Fólio', '— 112 —', { x: 400, y: 1500, w: 300, h: 40 }, { family: 'Old Standard TT', size: 22, align: 'center', color: '#2a1f14', style: 'clean', wear: 0.05 }),
    ],
  }),
  modelo({
    slug: 'agenda-compromissos', name: 'Agenda de compromissos', category: 'Cadernos, diários e livros', page: { width: 1240, height: 1754 }, background: '#d8d2c0', era: '1980', tom: 'cotidiano', tags: ['agenda', 'semana', 'manuscrito'],
    layers: [
      ...base({ paper: 'oficio-branco', age: 'usado', aging: 'usado', seed: 205, intensity: 0.8 }),
      T('Semana', 'SEMANA 11 · 10 a 16 de março de 1986', { x: 110, y: 90, w: 1020, h: 60 }, { family: 'Oswald', size: 40, bold: true, color: '#1d1b24', style: 'clean', wear: 0, field: 'Semana' }),
      ...['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].flatMap((d, i) => [
        T(`${d} (dia)`, d.toUpperCase(), { x: 110, y: 200 + i * 205, w: 220, h: 40 }, { family: 'Oswald', size: 28, color: '#7a1f1f', style: 'clean', wear: 0 }),
        RULE(110, 200 + (i + 1) * 205 - 12, 1020, { color: '#9a958a', weight: 1.2, name: `Linha ${d}` }),
      ]),
      T('Compromissos', '8h — Reunião com o Dr. Brandão (cartório)\n14h — Buscar fotos reveladas\n\n10h — Dentista\n19h — Jantar na casa da Tia Dalva\n\n9h — Ligar para o IML\n16h — Visita ao Solar dos Pinhais\n\n12h — Almoço com Arnaldo\n\n20h — Teatro (poltrona 14)\n\nChácara — levar lanterna\n\nMissa 10h', { x: 340, y: 200, w: 790, h: 1400 }, { family: 'Caveat', size: 40, color: '#1c2a5a', style: 'handwriting', wear: 0.2, lh: 1.5, field: 'Compromissos' }),
      IMG('Círculo no compromisso', 'casa-rabisco-circulo-simples', { x: 330, y: 1060, w: 560, h: 150 }, { blend: 'multiply', opacity: 0.9 }), IMG('Riscado', 'casa-rabisco-risco-reto', { x: 340, y: 300, w: 520, h: 70 }, { blend: 'multiply', opacity: 0.8 }),
    ],
  }),
  modelo({
    slug: 'capa-diario-couro', name: 'Capa de diário de couro', category: 'Cadernos, diários e livros', page: { width: 1100, height: 1500 }, background: '#3a2f25', era: '1890', tom: 'horror', tags: ['diário', 'capa', 'couro', 'objeto'],
    layers: [
      IMG('Mesa', 'casa-superficie-wood060', { x: 0, y: 0, w: 1100, h: 1500 }),
      BOX('Sombra da capa', { x: 110, y: 130, w: 880, h: 1260 }, { fill: '#000000', opacity: 0.45, radius: 30 }),
      IMG('Couro', 'casa-superficie-leather026', { x: 90, y: 100, w: 880, h: 1260 }),
      BOX('Borda de costura', { x: 130, y: 140, w: 800, h: 1180 }, { stroke: '#d8b66a', weight: 3, dash: [14, 10], opacity: 0.8 }), BOX('Lombada', { x: 90, y: 100, w: 70, h: 1260 }, { fill: '#000000', opacity: 0.35 }),
      ...aging('usado', { seed: 206, intensity: 0.8, page: { width: 1100, height: 1500 } }).filter(l => l.kind === 'effect' || /Poeira/.test(l.name)),
      IMG('Etiqueta do título', 'casa-etiqueta-pasta', { x: 290, y: 330, w: 440, h: 200 }, { opacity: 0.95 }),
      T('Título', 'DIÁRIO', { x: 310, y: 380, w: 400, h: 90 }, { family: 'Old Standard TT', size: 56, bold: true, align: 'center', color: '#2a1f14', style: 'clean', wear: 0.1, field: 'Título' }),
      T('Dono', 'Pertence a Helena M. Pires', { x: 310, y: 1100, w: 460, h: 60 }, { family: 'La Belle Aurore', size: 44, align: 'center', color: '#d8b66a', style: 'handwriting', wear: 0.3, field: 'Dono' }),
      BOX('Fecho · fita', { x: 780, y: 620, w: 220, h: 60 }, { fill: '#2a1f14', radius: 10 }), BOX('Fecho · metal', { x: 930, y: 626, w: 56, h: 48 }, { fill: '#c9a24a', radius: 8, stroke: '#7a5a1a', weight: 2 }),
    ],
  }),
  // ---------------------------------------------------------------- Cartas e bilhetes
  modelo({
    slug: 'carta-amor-perfumada', name: 'Carta de amor · perfumada', category: 'Cartas e bilhetes', era: '1940', tom: 'cotidiano', tags: ['carta', 'amor', 'perfumada', 'manuscrito'],
    layers: [
      ...carta({ paper: 'papel-de-seda', age: 'usado', aging: 'usado', seed: 207, intensity: 0.7, font: 'Pinyon Script', size: 54, color: '#3a2a4a', top: 160, date: 'Santos, 3 de junho de 1943', greeting: 'Meu querido Henrique,', lh: 1.35, greetingField: 'Destinatário',
        body: 'Escrevo-te à luz da vela, porque a luz elétrica faltou outra vez e achei que assim as palavras ficam mais perto de ti. Não passa uma hora sem que eu repare no teu lugar vazio à mesa. Guardei o lenço que me deixaste e o perfume dele já quase se foi, mas ainda o respiro antes de dormir. Volta logo, e volta inteiro, que eu não sei amar-te de outro modo senão à espera.',
        closing: 'Para sempre tua,', signature: 'Lúcia', signFont: 'Great Vibes',
        extras: [BOX('Marca de batom', { x: 760, y: 1450, w: 130, h: 60 }, { type: 'ellipse', fill: '#9c1c2b', opacity: 0.55, blend: 'multiply', rot: -12 }), BOX('Marca de batom · detalhe', { x: 790, y: 1462, w: 70, h: 12 }, { type: 'ellipse', fill: '#6a0f1c', opacity: 0.5, blend: 'multiply', rot: -12 })] }),
    ],
  }),
  modelo({
    slug: 'carta-despedida', name: 'Carta de despedida', category: 'Cartas e bilhetes', era: 'hoje', tom: 'cotidiano', tags: ['carta', 'despedida', 'manuscrito'],
    layers: [
      ...carta({ paper: 'caderno', age: 'novo', aging: null, seed: 208, font: 'Gloria Hallelujah', size: 36, color: '#22304f', top: 170, date: '12/03', greeting: 'Mãe,', lh: 1.5, greetingField: 'Destinatário',
        body: 'não me procura. Eu tentei explicar mil vezes e você nunca escutou, então vou escrever. Peguei a mala do pai e o dinheiro da gaveta, desculpa por isso. Vou pra casa da Bia, depois não sei. O que eu vi naquela casa velha eu não consigo contar. Só não deixa ninguém ir lá, por favor. Eu te amo, mesmo que você ache que não.',
        closing: 'Beijos,', signature: 'Duda',
        extras: [fx('Folha amassada', 'crumple', { blend: 'soft-light', opacity: 0.9, amount: 0.9, params: { creases: 30 }, seed: 31 }), fx('Dobras da folha', 'fold', { opacity: 0.3, amount: 0.6, params: { horizontal: 2, vertical: 2 }, seed: 32 }), fx('Marcas de lágrima', 'damp', { opacity: 0.2, amount: 0.4, params: { color: '#a0a5b5' }, seed: 33 }), IMG('Mancha de lágrima 1', 'casa-agua-umidade-3', { x: 520, y: 820, w: 170, h: 170 }, { blend: 'multiply', opacity: 0.5 })] }),
    ],
  }),
  modelo({
    slug: 'bilhete-ameaca-recortes', name: 'Bilhete de ameaça · recortes', category: 'Cartas e bilhetes', page: { width: 1300, height: 900 }, background: '#d9d4c7', era: '1980', tom: 'horror', tags: ['bilhete', 'ameaça', 'recortes', 'jornal'],
    layers: (() => {
      const palavras = ['SAIA', 'DA', 'CASA', 'ANTES', 'QUE', 'ELES', 'ACORDEM'];
      const larg = [240, 140, 250, 280, 160, 190, 330];
      let x = 70; let y = 130;
      const out = [];
      palavras.forEach((w, i) => {
        if (x + larg[i] > 1240) { x = 90 + (i % 2) * 40; y += 270; }
        const [family, bg, color, italic] = BLOCOS[i % BLOCOS.length];
        const rot = [-4, 3, -2, 5, -5, 2, -3][i];
        out.push(BOX(`Recorte ${i + 1} (papel)`, { x, y, w: larg[i], h: 210 }, { fill: bg, stroke: '#00000026', weight: 1.5, rot }));
        out.push(T(`Palavra ${i + 1}`, w, { x: x + 8, y: y + 28, w: larg[i] - 16, h: 150 }, { family, size: 104, bold: false, italic: false, color, align: 'center', style: 'clean', wear: 0.25, rot, field: `Palavra ${i + 1}` }));
        x += larg[i] + 36;
      });
      return [IMG('Papel', 'casa-papel-papel-maquina-novo', { x: 0, y: 0, w: 1300, h: 900 }), ...age('usado', 209, { width: 1300, height: 900 }, 0.7), ...out, IMG('Fita 1', 'casa-fita-crepe-curta', { x: 40, y: 20, w: 200, h: 75 }, { rot: -8 }), IMG('Fita 2', 'casa-fita-crepe-curta', { x: 1060, y: 800, w: 200, h: 75 }, { rot: 6 })];
    })(),
  }),
  modelo({
    slug: 'carta-em-codigo', name: 'Carta em código', category: 'Cartas e bilhetes', era: '1920', tom: 'investigação', tags: ['carta', 'código', 'cifra', 'enigma'],
    layers: [
      ...base({ paper: 'quadriculado', age: 'usado', aging: 'antigo', seed: 210, intensity: 0.6 }),
      T('Cabeçalho', 'CORRESPONDÊNCIA RESERVADA · NÃO ABRIR SEM O CÓDIGO', { x: 110, y: 100, w: 1020, h: 70 }, { family: 'Special Elite', size: 26, bold: true, align: 'center', color: '#1d1b24' }),
      T('Texto cifrado', cifrar('encontre a chave sob a pedra do poço e leia o terceiro livro antes da meia noite o vigia sabe mais do que diz cuide de Helena').split(' ').reduce((a, g, i) => a + g + (i % 5 === 4 ? '\n' : '  '), ''), { x: 150, y: 260, w: 940, h: 700 }, { family: 'Courier Prime', size: 40, bold: true, color: '#1d1b24', lh: 1.8, field: 'Texto cifrado', style: 'typewriter' }),
      T('Pista', 'chave: cada letra avança sete casas no alfabeto (A→H, B→I…) — mas o Z volta ao A', { x: 130, y: 1100, w: 650, h: 140 }, { family: 'Homemade Apple', size: 32, color: '#1c2a5a', style: 'handwriting', wear: 0.2, rot: -3, field: 'Pista' }),
      IMG('Seta da pista', 'casa-rabisco-seta-curva', { x: 560, y: 1000, w: 300, h: 120 }, { blend: 'multiply', rot: -20 }),
      T('Alfabeto parcial', 'A B C D E F G H I J K L M\nH I J K L M N O P Q R S T', { x: 130, y: 1290, w: 700, h: 90 }, { family: 'Courier Prime', size: 30, color: '#6a6a6a', style: 'clean', wear: 0.3, rot: 1 }),
    ],
  }),
  modelo({
    slug: 'cartao-natal', name: 'Cartão de Natal', category: 'Cartas e bilhetes', page: { width: 1200, height: 1500 }, background: '#2d5a3a', era: '1960', tom: 'cotidiano', tags: ['cartão', 'natal', 'festa'],
    layers: [
      IMG('Papel', 'casa-papel-cartolina-novo', { x: 0, y: 0, w: 1200, h: 1500 }), ...age('usado', 211, { width: 1200, height: 1500 }, 0.6),
      BOX('Borda vermelha', { x: 40, y: 40, w: 1120, h: 1420 }, { stroke: '#a3182b', weight: 18 }), BOX('Borda verde', { x: 74, y: 74, w: 1052, h: 1352 }, { stroke: '#2d5a3a', weight: 10 }),
      T('Saudação', 'Boas Festas', { x: 140, y: 120, w: 920, h: 160 }, { family: 'Great Vibes', size: 130, align: 'center', color: '#a3182b', style: 'clean', wear: 0.05 }),
      IMG('Moldura da ilustração', 'casa-moldura-fio-duplo-retangular', { x: 180, y: 330, w: 840, h: 640 }), FOTO('Ilustração', 'casa-foto-lugar-casarao-1895', { x: 205, y: 355, w: 790, h: 590 }, { field: 'Ilustração', filter: { sepia: 0.5, contrast: 0.1 } }),
      IMG('Ornamento', 'casa-ornamento-divisoria-estrelas', { x: 300, y: 1010, w: 600, h: 70 }, { blend: 'multiply', opacity: 0.7 }),
      T('Dedicatória', 'Para a querida Tia Dalva,\ncom os votos de um Natal feliz\ne um Ano Novo cheio de paz.\n\nDe Arnaldo, Odete e as crianças', { x: 200, y: 1100, w: 800, h: 260 }, { family: 'Pinyon Script', size: 46, align: 'center', color: '#1f3a28', style: 'handwriting', wear: 0.15, lh: 1.3, field: 'Dedicatória' }),
      IMG('Estrela 1', 'casa-marca-estrela', { x: 110, y: 330, w: 70, h: 70 }, { blend: 'multiply', opacity: 0.6 }), IMG('Estrela 2', 'casa-marca-estrela', { x: 1030, y: 900, w: 70, h: 70 }, { blend: 'multiply', opacity: 0.6 }),
    ],
  }),
  // ---------------------------------------------------------------- Jornal e impressos
  modelo({
    slug: 'pagina-revista', name: 'Página de revista', category: 'Jornal', era: '1970', tom: 'cotidiano', tags: ['revista', 'impresso', 'foto', 'colunas'],
    layers: [
      ...base({ paper: 'papel-fotografico', age: 'usado', aging: 'usado', seed: 212, intensity: 0.7 }),
      T('Título', 'O MISTÉRIO DO SOLAR', { x: 100, y: 90, w: 1040, h: 130 }, { family: 'Bebas Neue', size: 120, color: '#a3182b', style: 'clean', wear: 0.1, field: 'Título' }),
      T('Linha de apoio', 'A casa que ninguém ousa visitar, nas colinas de Vila Aurora', { x: 100, y: 230, w: 1040, h: 50 }, { family: 'Playfair Display', size: 32, italic: true, color: '#1d1b24', style: 'clean', wear: 0.05 }),
      FOTO('Foto', 'casa-foto-lugar-casarao-1895', { x: 100, y: 310, w: 1040, h: 560 }, { field: 'Foto', filter: { contrast: 0.15, saturation: -0.3 } }),
      T('Legenda', 'O casarão em 1971: janelas vedadas há mais de duas décadas. Foto de Paulo Rangel.', { x: 100, y: 880, w: 1040, h: 36 }, { family: 'Playfair Display', size: 20, italic: true, color: '#555555', style: 'clean', wear: 0 }),
      T('Texto (coluna 1)', 'Quem passa pela estrada velha de Vila Aurora ainda vê, ao longe, a silhueta do Solar dos Pinhais: duas torres, um telhado vencido, e um jardim que a hera engoliu. Os moradores evitam falar dele. "Em casa de gente séria não se fala disso", resume a dona de um armazém.', { x: 100, y: 960, w: 500, h: 600 }, { family: 'Libre Baskerville', size: 22, color: '#1d1b24', style: 'clean', wear: 0.08, lh: 1.45, field: 'Texto' }),
      T('Texto (coluna 2)', 'Nossa reportagem passou três dias na região. Colhemos relatos de luzes no porão, de passos e de um canto distante que, segundo o vigia, começa depois da meia-noite. A família proprietária, ouvida por telefone, preferiu não comentar. Na próxima edição: o que a polícia encontrou em 1954.', { x: 640, y: 960, w: 500, h: 600 }, { family: 'Libre Baskerville', size: 22, color: '#1d1b24', style: 'clean', wear: 0.08, lh: 1.45 }),
      T('Fólio', 'REVISTA PANORAMA · 54', { x: 100, y: 1650, w: 1040, h: 30 }, { family: 'Bebas Neue', size: 22, color: '#555555', style: 'clean', wear: 0 }),
    ],
  }),
  modelo({
    slug: 'panfleto-culto', name: 'Panfleto de culto', category: 'Jornal', era: '1980', tom: 'horror', org: 'irmandade', tags: ['panfleto', 'culto', 'xerox', 'convite'],
    layers: [
      ...base({ paper: 'papel-maquina', age: 'usado', aging: 'usado', seed: 213, intensity: 0.8 }),
      fx('Cópia de xerox', 'fade', { blend: 'multiply', opacity: 0.35, amount: 0.7, params: { color: '#bdbdb5' }, seed: 41 }), fx('Grão do xerox', 'grain', { blend: 'overlay', opacity: 0.5, amount: 0.7, params: { size: 1.4 }, seed: 42 }),
      IMG('Sigilo da Irmandade', 'casa-emblema-universo-irmandade-carimbo', { x: 390, y: 90, w: 460, h: 520 }, { blend: 'multiply', opacity: 0.9 }),
      T('Título', 'A LUA TRÍPLICE\nOLHA POR VOCÊ', { x: 110, y: 650, w: 1020, h: 230 }, { family: 'Cinzel', size: 72, bold: true, align: 'center', color: '#111111', style: 'clean', wear: 0.2, field: 'Título', lh: 1.2 }),
      T('Convite', 'Cansado de esperar respostas?\nVenha conhecer a Irmandade.\nReuniões abertas toda lua cheia, sem compromisso.\nTraga apenas o seu nome verdadeiro.', { x: 130, y: 920, w: 980, h: 330 }, { family: 'Courier Prime', size: 38, align: 'center', color: '#111111', lh: 1.5, field: 'Convite' }),
      T('Endereço', 'Estrada Velha, km 7 — Vila Aurora\nPortão dos fundos, 23h', { x: 130, y: 1320, w: 980, h: 120 }, { family: 'Courier Prime', size: 36, bold: true, align: 'center', color: '#111111', field: 'Endereço' }),
      T('Rodapé', 'Entrada franca · Não é necessário confirmar presença', { x: 110, y: 1560, w: 1020, h: 40 }, { family: 'Courier Prime', size: 24, align: 'center', color: '#333333', style: 'clean', wear: 0.2 }),
      IMG('Marca de grampo', 'casa-prendedor-grampo', { x: 70, y: 40, w: 110, h: 70 }, { rot: 45, opacity: 0.8 }),
    ],
  }),
  modelo({
    slug: 'cartaz-desaparecido', name: 'Cartaz de desaparecido', category: 'Jornal', era: '1990', tom: 'investigação', tags: ['cartaz', 'desaparecido', 'foto', 'destacável'],
    layers: [
      ...base({ paper: 'cartolina', age: 'usado', aging: 'usado', seed: 214, intensity: 0.9 }),
      T('Título', 'PROCURA-SE', { x: 90, y: 90, w: 1060, h: 150 }, { family: 'Bebas Neue', size: 150, bold: false, align: 'center', color: '#111111', style: 'clean', wear: 0.15 }),
      FOTO('Foto', RET.rapaz, { x: 110, y: 290, w: 480, h: 620 }, { field: 'Foto', filter: { contrast: 0.2, grayscale: 1 } }),
      T('Nome', 'Rodrigo\nFernandes Lessa', { x: 620, y: 300, w: 520, h: 170 }, { family: 'Oswald', size: 62, bold: true, color: '#111111', style: 'clean', wear: 0, field: 'Nome', lh: 1.1 }),
      T('Descrição', '17 anos · 1,75 m\ncabelos pretos, magro\nusava jaqueta jeans\ne um colar com chave', { x: 620, y: 500, w: 520, h: 260 }, { family: 'Courier Prime', size: 33, color: '#111111', lh: 1.4 }),
      T('Desde', 'Desapareceu em 02/09/1993,\nperto do Solar dos Pinhais.', { x: 620, y: 780, w: 520, h: 130 }, { family: 'Courier Prime', size: 30, bold: true, color: '#a3182b', lh: 1.3 }),
      T('Apelo', 'QUALQUER INFORMAÇÃO AJUDA. NÃO PRECISA SE IDENTIFICAR.', { x: 110, y: 960, w: 1020, h: 60 }, { family: 'Oswald', size: 34, align: 'center', color: '#111111', style: 'clean', wear: 0 }),
      T('Contato', 'LIGUE: (011) 5555-0184', { x: 110, y: 1030, w: 1020, h: 100 }, { family: 'Bebas Neue', size: 90, align: 'center', color: '#a3182b', style: 'clean', wear: 0.1, field: 'Contato' }),
      ...Array.from({ length: 8 }, (_, i) => [RULE(110 + i * 127.5, 1200, 0, { name: `Corte da tira ${i + 1}` }), T(`Tira ${i + 1}`, '(011) 5555-0184', { x: 110 + i * 127.5 + 20, y: 1220, w: 220, h: 56 }, { family: 'Courier Prime', size: 24, color: '#111111', style: 'clean', wear: 0.1, rot: 90 })]).flat().map(l => l.kind === 'shape' ? { ...l, height: 400, shape: { type: 'line', stroke: '#555555', strokeWidth: 1.4, dash: [8, 6] } } : { ...l, text: { ...l.text } }),
      RULE(110, 1200, 1020, { color: '#555555', weight: 1.6, name: 'Linha das tiras' }),
    ],
  }),
  modelo({
    slug: 'edicao-extra', name: 'Edição extra', category: 'Jornal', page: { width: 1240, height: 1754 }, background: '#d7c9a6', era: '1930', tom: 'investigação', org: 'gazeta', tags: ['jornal', 'extra', 'manchete'],
    layers: [
      ...base({ paper: 'papel-jornal', age: 'antigo', aging: 'antigo', seed: 215, intensity: 0.6 }),
      T('Nome do jornal', 'A Gazeta Metropolitana', { x: 100, y: 70, w: 1040, h: 110 }, { family: 'UnifrakturMaguntia', size: 90, align: 'center', color: '#1d1b24', style: 'clean', wear: 0.1 }),
      RULE(100, 190, 1040, { color: '#1d1b24', weight: 3 }), T('Data e preço', 'EDIÇÃO EXTRA · São Paulo, 11 de setembro de 1934 · 200 réis', { x: 100, y: 200, w: 1040, h: 36 }, { family: 'Old Standard TT', size: 20, align: 'center', color: '#1d1b24', style: 'clean', wear: 0 }),
      RULE(100, 244, 1040, { color: '#1d1b24', weight: 1.5 }),
      T('Manchete', 'DESABA O PORÃO DO SOLAR DOS PINHAIS!', { x: 100, y: 280, w: 1040, h: 360 }, { family: 'Playfair Display', bold: true, size: 112, align: 'center', color: '#111111', style: 'clean', wear: 0.2, lh: 1.05, field: 'Manchete' }),
      T('Subtítulo', 'Seis operários soterrados · Polícia isola a casa · Padre pede que ninguém se aproxime', { x: 100, y: 660, w: 1040, h: 90 }, { family: 'Playfair Display', size: 30, bold: true, align: 'center', color: '#1d1b24', style: 'clean', wear: 0.1 }),
      RULE(100, 770, 1040, { color: '#1d1b24', weight: 1.5 }),
      T('Texto', 'Às primeiras horas desta madrugada, parte do antigo porão do Solar dos Pinhais veio abaixo, soterrando seis operários que trabalhavam na reforma do casarão. Segundo o delegado Antônio Salgueiro, o desabamento deixou à mostra uma câmara de pedra, até então desconhecida, de cujo interior vieram "ruídos que não quero repetir". Os bombeiros trabalham desde as cinco horas, mas a entrada foi interditada por ordem superior. A reportagem de A Gazeta apurou que o proprietário, Sr. Cornélio de Albuquerque Pinhais, não foi localizado.', { x: 100, y: 800, w: 1040, h: 540 }, { family: 'Old Standard TT', size: 30, color: '#1d1b24', style: 'clean', wear: 0.1, lh: 1.4, field: 'Texto' }),
      IMG('Carimbo EXTRA', 'casa-carimbo-urgente', { x: 760, y: 1400, w: 380, h: 140 }, { blend: 'multiply', opacity: 0.85, rot: -8 }),
    ],
  }),
  modelo({
    slug: 'anuncio-funebre', name: 'Anúncio fúnebre', category: 'Jornal', page: { width: 900, height: 1300 }, background: '#d7c9a6', era: '1950', tom: 'cotidiano', org: 'gazeta', tags: ['jornal', 'fúnebre', 'obituário', 'convite'],
    layers: [
      ...base({ page: { width: 900, height: 1300 }, paper: 'papel-jornal', age: 'usado', aging: 'usado', seed: 216, intensity: 0.7 }),
      BOX('Tarja preta', { x: 50, y: 50, w: 800, h: 1200 }, { stroke: '#111111', weight: 22 }), BOX('Filete interno', { x: 90, y: 90, w: 720, h: 1120 }, { stroke: '#111111', weight: 3 }),
      T('Cruz', '✝', { x: 350, y: 140, w: 200, h: 200 }, { family: 'Old Standard TT', size: 170, align: 'center', color: '#111111', style: 'clean', wear: 0.1 }),
      T('Aviso', 'FALECEU', { x: 120, y: 360, w: 660, h: 60 }, { family: 'Old Standard TT', size: 40, align: 'center', color: '#111111', style: 'clean', wear: 0, bold: true }),
      T('Nome', 'Dona Carlota Marques\nde Alencar', { x: 120, y: 450, w: 660, h: 200 }, { family: 'Playfair Display', size: 56, bold: true, align: 'center', color: '#111111', style: 'clean', wear: 0.05, field: 'Nome', lh: 1.15 }),
      T('Datas', '* 11 de março de 1881\n† 20 de abril de 1958', { x: 120, y: 690, w: 660, h: 120 }, { family: 'Old Standard TT', size: 34, align: 'center', color: '#111111', style: 'clean', wear: 0.05, field: 'Datas' }),
      T('Convite', 'Seus filhos, netos e demais parentes convidam para a missa de sétimo dia, a realizar-se na Igreja Matriz de Vila Aurora, às 8 horas, e para o sepultamento no Cemitério da Consolação.', { x: 140, y: 850, w: 620, h: 280 }, { family: 'Old Standard TT', size: 28, align: 'center', color: '#111111', style: 'clean', wear: 0.05, lh: 1.4, field: 'Convite' }),
      T('Assinatura da família', 'A FAMÍLIA ENLUTADA', { x: 120, y: 1150, w: 660, h: 40 }, { family: 'Old Standard TT', size: 22, align: 'center', color: '#111111', style: 'clean', wear: 0 }),
    ],
  }),
  // ---------------------------------------------------------------- Escola e juventude
  modelo({
    slug: 'boletim-escolar', name: 'Boletim escolar', category: 'Escola e juventude', era: '1980', tom: 'cotidiano', org: 'colegio', tags: ['escola', 'boletim', 'notas', 'formulário'],
    layers: (() => {
      const t = { y: 600, size: 24, columns: [{ h: 'Disciplina', w: 400, key: 'd' }, { h: '1º bim.', w: 150, key: 'a', align: 'center' }, { h: '2º bim.', w: 150, key: 'b', align: 'center' }, { h: '3º bim.', w: 150, key: 'c', align: 'center' }, { h: 'Faltas', w: 170, key: 'f', align: 'center' }], rows: [
        { d: 'Português', a: '7,5', b: '8,0', c: '6,5', f: '3' }, { d: 'Matemática', a: '5,0', b: '4,5', c: '6,0', f: '5' }, { d: 'História', a: '9,0', b: '9,5', c: '10,0', f: '1' }, { d: 'Geografia', a: '8,0', b: '7,0', c: '7,5', f: '2' }, { d: 'Ciências', a: '6,5', b: '7,0', c: '8,5', f: '4' }, { d: 'Educação Física', a: '10,0', b: '10,0', c: '9,5', f: '0' }] };
      return [...formulario({ org: 'colegio', emblem: EMB('colegio'), paper: 'oficio-creme', age: 'usado', seed: 217, aging: 'usado', title: ['COLÉGIO ESTADUAL VISCONDE DE MAUÁ', 'BOLETIM ESCOLAR · ANO LETIVO DE 1984'], titleSize: 25,
        rows: [['Aluno', 'Rodrigo Fernandes Lessa'], ['Série', '8ª série B · turno da manhã'], ['Observações', 'Aluno distraído nas aulas de Matemática; participativo em História. Recomenda-se acompanhamento dos pais.', { col: 2 }]], signatures: [{ nome: 'Profa. Dalva Nunes', cargo: 'Professora' }, { nome: 'Secretaria', cargo: 'Carimbo da secretaria' }], signY: 1520,
        stamps: [{ id: 'casa-carimbo-br-protocolo', x: 800, y: 1250, size: 280, h: 190, rot: -6, opacity: 0.8 }], extras: tabela({ ...t, ink: '#1d1b24' }) })];
    })(),
  }),
  modelo({
    slug: 'prova-corrigida', name: 'Prova corrigida', category: 'Escola e juventude', era: '1990', tom: 'cotidiano', org: 'colegio', tags: ['escola', 'prova', 'correção', 'formulário'],
    layers: [
      ...base({ paper: 'almaco-de-prova', age: 'usado', aging: 'usado', seed: 218, intensity: 0.8 }),
      T('Cabeçalho', 'COLÉGIO ESTADUAL VISCONDE DE MAUÁ · PROVA DE HISTÓRIA · 2º BIM.', { x: 190, y: 90, w: 940, h: 60 }, { family: 'Courier Prime', size: 24, bold: true, color: '#1d1b24' }),
      T('Aluno', 'Nome: Rodrigo F. Lessa     Série: 8ª B     Data: 12/06/91', { x: 190, y: 160, w: 940, h: 44 }, { family: 'Shadows Into Light', size: 34, color: '#1c3a8a', style: 'handwriting', wear: 0.2, field: 'Aluno' }),
      T('Respostas', '1) A Proclamação da República aconteceu em 15 de novembro de 1889, quando o Marechal Deodoro derrubou o Império.\n\n2) A Lei Áurea foi assinada pela Princesa Isabel em 1888 e libertou os escravos, mas não deu terra nem trabalho pra eles.\n\n3) Os bandeirantes eram paulistas que entravam no sertão atrás de ouro e de índios pra escravizar.\n\n4) Não lembro direito, mas acho que foi o Getúlio.', { x: 190, y: 250, w: 940, h: 940 }, { family: 'Shadows Into Light', size: 36, color: '#1c3a8a', style: 'handwriting', wear: 0.2, lh: 1.45, field: 'Respostas' }),
      T('Correção 1', 'ótimo! ✓', { x: 900, y: 270, w: 220, h: 50 }, { family: 'Caveat', size: 40, color: '#c0141c', style: 'handwriting', wear: 0.15, rot: -4 }),
      T('Correção 2', 'faltou citar a Lei do Ventre Livre', { x: 760, y: 560, w: 370, h: 90 }, { family: 'Caveat', size: 34, color: '#c0141c', style: 'handwriting', wear: 0.15, rot: -3 }),
      T('Correção 4', 'getúlio ??  (-1,0)', { x: 700, y: 1150, w: 400, h: 60 }, { family: 'Caveat', size: 40, color: '#c0141c', style: 'handwriting', wear: 0.15, rot: 2 }),
      IMG('Risco na resposta 4', 'casa-rabisco-risco-ziguezague', { x: 190, y: 1110, w: 520, h: 80 }, { blend: 'multiply', opacity: 0.75 }),
      T('Professor', 'Prof. Teodoro Brandão', { x: 190, y: 1330, w: 520, h: 50 }, { family: 'Caveat', size: 38, color: '#c0141c', style: 'handwriting', wear: 0.15, rot: -2, field: 'Professor' }),
      T('Nota', '7,0', { x: 820, y: 1330, w: 260, h: 160 }, { family: 'Caveat', size: 150, bold: true, color: '#c0141c', style: 'handwriting', wear: 0.15, rot: -6, field: 'Nota' }),
      IMG('Círculo da nota', 'casa-rabisco-circulo-alto', { x: 760, y: 1310, w: 330, h: 200 }, { blend: 'multiply', opacity: 0.9 }),
    ],
  }),
  modelo({
    slug: 'bilhetinho-sala', name: 'Bilhetinho passado em sala', category: 'Escola e juventude', page: { width: 900, height: 1100 }, background: '#d7d2c6', era: '1990', tom: 'cotidiano', tags: ['bilhete', 'escola', 'dobrado', 'adolescente'],
    layers: [
      ...base({ page: { width: 900, height: 1100 }, paper: 'caderno', age: 'usado', aging: 'usado', seed: 219, intensity: 1.0 }),
      fx('Dobras em quatro', 'fold', { opacity: 0.7, amount: 0.9, params: { horizontal: 1, vertical: 1 }, seed: 51 }), fx('Amassado de bolso', 'crumple', { blend: 'soft-light', opacity: 0.6, amount: 0.7, params: { creases: 24 }, seed: 52 }),
      T('Texto', 'Nathália!!\n\nvc viu o Beto olhando pra vc na aula de ed. física??? ele tá MUITO a fim\nresponde aqui embaixo e passa pra Carol\nse a prof pegar eu morro\n\nbjs, Duda ♥', { x: 100, y: 130, w: 700, h: 600 }, { family: 'Shadows Into Light', size: 40, color: '#6a1f8a', style: 'handwriting', wear: 0.25, lh: 1.45, field: 'Texto' }),
      IMG('Coração', 'casa-marca-estrela', { x: 620, y: 780, w: 140, h: 140 }, { blend: 'multiply', opacity: 0.7, rot: 12 }), IMG('Rabisco · seta', 'casa-rabisco-seta-reta', { x: 130, y: 760, w: 380, h: 150 }, { blend: 'multiply', rot: 6 }),
      T('Resposta', 'resposta da Nath: "calma, ele só tava vendo o relógio 😳"', { x: 100, y: 940, w: 700, h: 120 }, { family: 'Indie Flower', size: 32, color: '#1c3a8a', style: 'handwriting', wear: 0.25, rot: -2 }),
    ],
  }),
  modelo({
    slug: 'carteirinha-estudante', name: 'Carteirinha de estudante', category: 'Escola e juventude', page: { width: 1300, height: 900 }, background: '#7a6a52', era: '1980', tom: 'cotidiano', org: 'colegio', tags: ['carteirinha', 'estudante', 'cartão', 'objeto', 'formulário'],
    layers: [
      IMG('Mesa', 'casa-superficie-wood026', { x: 0, y: 0, w: 1300, h: 900 }),
      BOX('Sombra', { x: 130, y: 150, w: 1040, h: 640 }, { fill: '#000000', opacity: 0.4, radius: 36, rot: 1 }),
      BOX('Cartão', { x: 110, y: 120, w: 1040, h: 640 }, { fill: '#f3efe2', radius: 34, stroke: '#cbc3a8', weight: 3, rot: 1 }), BOX('Faixa azul', { x: 110, y: 120, w: 1040, h: 130 }, { fill: '#1f3f7a', radius: 34, rot: 1 }), BOX('Faixa azul · base', { x: 110, y: 200, w: 1040, h: 50 }, { fill: '#1f3f7a', rot: 1 }),
      IMG('Emblema do colégio', EMB('colegio'), { x: 140, y: 126, w: 105, h: 120 }, { rot: 1 }),
      T('Título', 'COLÉGIO ESTADUAL VISCONDE DE MAUÁ\nCARTEIRA DE IDENTIFICAÇÃO ESTUDANTIL', { x: 270, y: 140, w: 840, h: 100 }, { family: 'Oswald', size: 30, bold: true, align: 'center', color: '#ffffff', style: 'clean', wear: 0, rot: 1 }),
      FOTO('Foto', RET.rapaz, { x: 150, y: 290, w: 270, h: 360 }, { field: 'Foto', rot: 1 }),
      T('Nome', 'NOME\nRodrigo Fernandes Lessa', { x: 470, y: 290, w: 640, h: 110 }, { family: 'Courier Prime', size: 32, color: '#1d1b24', field: 'Nome', rot: 1 }),
      T('Série', 'SÉRIE\n8ª B · Matutino', { x: 470, y: 430, w: 320, h: 100 }, { family: 'Courier Prime', size: 30, color: '#1d1b24', field: 'Série', rot: 1 }), T('Validade', 'VÁLIDA ATÉ\n31/12/1984', { x: 800, y: 430, w: 320, h: 100 }, { family: 'Courier Prime', size: 30, color: '#1d1b24', rot: 1 }),
      T('Número', 'Nº 84-0317', { x: 470, y: 560, w: 320, h: 60 }, { family: 'Courier Prime', size: 32, bold: true, color: '#a3182b', rot: 1, field: 'Número' }),
      IMG('Carimbo da secretaria', 'casa-carimbo-br-autenticado', { x: 860, y: 540, w: 210, h: 210 }, { blend: 'multiply', opacity: 0.7, rot: -8 }),
      fx('Reflexo do plástico', 'fade', { blend: 'screen', opacity: 0.25, amount: 0.5, params: { color: '#ffffff' }, seed: 61 }),
    ],
  }),
  modelo({
    slug: 'pagina-anuario', name: 'Página de anuário', category: 'Escola e juventude', era: '1970', tom: 'cotidiano', org: 'colegio', tags: ['anuário', 'escola', 'fotos', 'turma'],
    layers: [
      ...base({ paper: 'papel-fotografico', age: 'usado', aging: 'usado', seed: 220, intensity: 0.8 }),
      T('Título', 'TURMA 8ª B · 1974', { x: 110, y: 80, w: 1020, h: 90 }, { family: 'Cinzel', size: 64, bold: true, align: 'center', color: '#1f3f7a', style: 'clean', wear: 0.05 }),
      ...[RET.rapaz, RET.mulher, RET.bigode, RET.senhora, RET.hussardo, RET.oficial, RET.mulher, RET.rapaz, RET.bigode].flatMap((id, i) => {
        const x = 110 + (i % 3) * 350; const y = 220 + Math.floor(i / 3) * 400;
        const nomes = ['Rodrigo L.', 'Helena P.', 'Beto S.', 'Odete M.', 'Arnaldo C.', 'Paulo R.', 'Lúcia T.', 'Edmundo V.', 'Dalva N.'];
        return [FOTO(`Foto ${i + 1}`, id, { x, y, w: 320, h: 330 }, { field: i === 0 ? 'Fotos' : undefined, filter: { grayscale: 1, contrast: 0.12 + (i % 3) * 0.05 } }), T(`Nome ${i + 1}`, nomes[i], { x, y: y + 336, w: 320, h: 40 }, { family: 'Playfair Display', size: 26, italic: true, align: 'center', color: '#1d1b24', style: 'clean', wear: 0.05, field: i === 0 ? 'Nomes' : undefined })];
      }),
      T('Dedicatória', '"Aos que ficam, a saudade; aos que vão, a esperança."\n— Turma de 74', { x: 130, y: 1470, w: 980, h: 110 }, { family: 'Great Vibes', size: 48, align: 'center', color: '#1f3f7a', style: 'handwriting', wear: 0.1, field: 'Dedicatória' }),
      IMG('Ornamento', 'casa-ornamento-divisoria-florete', { x: 340, y: 1400, w: 560, h: 60 }, { blend: 'multiply', opacity: 0.6 }),
    ],
  }),
];
