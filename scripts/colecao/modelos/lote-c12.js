/**
 * Lote C12 · Manuscritos de autor: cada modelo tem a identidade de quem escreveu (papel, letra, tinta, marcas
 * de uso), para que documentos de uma mesma campanha não saiam todos iguais. Inclui rituais no padrão de
 * Ordem Paranormal (sigilo + palavra + componentes). Não passam por variacoes.js: cada um já é uma peça só.
 */
import { T, IMG, RULE, BOX, TRACO, base, modelo } from './montagem.js';

const TAU = Math.PI * 2;
/** Pontos de um círculo (0–1 dentro da caixa). */
const circ = (cx, cy, r, n = 48, ry = r) => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos(i / n * TAU), cy + ry * Math.sin(i / n * TAU)]);
/** Arco de x0 a x1 com flecha h (negativa sobe). */
const arco = (x0, x1, y, h, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [x0 + (x1 - x0) * t, y + h * Math.sin(Math.PI * t)]; });
const chama = (cx, top, bot, w) => [[cx, bot], [cx - w, bot - (bot - top) * 0.25], [cx - w * 0.9, bot - (bot - top) * 0.55], [cx - w * 0.3, bot - (bot - top) * 0.75], [cx, top], [cx + w * 0.3, bot - (bot - top) * 0.7], [cx + w * 0.95, bot - (bot - top) * 0.5], [cx + w, bot - (bot - top) * 0.22], [cx, bot]];
/** Marca de família: um olho aberto sobre uma chama. */
const marcaOlho = (name, box, o = {}) => TRACO(name, box, [
  ...arco(0.08, 0.92, 0.32, -0.2), null, ...arco(0.08, 0.92, 0.32, 0.2), null, ...circ(0.5, 0.32, 0.1, 32), null,
  ...chama(0.5, 0.56, 0.98, 0.16),
], { color: '#3a2414', weight: 4, ...o });

const MAO = (family, size, color, extra = {}) => ({ family, size, color, style: 'handwriting', wear: 0.22, ...extra });
const P = (width, height) => ({ width, height });

/** Livro aberto em página dupla sobre a mesa. */
function livroAberto({ paper, age = 'antigo', wood = 'casa-superficie-wood026', spine = '#3a2a1a', w = 2000, h = 1300 }) {
  return [
    IMG('Mesa', wood, { x: 0, y: 0, w, h }),
    IMG('Página esquerda (papel)', `casa-papel-${paper}-${age}`, { x: 60, y: 50, w: w / 2 - 60, h: h - 100 }),
    IMG('Página direita (papel)', `casa-papel-${paper}-${age}`, { x: w / 2, y: 50, w: w / 2 - 60, h: h - 100 }),
    IMG('Mancha', 'casa-manchas-cafe-3', { x: 120, y: 900, w: 380, h: 300 }, { blend: 'multiply', opacity: 0.25 }),
    BOX('Sombra da lombada', { x: w / 2 - 70, y: 50, w: 140, h: h - 100 }, { fill: spine, opacity: 0.4, blend: 'multiply' }),
    BOX('Vinco central', { x: w / 2 - 3, y: 50, w: 6, h: h - 100 }, { fill: '#000000', opacity: 0.3 }),
  ];
}

const LYS = ['manuscrito', 'autor'];

export default [
  // ───────────── Cartas e bilhetes ─────────────
  modelo({
    slug: 'carta-pombo-correio', name: 'Carta fina de pombo-correio', category: 'Cartas e bilhetes', page: P(1100, 1400), era: '1878', tom: 'horror', tags: [...LYS, 'carta', 'pombo-correio'],
    layers: [
      ...base({ page: P(1100, 1400), paper: 'papel-de-seda', age: 'novo', aging: 'novo', seed: 801 }),
      IMG('Dobras', 'casa-dobras-2', { x: 0, y: 0, w: 1100, h: 1400 }, { blend: 'multiply', opacity: 0.45 }),
      T('Data', '3 de setembro de 1878', { x: 120, y: 110, w: 860, h: 60 }, { ...MAO('Pinyon Script', 40, '#1a1a2a'), align: 'right', field: 'Data' }),
      T('Destinatário', 'Sr. Albrecht,', { x: 120, y: 210, w: 860, h: 70 }, { ...MAO('Pinyon Script', 46, '#1a1a2a'), field: 'Destinatário' }),
      T('Texto', 'Conforme combinado, nosso representante seguirá viagem com o senhor. Aguardamos o material antes do fim do mês.', { x: 120, y: 310, w: 860, h: 760 }, { ...MAO('Pinyon Script', 40, '#1a1a2a'), lh: 1.35, field: 'Texto' }),
      T('Assinatura', '— R.', { x: 600, y: 1100, w: 380, h: 90 }, { ...MAO('Pinyon Script', 60, '#1a1a2a'), align: 'right', field: 'Assinatura' }),
      IMG('Lacre partido', 'casa-lacre-vermelho-brasao', { x: 80, y: 1180, w: 170, h: 170 }, { rot: 14 }),
    ],
  }),
  modelo({
    slug: 'bilhete-lapis-embrulho', name: 'Papel de embrulho escrito a lápis', category: 'Cartas e bilhetes', page: P(900, 1000), era: '1878', tom: 'cotidiano', tags: [...LYS, 'bilhete', 'lápis'],
    layers: [
      ...base({ page: P(900, 1000), paper: 'papel-de-embrulho', age: 'usado', aging: 'usado', seed: 802 }),
      IMG('Amassado', 'casa-amassados-2', { x: 0, y: 0, w: 900, h: 1000 }, { blend: 'multiply', opacity: 0.4 }),
      T('Texto', 'Botas — 6\nCarroça até a cidade — 4\nFalta 3.', { x: 90, y: 90, w: 720, h: 820 }, { ...MAO('Shadows Into Light', 44, '#1a1816', { wear: 0.2 }), lh: 1.35, field: 'Texto', rot: -1 }),
    ],
  }),
  modelo({
    slug: 'lista-kraft-tinta', name: 'Lista a tinta em papel kraft', category: 'Cartas e bilhetes', page: P(1000, 1200), era: '1878', tom: 'investigação', tags: [...LYS, 'lista', 'kraft'],
    layers: [
      ...base({ page: P(1000, 1200), paper: 'kraft', age: 'usado', aging: 'usado', seed: 803 }),
      IMG('Marca de dedo', 'casa-digitais-2', { x: 700, y: 950, w: 220, h: 200 }, { blend: 'multiply', opacity: 0.35 }),
      T('Texto', '2 cordas · 1 lampião e óleo · pão para o dia\n\nNão sair antes do sino.', { x: 90, y: 100, w: 820, h: 1000 }, { ...MAO('Nothing You Could Do', 38, '#20160e'), lh: 1.45, field: 'Texto' }),
    ],
  }),
  modelo({
    slug: 'diario-copista-dupla', name: 'Diário de letra caprichada · página dupla', category: 'Cadernos, diários e livros', page: P(2000, 1300), background: '#3a2a1a', era: '1858', tom: 'cotidiano', tags: [...LYS, 'diário', 'copista'],
    layers: [
      ...livroAberto({ paper: 'oficio-creme', age: 'antigo', wood: 'casa-superficie-wood060', spine: '#5a3a1a' }),
      marcaOlho('Marca de família (canto)', { x: 1780, y: 90, w: 90, h: 120 }, { color: '#5a3a1e', weight: 3, opacity: 0.7 }),
      T('Data', '1858', { x: 150, y: 90, w: 760, h: 50 }, { ...MAO('La Belle Aurore', 30, '#3b2412'), field: 'Data' }),
      T('Página esquerda', '2 de março\nHoje copiei duas páginas inteiras sem borrar.', { x: 150, y: 150, w: 760, h: 1060 }, { ...MAO('La Belle Aurore', 32, '#3b2412'), lh: 1.4, field: 'Página esquerda' }),
      T('Página direita', '18 de setembro\nNeva faz uma semana e ainda é setembro.', { x: 1090, y: 110, w: 760, h: 1100 }, { ...MAO('La Belle Aurore', 32, '#3b2412'), lh: 1.4, field: 'Página direita' }),
    ],
  }),
  modelo({
    slug: 'carta-letra-redonda', name: 'Carta de letra redonda, com mancha de água', category: 'Cartas e bilhetes', page: P(1100, 1600), era: '1852', tom: 'cotidiano', tags: [...LYS, 'carta', 'mancha-de-água'],
    layers: [
      ...base({ page: P(1100, 1600), paper: 'oficio-creme', age: 'antigo', aging: 'antigo', seed: 804, intensity: 0.8 }),
      IMG('Mancha de água', 'casa-agua-umidade-3', { x: 600, y: 1100, w: 480, h: 460 }, { blend: 'multiply', opacity: 0.45 }),
      T('Destinatário', 'Querida irmã,', { x: 110, y: 110, w: 880, h: 60 }, { ...MAO('Indie Flower', 38, '#2e1e14'), field: 'Destinatário' }),
      T('Texto', 'Você sabe o que aconteceu, mas não sabe tudo.', { x: 110, y: 190, w: 880, h: 1200 }, { ...MAO('Indie Flower', 32, '#2e1e14'), lh: 1.35, field: 'Texto' }),
      T('Assinatura', 'Tua irmã', { x: 600, y: 1420, w: 390, h: 80 }, { ...MAO('Indie Flower', 42, '#2e1e14'), align: 'right', field: 'Assinatura' }),
    ],
  }),
  // ───────────── Livros, registros e inscrições ─────────────
  modelo({
    slug: 'decalque-inscricao', name: 'Decalque a carvão de inscrição entalhada', category: 'Ocultismo', page: P(1300, 1100), background: '#1a1816', era: '1786', tom: 'investigação', tags: [...LYS, 'entalhe', 'decalque'],
    layers: [
      ...base({ page: P(1300, 1100), paper: 'papel-de-arroz', age: 'usado', aging: null, seed: 805 }),
      BOX('Carvão', { x: 30, y: 30, w: 1240, h: 1040 }, { fill: '#1c1a18', opacity: 0.9, blend: 'multiply', radius: 18 }),
      IMG('Fuligem', 'casa-sujeira-3', { x: 0, y: 0, w: 1300, h: 1100 }, { blend: 'screen', opacity: 0.25 }),
      marcaOlho('Marca de família', { x: 590, y: 70, w: 120, h: 160 }, { color: '#d8d0c0', weight: 6, opacity: 0.85 }),
      T('Título', 'AQUILO QUE É LEMBRADO NUNCA MORRE', { x: 90, y: 250, w: 1120, h: 80 }, { family: 'Uncial Antiqua', size: 46, color: '#e2dacb', align: 'center', style: 'clean', wear: 0.55, field: 'Título' }),
      RULE(250, 350, 800, { color: '#cfc6b4', weight: 3, name: 'Sulco' }),
      T('Texto', 'O que se escreve aqui não se apaga.', { x: 130, y: 380, w: 1040, h: 660 }, { family: 'Uncial Antiqua', size: 38, color: '#ddd5c6', align: 'center', style: 'clean', wear: 0.55, lh: 1.4, field: 'Texto' }),
    ],
  }),
  modelo({
    slug: 'cronica-livro-grosso', name: 'Crônica em livro grosso, letra antiga', category: 'Cadernos, diários e livros', page: P(1240, 1700), background: '#2a1c12', era: '1786', tom: 'investigação', tags: [...LYS, 'crônica', 'livro'],
    layers: [
      ...base({ page: P(1240, 1700), paper: 'pergaminho', age: 'antigo', aging: 'antigo', seed: 806, intensity: 0.75 }),
      BOX('Margem pautada', { x: 150, y: 90, w: 940, h: 1500 }, { stroke: '#8a3a22', weight: 1.5, opacity: 0.5 }),
      T('Título', 'CRÔNICA · LIVRO PRIMEIRO', { x: 160, y: 110, w: 920, h: 80 }, { family: 'IM Fell DW Pica', size: 44, bold: true, color: '#7a2414', align: 'center', style: 'clean', wear: 0.25, field: 'Título' }),
      T('Texto', 'No primeiro ano subimos a montanha, quinze almas e mais o senhor…', { x: 170, y: 210, w: 900, h: 1180 }, { family: 'IM Fell DW Pica', size: 30, color: '#3a2212', style: 'handwriting', wear: 0.3, lh: 1.4, field: 'Texto' }),
      T('Nota na margem', 'T. E.', { x: 170, y: 1420, w: 900, h: 150 }, { family: 'IM Fell DW Pica', size: 24, italic: true, color: '#5a3a24', style: 'handwriting', wear: 0.3, lh: 1.3, field: 'Nota na margem' }),
    ],
  }),
  modelo({
    slug: 'copia-caderno-costurado', name: 'Cópia de copista em caderno costurado', category: 'Cadernos, diários e livros', page: P(1150, 1650), era: '1857', tom: 'investigação', tags: [...LYS, 'crônica', 'cópia'],
    layers: [
      ...base({ page: P(1150, 1650), paper: 'oficio-creme', age: 'usado', aging: 'usado', seed: 807 }),
      TRACO('Pontos de costura', { x: 40, y: 80, w: 30, h: 1490 }, Array.from({ length: 12 }, (_, i) => [[0.5, i / 12 + 0.01], [0.5, i / 12 + 0.05], null]).flat(), { color: '#6a5a44', weight: 3 }),
      T('Título', 'CRÔNICA · LIVRO PRIMEIRO', { x: 130, y: 100, w: 900, h: 60 }, { ...MAO('La Belle Aurore', 34, '#4a2a14'), align: 'center', field: 'Título' }),
      RULE(330, 172, 500, { color: '#4a2a14', weight: 1.5, name: 'Sublinhado' }),
      T('Texto', 'No mês de junho subimos a montanha…', { x: 130, y: 200, w: 900, h: 1230 }, { ...MAO('La Belle Aurore', 28, '#3b2412'), lh: 1.38, field: 'Texto' }),
      T('Notas', 'copiada no ano de 1857', { x: 130, y: 1470, w: 900, h: 110 }, { ...MAO('La Belle Aurore', 24, '#5a3a24'), align: 'center', field: 'Notas' }),
    ],
  }),
  modelo({
    slug: 'inventario-almaco-manuscrito', name: 'Inventário manuscrito em almaço', category: 'Cadernos, diários e livros', page: P(1240, 1700), era: '1849', tom: 'investigação', tags: [...LYS, 'inventário', 'almaço'],
    layers: [
      ...base({ page: P(1240, 1700), paper: 'almaco', age: 'antigo', aging: 'antigo', seed: 808, intensity: 0.6 }),
      marcaOlho('Marca de família', { x: 1050, y: 70, w: 90, h: 120 }, { color: '#2a2a3a', weight: 3 }),
      T('Título', 'Inventário dos Registros', { x: 100, y: 90, w: 930, h: 100 }, { ...MAO('Dawning of a New Day', 40, '#1f2238'), field: 'Título' }),
      RULE(100, 200, 1040, { color: '#1f2238', weight: 2, name: 'Fio' }),
      T('Texto', 'Livro grande · no atril da sala · 1 · bom', { x: 100, y: 230, w: 1040, h: 1220 }, { ...MAO('Dawning of a New Day', 32, '#1f2238'), lh: 1.5, field: 'Texto' }),
      T('Notas', 'Não se escreve aqui o que está embaixo.', { x: 100, y: 1480, w: 1040, h: 120 }, { ...MAO('Dawning of a New Day', 34, '#1f2238'), align: 'center', field: 'Notas' }),
    ],
  }),
  modelo({
    slug: 'recibo-papelaria-vitoriano', name: 'Recibo de papelaria vitoriana', category: 'Cotidiano', page: P(1000, 1400), era: '1851', tom: 'investigação', tags: [...LYS, 'recibo', 'papelaria'],
    layers: [
      ...base({ page: P(1000, 1400), paper: 'papel-de-recibo', age: 'antigo', aging: 'usado', seed: 809 }),
      T('Timbre', 'PAPELARIA E ENCADERNAÇÃO', { x: 70, y: 70, w: 860, h: 60 }, { family: 'Playfair Display', size: 40, bold: true, color: '#1a1a1a', align: 'center', style: 'typewriter', wear: 0.15, field: 'Timbre' }),
      T('Endereço', 'Rua dos Cordoeiros, 14 · papéis, couros, tintas e conserto de miudezas', { x: 70, y: 140, w: 860, h: 60 }, { family: 'Old Standard TT', size: 18, italic: true, color: '#2a2a2a', align: 'center', style: 'typewriter', wear: 0.15, field: 'Endereço' }),
      IMG('Fio do timbre', 'casa-ornamento-fio-jornal-grosso-fino', { x: 70, y: 210, w: 860, h: 30 }, { blend: 'multiply', opacity: 0.9 }),
      T('Cliente', 'Ao Sr. J. Albrecht', { x: 80, y: 260, w: 840, h: 90 }, { ...MAO('Homemade Apple', 26, '#2a1a10'), field: 'Cliente' }),
      T('Itens', 'Papel almaço, resma — 2', { x: 80, y: 370, w: 840, h: 600 }, { ...MAO('Homemade Apple', 24, '#2a1a10'), lh: 1.5, field: 'Itens' }),
      RULE(80, 990, 840, { color: '#2a2a2a', weight: 1.5, name: 'Fio do total' }),
      T('Total', 'Total: 14 xelins e 6 pence', { x: 80, y: 1005, w: 840, h: 60 }, { ...MAO('Homemade Apple', 28, '#2a1a10'), align: 'right', field: 'Total' }),
      T('Data', 'Março de 1851', { x: 80, y: 1080, w: 400, h: 50 }, { ...MAO('Homemade Apple', 24, '#2a1a10'), field: 'Data' }),
      T('Nota a lápis', 'Não aceito mais esse serviço.', { x: 470, y: 1150, w: 470, h: 190 }, { ...MAO('Reenie Beanie', 34, '#5a5a60', { wear: 0.45 }), rot: -4, lh: 1.15, field: 'Nota a lápis' }),
      IMG('Carimbo pago', 'casa-carimbo-pago', { x: 130, y: 1170, w: 240, h: 120 }, { rot: -8, blend: 'multiply', opacity: 0.7 }),
    ],
  }),
  modelo({
    slug: 'desenho-crianca-casa', name: 'Desenho de criança: a casa e o que tem embaixo', category: 'Escola e juventude', page: P(1240, 1600), era: '1847', tom: 'horror', tags: [...LYS, 'desenho', 'criança'],
    layers: [
      ...base({ page: P(1240, 1600), paper: 'caderno', age: 'antigo', aging: 'usado', seed: 810 }),
      T('Título', 'a minha casa', { x: 100, y: 70, w: 1040, h: 80 }, { ...MAO('Indie Flower', 52, '#2a2a6a'), align: 'center', field: 'Título' }),
      TRACO('Casa', { x: 380, y: 170, w: 480, h: 420 }, [[0.05, 0.42], [0.5, 0.02], [0.95, 0.42], null, [0.1, 0.4], [0.1, 0.98], [0.9, 0.98], [0.9, 0.4], null, [0.4, 0.98], [0.4, 0.62], [0.6, 0.62], [0.6, 0.98]], { color: '#6a3a1a', weight: 6 }),
      marcaOlho('Olho na porta', { x: 600, y: 440, w: 40, h: 55 }, { color: '#2a2a2a', weight: 3 }),
      TRACO('Família', { x: 160, y: 430, w: 210, h: 160 }, [...circ(0.15, 0.15, 0.08, 16), null, [0.15, 0.23], [0.15, 0.62], null, [0.03, 0.4], [0.27, 0.4], [0.5, 0.5], null, [0.15, 0.62], [0.05, 0.98], null, [0.15, 0.62], [0.25, 0.98], null, ...circ(0.5, 0.3, 0.07, 16), null, [0.5, 0.37], [0.5, 0.7], null, [0.5, 0.5], [0.73, 0.4], null, [0.5, 0.7], [0.42, 0.98], null, [0.5, 0.7], [0.58, 0.98], null, ...circ(0.85, 0.15, 0.08, 16), null, [0.85, 0.23], [0.85, 0.62], null, [0.73, 0.4], [0.97, 0.4], null, [0.85, 0.62], [0.75, 0.98], null, [0.85, 0.62], [0.95, 0.98]], { color: '#1a3a7a', weight: 4 }),
      TRACO('Linha grossa', { x: 90, y: 640, w: 1060, h: 20 }, [[0, 0.5], [0.3, 0.3], [0.6, 0.6], [1, 0.4]], { color: '#1a1a1a', weight: 14 }),
      TRACO('Escada comprida', { x: 520, y: 670, w: 200, h: 430 }, Array.from({ length: 10 }, (_, i) => [[0.1, i / 10], [0.9, i / 10], [0.9, (i + 1) / 10]]).flat(), { color: '#4a4a4a', weight: 4 }),
      TRACO('Sala dos dormidos', { x: 120, y: 1100, w: 700, h: 330 }, [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0], null,
        ...[0.08, 0.38, 0.68].flatMap(x => [[x, 0.15], [x + 0.24, 0.15], [x + 0.24, 0.4], [x, 0.4], [x, 0.15], null, [x + 0.03, 0.3], [x + 0.2, 0.3], null]),
        ...[0.08, 0.38, 0.68].flatMap(x => [[x, 0.55], [x + 0.24, 0.55], [x + 0.24, 0.8], [x, 0.8], [x, 0.55], null, [x + 0.03, 0.7], [x + 0.2, 0.7], null])], { color: '#5a4a3a', weight: 4 }),
      BOX('Porta preta', { x: 880, y: 1110, w: 220, h: 320 }, { fill: '#121212', opacity: 0.92 }),
      TRACO('Correntes', { x: 870, y: 1110, w: 240, h: 320 }, [[0, 0], [1, 1], null, [1, 0], [0, 1], null, [0, 0.33], [1, 0.66], null, [0, 0.66], [1, 0.33], null, [0.2, 0], [0.8, 1], null, [0.8, 0], [0.2, 1]], { color: '#7a7a7a', weight: 5 }),
      T('Texto', 'o lugar de baixo · os dormidos · o papai disse que nao', { x: 100, y: 1460, w: 1040, h: 110 }, { ...MAO('Indie Flower', 36, '#2a2a6a'), align: 'center', field: 'Texto' }),
    ],
  }),
  modelo({
    slug: 'caderno-memoria-perdida', name: 'Caderno de quem está esquecendo · página dupla', category: 'Cadernos, diários e livros', page: P(2000, 1300), background: '#2a2018', era: '1852', tom: 'horror', tags: [...LYS, 'caderno', 'memória'],
    layers: [
      ...livroAberto({ paper: 'caderno', age: 'antigo', wood: 'casa-superficie-wood026' }),
      IMG('Mancha', 'casa-agua-umidade-5', { x: 1450, y: 820, w: 420, h: 380 }, { blend: 'multiply', opacity: 0.35 }),
      T('Data', '1851 · 1852', { x: 140, y: 80, w: 780, h: 50 }, { ...MAO('Dawning of a New Day', 32, '#1f2238'), field: 'Data' }),
      T('Página esquerda', 'Novembro de 1851.', { x: 140, y: 140, w: 780, h: 1080 }, { ...MAO('Dawning of a New Day', 30, '#1f2238'), lh: 1.4, field: 'Página esquerda' }),
      T('Página direita', 'EU SEI O MEU NOME.', { x: 1080, y: 100, w: 780, h: 1100 }, { ...MAO('Rock Salt', 40, '#141414', { wear: 0.35 }), lh: 1.45, field: 'Página direita', rot: 2 }),
    ],
  }),
  modelo({
    slug: 'caderno-receitas-dupla', name: 'Caderno de receitas e trocas · página dupla', category: 'Cadernos, diários e livros', page: P(2000, 1300), background: '#3a2a1a', era: '1852', tom: 'cotidiano', tags: [...LYS, 'receitas', 'cozinha'],
    layers: [
      ...livroAberto({ paper: 'kraft', age: 'antigo', wood: 'casa-superficie-wood060', spine: '#2a1a0a' }),
      IMG('Gordura', 'casa-manchas-cafe-6', { x: 640, y: 160, w: 300, h: 260 }, { blend: 'multiply', opacity: 0.4 }),
      IMG('Farinha', 'casa-sujeira-2', { x: 1100, y: 900, w: 500, h: 300 }, { blend: 'screen', opacity: 0.25 }),
      T('Data', '1851 · 1852', { x: 140, y: 80, w: 780, h: 50 }, { ...MAO('Indie Flower', 30, '#3a2210'), field: 'Data' }),
      T('Página esquerda', 'Outono de 1851', { x: 140, y: 140, w: 780, h: 1080 }, { ...MAO('Indie Flower', 32, '#3a2210'), lh: 1.4, field: 'Página esquerda' }),
      T('Página direita', 'Inverno de 1852', { x: 1080, y: 100, w: 780, h: 1100 }, { ...MAO('Indie Flower', 32, '#3a2210'), lh: 1.4, field: 'Página direita' }),
    ],
  }),
  modelo({
    slug: 'carta-nobre-lacrada', name: 'Carta de nobre com lacre e cantoneiras', category: 'Cartas e bilhetes', era: '1802', tom: 'investigação', tags: [...LYS, 'carta', 'nobreza', 'lacre'],
    layers: [
      ...base({ paper: 'pergaminho', age: 'usado', aging: 'usado', seed: 811, intensity: 0.6 }),
      IMG('Canto', 'casa-ornamento-canto-filigrana', { x: 60, y: 60, w: 180, h: 180 }, { blend: 'multiply', opacity: 0.6 }),
      IMG('Canto 2', 'casa-ornamento-canto-filigrana', { x: 1000, y: 60, w: 180, h: 180 }, { blend: 'multiply', opacity: 0.6, rot: 90 }),
      T('Data', 'no porto, no ano de 1802', { x: 150, y: 180, w: 940, h: 50 }, { family: 'Cormorant Garamond', size: 30, italic: true, color: '#1a1410', align: 'right', style: 'handwriting', wear: 0.15, field: 'Data' }),
      T('Destinatário', 'Ao meu bom amigo', { x: 150, y: 250, w: 940, h: 90 }, { family: 'Cormorant Garamond', size: 32, italic: true, color: '#1a1410', style: 'handwriting', wear: 0.15, field: 'Destinatário' }),
      T('Texto', 'Meu bom amigo,', { x: 150, y: 360, w: 940, h: 1060 }, { family: 'Cormorant Garamond', size: 31, italic: true, color: '#1a1410', style: 'handwriting', wear: 0.15, lh: 1.3, field: 'Texto' }),
      T('Assinatura', 'R. de Montvalle', { x: 560, y: 1440, w: 560, h: 120 }, { family: 'Great Vibes', size: 66, color: '#1a1410', style: 'handwriting', wear: 0.15, align: 'right', field: 'Assinatura' }),
      IMG('Lacre', 'casa-lacre-vermelho-brasao', { x: 170, y: 1430, w: 200, h: 200 }, { rot: -6 }),
    ],
  }),
  modelo({
    slug: 'livro-registro-anual', name: 'Livro de registro anual em pergaminho', category: 'Cadernos, diários e livros', page: P(1240, 1600), era: '1817', tom: 'investigação', tags: [...LYS, 'subida', 'registro'],
    layers: [
      ...base({ page: P(1240, 1600), paper: 'pergaminho', age: 'usado', aging: 'antigo', seed: 812, intensity: 0.6 }),
      TRACO('Chama do ano', { x: 560, y: 70, w: 120, h: 150 }, chama(0.5, 0.05, 0.95, 0.35), { color: '#2e6a3a', weight: 5 }),
      T('Título', 'Registro do ano de 1817', { x: 120, y: 230, w: 1000, h: 80 }, { ...MAO('Kalam', 48, '#4a1a10'), align: 'center', field: 'Título' }),
      RULE(320, 318, 600, { color: '#4a1a10', weight: 2, name: 'Fio' }),
      T('Texto', 'Os que foram:', { x: 140, y: 350, w: 960, h: 980 }, { ...MAO('Kalam', 32, '#2e1c10'), lh: 1.45, field: 'Texto' }),
      T('Nota na margem', '—', { x: 140, y: 1360, w: 960, h: 180 }, { ...MAO('Kalam', 26, '#5a3a24'), lh: 1.3, field: 'Nota na margem', rot: -1 }),
    ],
  }),
  modelo({
    slug: 'livro-registro-pautado', name: 'Livro de registro pautado (nascimentos, óbitos)', category: 'Oficial e jurídico', page: P(1500, 1300), era: '1858', tom: 'investigação', tags: [...LYS, 'registro', 'nascidos', 'óbitos'],
    layers: [
      ...base({ page: P(1500, 1300), paper: 'almaco', age: 'antigo', aging: 'antigo', seed: 813, intensity: 0.7 }),
      BOX('Margem vermelha', { x: 150, y: 0, w: 3, h: 1300 }, { fill: '#a03030', opacity: 0.6 }),
      ...Array.from({ length: 22 }, (_, i) => RULE(60, 210 + i * 46, 1380, { color: '#8a9ab0', weight: 1, name: `Pauta ${i + 1}` })),
      T('Título', 'Livro dos Nascidos', { x: 170, y: 70, w: 1260, h: 90 }, { family: 'IM Fell English', size: 48, color: '#2a1a10', style: 'handwriting', wear: 0.25, field: 'Título' }),
      T('Texto', '1786 · Ana, de Pedro e Marta · cabelo preto · olhos castanhos', { x: 170, y: 176, w: 1260, h: 1060 }, { family: 'IM Fell English', size: 28, italic: true, color: '#2a1a10', style: 'handwriting', wear: 0.25, lh: 1.64, field: 'Texto' }),
    ],
  }),
  modelo({
    slug: 'folha-canto-neumas', name: 'Folha de canto copiado pelo som, com neumas', category: 'Cadernos, diários e livros', page: P(1240, 1500), era: '1858', tom: 'investigação', tags: [...LYS, 'canto', 'música'],
    layers: [
      ...base({ page: P(1240, 1500), paper: 'oficio-creme', age: 'antigo', aging: 'usado', seed: 814 }),
      ...[0, 1, 2, 3].map(i => TRACO(`Neumas ${i + 1}`, { x: 120, y: 112 + i * 204, w: 1000, h: 70 }, Array.from({ length: 14 }, (_, k) => { const x = 0.03 + k * 0.07; const y = 0.25 + 0.5 * Math.abs(Math.sin(k * 1.7 + i)); return [[x, y], [x + 0.03, y - 0.15], null]; }).flat(), { color: '#3b2412', weight: 4 })),
      T('Canto', 'ar · na · ve · ly', { x: 120, y: 190, w: 1000, h: 820 }, { ...MAO('La Belle Aurore', 34, '#3b2412'), lh: 3, field: 'Canto' }),
      RULE(120, 1020, 1000, { color: '#3b2412', weight: 2, name: 'Separação' }),
      T('Linha traduzida', 'o que dorme na luz…', { x: 120, y: 1050, w: 1000, h: 250 }, { ...MAO('La Belle Aurore', 32, '#3b2412'), lh: 1.4, field: 'Linha traduzida' }),
      T('Nota na margem', 'Não sei qual.', { x: 600, y: 1320, w: 540, h: 140 }, { ...MAO('La Belle Aurore', 28, '#6a4a30'), rot: -3, field: 'Nota na margem' }),
    ],
  }),
  modelo({
    slug: 'testamento-manuscrito', name: 'Testamento manuscrito com testemunhas', category: 'Oficial e jurídico', era: '1858', tom: 'cotidiano', tags: [...LYS, 'testamento', 'herança'],
    layers: [
      ...base({ paper: 'oficio-creme', age: 'antigo', aging: 'antigo', seed: 815, intensity: 0.7 }),
      IMG('Dobras', 'casa-dobras-3', { x: 0, y: 0, w: 1240, h: 1754 }, { blend: 'multiply', opacity: 0.4 }),
      T('Testador', 'Escrito no dia 10 de setembro de 1858', { x: 120, y: 110, w: 1000, h: 70 }, { ...MAO('Kalam', 34, '#141414', { bold: true }), field: 'Testador' }),
      T('Texto', 'Eu, abaixo assinado, em pleno juízo, deixo o que é meu…', { x: 120, y: 210, w: 1000, h: 1080 }, { ...MAO('Kalam', 33, '#141414'), lh: 1.42, field: 'Texto' }),
      T('Assinatura', 'O testador', { x: 600, y: 1330, w: 520, h: 100 }, { ...MAO('Kalam', 48, '#141414', { bold: true }), align: 'right', field: 'Assinatura' }),
      TRACO('Chama do guardião', { x: 520, y: 1320, w: 70, h: 100 }, chama(0.5, 0.05, 0.95, 0.4), { color: '#141414', weight: 4 }),
      T('Testemunhas', 'Testemunhas:', { x: 120, y: 1470, w: 1000, h: 160 }, { ...MAO('La Belle Aurore', 32, '#3b2412'), field: 'Testemunhas' }),
    ],
  }),
  modelo({
    slug: 'acordo-dois-lacres', name: 'Acordo em pergaminho com dois lacres', category: 'Oficial e jurídico', page: P(1240, 1600), era: '1803', tom: 'investigação', tags: [...LYS, 'acordo', 'contrato'],
    layers: [
      ...base({ page: P(1240, 1600), paper: 'pergaminho', age: 'antigo', aging: 'antigo', seed: 816, intensity: 0.7 }),
      T('Título', 'Acordo entre a vila e a Companhia de Minas', { x: 140, y: 100, w: 960, h: 140 }, { family: 'IM Fell DW Pica', size: 40, bold: true, color: '#3a2212', align: 'center', style: 'handwriting', wear: 0.25, field: 'Título' }),
      IMG('Ornamento', 'casa-ornamento-divisoria-florete', { x: 370, y: 250, w: 500, h: 50 }, { blend: 'multiply', opacity: 0.7 }),
      T('Local e data', 'Feito no dia 4 de julho de 1803', { x: 140, y: 310, w: 960, h: 50 }, { family: 'IM Fell DW Pica', size: 28, italic: true, color: '#3a2212', align: 'center', style: 'handwriting', wear: 0.25, field: 'Local e data' }),
      T('Texto', 'Fica acertado entre as partes o que segue.', { x: 150, y: 390, w: 940, h: 760 }, { family: 'IM Fell DW Pica', size: 31, color: '#3a2212', style: 'handwriting', wear: 0.3, lh: 1.42, field: 'Texto' }),
      T('Pela vila', 'Pela vila:', { x: 150, y: 1200, w: 440, h: 200 }, { family: 'IM Fell DW Pica', size: 26, italic: true, color: '#3a2212', style: 'handwriting', wear: 0.3, lh: 1.3, field: 'Pela vila' }),
      T('Pela Companhia', 'Pela Companhia:', { x: 650, y: 1200, w: 440, h: 200 }, { family: 'IM Fell DW Pica', size: 26, italic: true, color: '#3a2212', style: 'handwriting', wear: 0.3, lh: 1.3, field: 'Pela Companhia' }),
      IMG('Lacre da vila', 'casa-lacre-verde-liso', { x: 290, y: 1410, w: 150, h: 150 }, { rot: 8 }),
      IMG('Lacre da Companhia', 'casa-lacre-preto-liso', { x: 800, y: 1410, w: 150, h: 150 }, { rot: -5 }),
    ],
  }),
  modelo({
    slug: 'tres-papeis-soltos', name: 'Três papéis soltos sobre a mesa', category: 'Cartas e bilhetes', page: P(1400, 1500), background: '#2a2018', era: '1858', tom: 'cotidiano', tags: [...LYS, 'bilhetes', 'papéis'],
    layers: [
      IMG('Fundo', 'casa-superficie-wood026', { x: 0, y: 0, w: 1400, h: 1500 }),
      IMG('Papel 1', 'casa-papel-oficio-creme-antigo', { x: 80, y: 70, w: 760, h: 420 }, { rot: -3 }),
      IMG('Papel 2', 'casa-papel-papel-de-embrulho-usado', { x: 560, y: 520, w: 760, h: 420 }, { rot: 4 }),
      IMG('Papel 3', 'casa-papel-caderno-antigo', { x: 120, y: 990, w: 820, h: 440 }, { rot: -2 }),
      IMG('Dobras', 'casa-dobras-1', { x: 80, y: 70, w: 760, h: 420 }, { blend: 'multiply', opacity: 0.35, rot: -3 }),
      IMG('Mancha', 'casa-manchas-cafe-2', { x: 900, y: 600, w: 300, h: 260 }, { blend: 'multiply', opacity: 0.35 }),
      IMG('Digitais', 'casa-digitais-1', { x: 700, y: 1150, w: 200, h: 200 }, { blend: 'multiply', opacity: 0.3 }),
      T('Papel 1 (texto)', 'Primeiro papel', { x: 130, y: 110, w: 660, h: 340 }, { ...MAO('Gloria Hallelujah', 30, '#2a2a3a'), lh: 1.3, rot: -3, field: 'Primeiro' }),
      T('Papel 2 (texto)', 'Segundo papel', { x: 610, y: 560, w: 660, h: 340 }, { ...MAO('Gloria Hallelujah', 30, '#2a2a3a'), lh: 1.3, rot: 4, field: 'Segundo' }),
      T('Papel 3 (texto)', 'Terceiro papel', { x: 170, y: 1030, w: 720, h: 360 }, { ...MAO('Gloria Hallelujah', 30, '#2a2a3a'), lh: 1.3, rot: -2, field: 'Terceiro' }),
    ],
  }),
  modelo({
    slug: 'carta-fundacao-latim', name: 'Carta de fundação em latim, letra gótica', category: 'Ocultismo', background: '#2a1c12', era: '1239', tom: 'investigação', tags: [...LYS, 'pergaminho', 'latim', 'fundação'],
    layers: [
      ...base({ paper: 'pergaminho', age: 'antigo', aging: 'antigo', seed: 817, intensity: 1 }),
      IMG('Haste de cima', 'casa-objeto-hastes-pergaminho-topo', { x: 0, y: 0, w: 1240, h: 90 }),
      T('Título', 'CARTA PRIMORUM', { x: 130, y: 120, w: 980, h: 170 }, { family: 'Grenze Gotisch', size: 50, color: '#5a1410', align: 'center', style: 'clean', wear: 0.35, lh: 1.25, field: 'Título' }),
      T('Texto', 'Nos, qui primi ascendimus, haec iuramus…', { x: 140, y: 310, w: 960, h: 1080 }, { family: 'Grenze Gotisch', size: 30, color: '#2a1810', style: 'clean', wear: 0.4, lh: 1.4, field: 'Texto' }),
      T('Assinaturas', 'signa eorum qui iuraverunt', { x: 140, y: 1420, w: 960, h: 220 }, { family: 'Grenze Gotisch', size: 26, color: '#2a1810', style: 'clean', wear: 0.4, lh: 1.35, field: 'Assinaturas' }),
      T('Texto UV', 'quod rasum est', { x: 140, y: 1300, w: 960, h: 100 }, { family: 'Grenze Gotisch', size: 28, color: '#b8ffd0', style: 'clean', wear: 0.2, light: 'uv', field: 'Texto UV' }),
    ],
  }),
  modelo({
    slug: 'decalque-lapides', name: 'Decalque a carvão de lápides', category: 'Ocultismo', background: '#141210', era: '1239', tom: 'horror', tags: [...LYS, 'decalque', 'lápide', 'latim'],
    layers: [
      ...base({ paper: 'papel-de-arroz', age: 'usado', aging: null, seed: 818 }),
      BOX('Carvão', { x: 40, y: 40, w: 1160, h: 1674 }, { fill: '#191715', opacity: 0.9, blend: 'multiply', radius: 10 }),
      IMG('Fuligem', 'casa-sujeira-5', { x: 0, y: 0, w: 1240, h: 1754 }, { blend: 'screen', opacity: 0.22 }),
      IMG('Amassado', 'casa-amassados-3', { x: 0, y: 0, w: 1240, h: 1754 }, { blend: 'multiply', opacity: 0.45 }),
      IMG('Rasgo', 'casa-rasgos-2', { x: 900, y: 0, w: 340, h: 400 }, { blend: 'multiply', opacity: 0.5 }),
      ...[340, 640, 940, 1240].map((y, i) => RULE(140, y, 960, { color: '#4a4640', weight: 4, name: `Junta da laje ${i + 1}` })),
      T('Texto', 'HIC IACET', { x: 110, y: 110, w: 1020, h: 1530 }, { family: 'Cinzel', size: 34, color: '#e0d8c8', align: 'center', style: 'clean', wear: 0.6, lh: 1.55, field: 'Texto' }),
    ],
  }),
  modelo({
    slug: 'pagina-rito-sigilo', name: 'Página de rito com sigilo, palavra e componentes', category: 'Ocultismo', background: '#1a120c', era: '1238', tom: 'horror', tags: [...LYS, 'ritual', 'sigilo', 'ordem-paranormal'],
    layers: [
      ...base({ paper: 'pergaminho', age: 'antigo', aging: 'antigo', seed: 819, intensity: 0.9 }),
      T('Título', 'Do sono sob a luz', { x: 120, y: 90, w: 1000, h: 90 }, { family: 'UnifrakturMaguntia', size: 58, color: '#4a1410', align: 'center', style: 'clean', wear: 0.25, field: 'Título' }),
      TRACO('Sigilo', { x: 370, y: 210, w: 500, h: 500 }, [
        ...circ(0.5, 0.5, 0.46, 64), null, ...circ(0.5, 0.5, 0.38, 64), null,
        ...Array.from({ length: 12 }, (_, i) => { const a = i / 12 * TAU; return [[0.5 + 0.38 * Math.cos(a), 0.5 + 0.38 * Math.sin(a)], [0.5 + 0.46 * Math.cos(a), 0.5 + 0.46 * Math.sin(a)], null]; }).flat(),
        ...arco(0.28, 0.72, 0.38, 0.09), null, [0.33, 0.43], [0.3, 0.48], null, [0.5, 0.47], [0.5, 0.53], null, [0.67, 0.43], [0.7, 0.48], null,
        [0.24, 0.66], [0.36, 0.58], [0.5, 0.63], [0.64, 0.56], [0.78, 0.66], [0.62, 0.72], [0.5, 0.68], [0.36, 0.73], [0.24, 0.66],
      ], { color: '#5a1410', weight: 6 }),
      IMG('Sangue no sigilo', 'casa-sangue-4', { x: 600, y: 520, w: 180, h: 180 }, { blend: 'multiply', opacity: 0.55 }),
      T('Palavra', 'VAKA', { x: 120, y: 730, w: 1000, h: 90 }, { family: 'Uncial Antiqua', size: 64, color: '#5a1410', align: 'center', style: 'clean', wear: 0.3, field: 'Palavra' }),
      T('Componentes', 'a lâmina vermelha · a pedra moída · a cama de quem vigia', { x: 140, y: 830, w: 960, h: 90 }, { family: 'IM Fell English', size: 28, italic: true, color: '#3a2212', align: 'center', style: 'handwriting', wear: 0.3, lh: 1.3, field: 'Componentes' }),
      RULE(320, 930, 600, { color: '#5a1410', weight: 2, name: 'Fio' }),
      T('Texto', 'Para a febre que não passa…', { x: 150, y: 960, w: 940, h: 520 }, { family: 'IM Fell English', size: 30, color: '#2a1810', style: 'handwriting', wear: 0.3, lh: 1.42, field: 'Texto' }),
      T('Nota na margem', 'três noites · sarou.', { x: 600, y: 1500, w: 560, h: 200 }, { ...MAO('Reenie Beanie', 36, '#55555c', { wear: 0.4 }), rot: -4, lh: 1.15, field: 'Nota na margem' }),
    ],
  }),
  // ───────────── Outros autores ─────────────
  modelo({
    slug: 'carta-papel-embrulho', name: 'Carta tosca em papel de embrulho', category: 'Cartas e bilhetes', page: P(1000, 1300), era: '1878', tom: 'cotidiano', tags: [...LYS, 'carta', 'luto'],
    layers: [
      ...base({ page: P(1000, 1300), paper: 'papel-de-embrulho', age: 'usado', aging: 'usado', seed: 820 }),
      IMG('Aguardente', 'casa-manchas-cafe-5', { x: 520, y: 860, w: 420, h: 380 }, { blend: 'multiply', opacity: 0.5 }),
      IMG('Serragem', 'casa-sujeira-1', { x: 0, y: 0, w: 1000, h: 500 }, { blend: 'multiply', opacity: 0.3 }),
      T('Destinatário', 'Filho,', { x: 90, y: 90, w: 820, h: 70 }, { ...MAO('Reenie Beanie', 50, '#1e1a14', { wear: 0.35 }), field: 'Destinatário' }),
      T('Texto', 'hoje fez frio cedo de novo.', { x: 90, y: 170, w: 820, h: 880 }, { ...MAO('Reenie Beanie', 44, '#1e1a14', { wear: 0.35 }), lh: 1.25, field: 'Texto' }),
      T('Assinatura', '— teu pai', { x: 490, y: 1100, w: 420, h: 90 }, { ...MAO('Reenie Beanie', 50, '#1e1a14', { wear: 0.35 }), align: 'right', field: 'Assinatura' }),
    ],
  }),
  modelo({
    slug: 'bilhete-torto-garrafa', name: 'Bilhete torto com mancha de garrafa', category: 'Cartas e bilhetes', page: P(900, 600), era: '1878', tom: 'cotidiano', tags: [...LYS, 'bilhete', 'garrafa'],
    layers: [
      ...base({ page: P(900, 600), paper: 'papel-de-embrulho', age: 'antigo', aging: 'usado', seed: 821 }),
      IMG('Fundo de garrafa', 'casa-manchas-cafe-1', { x: 560, y: 300, w: 260, h: 260 }, { blend: 'multiply', opacity: 0.55 }),
      T('Texto', 'Ele não caiu. Eu devia ter ido junto.', { x: 70, y: 80, w: 760, h: 420 }, { ...MAO('Rock Salt', 46, '#141414', { wear: 0.45 }), lh: 1.4, rot: -5, field: 'Texto' }),
    ],
  }),
  modelo({
    slug: 'livro-receitas-botica', name: 'Livro de receitas de botica', category: 'Médico', page: P(1240, 1700), era: '1877', tom: 'horror', tags: [...LYS, 'botica', 'receitas'],
    layers: [
      ...base({ page: P(1240, 1700), paper: 'oficio-branco', age: 'usado', aging: 'usado', seed: 822 }),
      T('Timbre', 'BOTICA · RECEITUÁRIO', { x: 100, y: 70, w: 1040, h: 60 }, { family: 'Libre Baskerville', size: 34, bold: true, color: '#1a2a1a', align: 'center', style: 'typewriter', wear: 0.1, field: 'Timbre' }),
      IMG('Fio', 'casa-ornamento-fio-jornal-duplo', { x: 100, y: 140, w: 1040, h: 24 }, { blend: 'multiply' }),
      T('Título', 'Receitas de 1877', { x: 100, y: 180, w: 1040, h: 60 }, { ...MAO('Homemade Apple', 30, '#24302a'), field: 'Título' }),
      ...Array.from({ length: 21 }, (_, i) => RULE(100, 300 + i * 52, 1040, { color: '#b0b8b0', weight: 1, name: `Pauta ${i + 1}` })),
      T('Texto', 'L. · tosse com sangue · semanas', { x: 100, y: 258, w: 1040, h: 1100 }, { ...MAO('Homemade Apple', 26, '#24302a'), lh: 2, field: 'Texto' }),
      IMG('Carvão esfregado', 'casa-sujeira-4', { x: 100, y: 1390, w: 1040, h: 260 }, { blend: 'multiply', opacity: 0.55 }),
      T('Texto UV', 'sem tosse.', { x: 120, y: 1400, w: 1000, h: 230 }, { ...MAO('Homemade Apple', 28, '#c8ffd4'), light: 'uv', lh: 1.4, field: 'Texto UV' }),
    ],
  }),
  modelo({
    slug: 'registro-obitos-capela', name: 'Registro de óbitos de capela', category: 'Oficial e jurídico', page: P(1240, 1600), era: '1877', tom: 'investigação', tags: [...LYS, 'capela', 'óbitos', 'registro'],
    layers: [
      ...base({ page: P(1240, 1600), paper: 'oficio-creme', age: 'antigo', aging: 'usado', seed: 823 }),
      T('Cabeçalho', 'Registo de Óbitos da Capela', { x: 100, y: 80, w: 1040, h: 80 }, { family: 'UnifrakturMaguntia', size: 46, color: '#1a1a1a', align: 'center', style: 'typewriter', wear: 0.15, field: 'Cabeçalho' }),
      IMG('Ornamento', 'casa-ornamento-divisoria-estrelas', { x: 420, y: 170, w: 400, h: 40 }, { blend: 'multiply' }),
      IMG('Cera de vela', 'casa-manchas-cafe-7', { x: 80, y: 1250, w: 260, h: 240 }, { blend: 'multiply', opacity: 0.3 }),
      T('Texto', '1858', { x: 120, y: 240, w: 1000, h: 900 }, { family: 'IM Fell English', size: 32, italic: true, color: '#22180e', style: 'handwriting', wear: 0.25, lh: 1.45, field: 'Texto' }),
      T('Nota a lápis', 'Os corpos vieram fechados. Não me deixaram ver.', { x: 640, y: 1200, w: 520, h: 300 }, { ...MAO('Reenie Beanie', 38, '#55555c', { wear: 0.4 }), rot: -6, lh: 1.15, field: 'Nota a lápis' }),
    ],
  }),
  modelo({
    slug: 'diario-pastor', name: 'Diário de pastor', category: 'Cadernos, diários e livros', page: P(1100, 1500), era: '1858', tom: 'horror', tags: [...LYS, 'diário', 'pastor', 'capela'],
    layers: [
      ...base({ page: P(1100, 1500), paper: 'oficio-creme', age: 'antigo', aging: 'antigo', seed: 824, intensity: 0.8 }),
      IMG('Umidade', 'casa-agua-umidade-2', { x: 0, y: 1000, w: 1100, h: 500 }, { blend: 'multiply', opacity: 0.45 }),
      IMG('Feno preso', 'casa-sujeira-6', { x: 600, y: 0, w: 500, h: 400 }, { blend: 'multiply', opacity: 0.35 }),
      T('Data', 'fim de 1858', { x: 110, y: 100, w: 880, h: 60 }, { family: 'IM Fell English', size: 34, italic: true, color: '#1a1410', style: 'handwriting', wear: 0.25, align: 'right', field: 'Data' }),
      T('Texto', 'Enterrei hoje três caixões que não me deixaram abrir.', { x: 110, y: 190, w: 880, h: 1120 }, { family: 'IM Fell English', size: 32, italic: true, color: '#1a1410', style: 'handwriting', wear: 0.25, lh: 1.45, field: 'Texto' }),
    ],
  }),
  // ───────────── Rituais no padrão de Ordem Paranormal  ─────────────
  modelo({
    slug: 'ritual-entalhe-circulos', name: 'Ritual · Entalhe de chão com quatro círculos', category: 'Ocultismo', page: P(1300, 1300), background: '#2a2018', era: 'medieval', tom: 'horror', tags: ['ritual', 'sigilo', 'entalhe', 'ordem-paranormal'],
    layers: [
      IMG('Pedra', 'casa-scan-cardboard003', { x: 0, y: 0, w: 1300, h: 1300 }, { filter: 'grayscale(1) brightness(0.1)' }),
      IMG('Fuligem', 'casa-queimado-2', { x: 0, y: 0, w: 1300, h: 1300 }, { blend: 'multiply', opacity: 0.45 }),
      TRACO('Sigilo (X e círculos)', { x: 200, y: 200, w: 900, h: 900 }, [[0.12, 0.12], [0.88, 0.88], null, [0.88, 0.12], [0.12, 0.88], null,
        ...circ(0.1, 0.1, 0.08, 32), null, ...circ(0.9, 0.1, 0.08, 32), null, ...circ(0.1, 0.9, 0.08, 32), null, ...circ(0.9, 0.9, 0.08, 32), null, ...circ(0.5, 0.5, 0.05, 24)],
      { color: '#c8a070', weight: 10, opacity: 0.85 }),
      T('Inscrição', 'TRACE O CAMINHO', { x: 100, y: 1130, w: 1100, h: 110 }, { family: 'Uncial Antiqua', size: 46, color: '#ffffff', align: 'center', style: 'clean', wear: 0, field: 'Inscrição' }),
      T('Texto UV', '·', { x: 100, y: 60, w: 1100, h: 110 }, { family: 'Uncial Antiqua', size: 40, color: '#ffd8a0', align: 'center', style: 'clean', wear: 0.3, light: 'uv', field: 'Texto UV' }),
    ],
  }),
  modelo({
    slug: 'ritual-runa-raizes', name: 'Ritual · Runa de chão (raízes)', category: 'Ocultismo', page: P(1300, 1300), background: '#1c1a12', era: 'medieval', tom: 'horror', tags: ['ritual', 'sigilo', 'runa', 'ordem-paranormal'],
    layers: [
      IMG('Pedra', 'casa-scan-cardboard001', { x: 0, y: 0, w: 1300, h: 1300 }, { filter: 'grayscale(1) brightness(0.15)' }),
      IMG('Musgo', 'casa-agua-umidade-6', { x: 0, y: 700, w: 1300, h: 600 }, { blend: 'multiply', opacity: 0.5 }),
      TRACO('Sigilo (raiz)', { x: 300, y: 150, w: 700, h: 850 }, [
        ...circ(0.5, 0.45, 0.45, 64, 0.4), null, [0.5, 0.05], [0.5, 0.85], null,
        [0.5, 0.45], [0.25, 0.7], [0.15, 0.95], null, [0.5, 0.45], [0.75, 0.7], [0.85, 0.95], null,
        [0.5, 0.6], [0.35, 0.9], null, [0.5, 0.6], [0.65, 0.9], null, [0.5, 0.25], [0.3, 0.12], null, [0.5, 0.25], [0.7, 0.12]],
      { color: '#d0c8b0', weight: 10, opacity: 0.8 }),
      T('Inscrição', 'A VIDA ABRE O CAMINHO', { x: 100, y: 1080, w: 1100, h: 110 }, { family: 'Uncial Antiqua', size: 54, color: '#ffffff', align: 'center', style: 'clean', wear: 0.15, field: 'Inscrição' }),
    ],
  }),
  modelo({
    slug: 'ritual-seis-glifos', name: 'Ritual · Pergaminho com seis glifos', category: 'Ocultismo', page: P(1240, 1600), background: '#2a1c12', era: 'medieval', tom: 'investigação', tags: ['ritual', 'glifos', 'pergaminho'],
    layers: [
      ...base({ page: P(1240, 1600), paper: 'pergaminho', age: 'antigo', aging: 'antigo', seed: 830, intensity: 1 }),
      IMG('Queimado', 'casa-queimado-4', { x: 700, y: 1200, w: 540, h: 400 }, { blend: 'multiply', opacity: 0.6 }),
      T('Título', 'Na língua dos que vieram antes', { x: 120, y: 90, w: 1000, h: 80 }, { family: 'Uncial Antiqua', size: 44, color: '#4a2412', align: 'center', style: 'clean', wear: 0.35, field: 'Título' }),
      ...[
        ['Terra', [[0.15, 0.2], [0.85, 0.25], [0.8, 0.85], [0.2, 0.8], [0.15, 0.2], null, [0.15, 0.52], [0.82, 0.55]]],
        ['Rio', Array.from({ length: 25 }, (_, i) => [0.05 + i * 0.0375, 0.5 + 0.18 * Math.sin(i * 0.8)])],
        ['Árvore', [[0.5, 0.95], [0.5, 0.25], null, [0.5, 0.25], [0.25, 0.05], null, [0.5, 0.25], [0.5, 0.05], null, [0.5, 0.25], [0.75, 0.05]]],
        ['Montanha', [[0.1, 0.9], [0.45, 0.15], [0.5, 0.3], [0.55, 0.15], [0.9, 0.9], [0.1, 0.9]]],
        ['Nuvem', [...arco(0.1, 0.4, 0.6, -0.25), ...arco(0.4, 0.7, 0.6, -0.35), ...arco(0.7, 0.9, 0.6, -0.2)]],
        ['Sol', [...circ(0.5, 0.5, 0.18, 32), null, ...Array.from({ length: 8 }, (_, i) => { const a = i / 8 * TAU; return [[0.5 + 0.25 * Math.cos(a), 0.5 + 0.25 * Math.sin(a)], [0.5 + 0.38 * Math.cos(a), 0.5 + 0.38 * Math.sin(a)], null]; }).flat()]],
      ].map(([n, pts], i) => TRACO(`Glifo · ${n}`, { x: 140, y: 210 + i * 190, w: 160, h: 160 }, pts, { color: '#3a1a0e', weight: 7 })),
      T('Nomes', 'TALAMH\n\nABHAINN\n\nCRANN\n\nSLIABH\n\nSCAMALL\n\nGRIAN', { x: 360, y: 250, w: 760, h: 1130 }, { family: 'Uncial Antiqua', size: 44, color: '#3a1a0e', style: 'clean', wear: 0.35, lh: 2.16, field: 'Nomes' }),
      T('Texto UV', '·', { x: 140, y: 1400, w: 960, h: 140 }, { family: 'Uncial Antiqua', size: 36, color: '#c8ffd4', align: 'center', style: 'clean', wear: 0.2, light: 'uv', field: 'Texto UV' }),
    ],
  }),
];
