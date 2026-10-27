/**
 * Lote C10 · Saúde, ciência, oculto e fantasia (22 modelos novos): médico e sanatório, ciência e laboratório,
 * ocultismo, medieval e fantasia.
 */
import { A4, T, IMG, FOTO, RULE, BOX, TRACO, base, formulario, carta, tabela, modelo } from './montagem.js';
import { aging } from '../kit.js';

const RET = { bigode: 'casa-foto-retrato-homem-bigode-oculos', rapaz: 'casa-foto-retrato-rapaz-cdv', senhora: 'casa-foto-retrato-senhora-capa', hussardo: 'casa-foto-retrato-jovem-hussardo', oficial: 'casa-foto-retrato-oficial-sabre', mulher: 'casa-foto-retrato-mulher-sanfona' };
const EMB = org => `casa-emblema-universo-${org}`;
const fx = (name, type, o = {}) => ({ kind: 'effect', name, blend: o.blend || 'multiply', opacity: o.opacity ?? 0.4, effect: { type, seed: o.seed || 9, amount: o.amount ?? 0.5, params: o.params || {} } });
const age = (preset, seed, page, intensity = 1) => aging(preset, { seed, intensity, page });
const INK = '#2a1f14';

/** Linha irregular que sobe e desce (sismógrafo, gráfico de sinais), em 0–1. */
function onda(n, rand, amp = 0.3, calmo = 0.08) {
  let s = rand; const r = () => { s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909); s ^= s >>> 16; return (s >>> 0) / 4294967296; };
  return Array.from({ length: n }, (_, i) => { const t = i / (n - 1); const burst = Math.exp(-((t - 0.6) ** 2) / 0.012); return [t, Math.max(0.02, Math.min(0.98, 0.5 + (r() - 0.5) * (calmo + amp * burst) * 2))]; });
}

export default [
  // ---------------------------------------------------------------- Médico e sanatório
  modelo({
    slug: 'atestado-medico', name: 'Atestado médico', category: 'Médico', page: { width: 1000, height: 1400 }, background: '#d7d2c6', era: '1970', tom: 'cotidiano', tags: ['médico', 'atestado', 'receituário', 'formulário'],
    layers: [
      ...formulario({ page: { width: 1000, height: 1400 }, paper: 'oficio-branco', age: 'usado', seed: 301, aging: 'usado', font: 'Courier Prime', margin: 90, title: ['DR. MARCELO NOGUEIRA PINTO', 'CLÍNICA GERAL E DOENÇAS NERVOSAS · CRM-SP 18.442'], titleSize: 26, subtitle: 'Rua Barão de Itapetininga, 91 · 2º andar · Fone 37-2210', formTitle: 'ATESTADO',
        rows: [['Paciente', 'Edmundo Vaz Cavalcanti'], ['Dias', '5 (cinco) dias de repouso'], ['Data', '08 de maio de 1974'], ['Médico', 'Dr. Marcelo Nogueira Pinto', { col: 2 }]],
        sections: [{ h: 'Atesto', size: 24, field: 'Atestado', text: 'Atesto, para os devidos fins, que o Sr. acima nomeado esteve sob meus cuidados por esgotamento nervoso agudo, necessitando de afastamento de suas atividades habituais por cinco dias, a contar desta data. CID: F43.' }],
        signatures: [{ nome: 'M. Nogueira Pinto', cargo: 'Carimbo e assinatura do médico' }], signY: 1060, stamps: [{ id: 'casa-carimbo-br-medico-crm', x: 520, y: 1000, size: 360, h: 120, rot: -3, opacity: 0.85 }], footer: 'Receituário de uso exclusivo do médico' }),
    ],
  }),
  modelo({
    slug: 'ficha-triagem-sanatorio', name: 'Ficha de triagem do sanatório', category: 'Médico', era: '1930', tom: 'horror', org: 'sanatorio', tags: ['médico', 'sanatório', 'triagem', 'formulário'],
    layers: (() => {
      const t = { y: 940, size: 22, columns: [{ h: 'Aspecto avaliado', w: 520, key: 'a' }, { h: 'Ausente', w: 160, key: 'n', align: 'center' }, { h: 'Leve', w: 160, key: 'l', align: 'center' }, { h: 'Grave', w: 180, key: 'g', align: 'center' }], rows: [
        { a: 'Agitação psicomotora', n: '', l: 'X', g: '' }, { a: 'Delírios e alucinações', n: '', l: '', g: 'X' }, { a: 'Recusa de alimentos', n: 'X', l: '', g: '' }, { a: 'Insônia', n: '', l: '', g: 'X' }, { a: 'Ideias de perseguição', n: '', l: 'X', g: '' }] };
      return [...formulario({ org: 'sanatorio', emblem: EMB('sanatorio'), paper: 'oficio-creme', age: 'usado', seed: 302, aging: 'antigo', intensity: 0.6, title: ['SANATÓRIO DA SERRA DO MAR', 'FICHA DE TRIAGEM · ADMISSÃO'], titleSize: 26, font: 'Old Standard TT',
        rows: [['Paciente', 'Helena Marques de Alencar, 24 anos'], ['Admissão', '19 de abril de 1931'], ['Procedência', 'Vila Aurora, a pedido da família', { col: 2 }]], signatures: [{ nome: 'Dr. Augusto Vilela', cargo: 'Médico responsável', field: 'Médico' }], signY: 1590,
        stamps: [{ id: 'casa-carimbo-br-recebido-em', x: 800, y: 1330, size: 280, h: 200, rot: -6, opacity: 0.8 }],
        extras: [...tabela({ ...t, font: 'Old Standard TT', ink: INK, name: 'Avaliação' }), FOTO('Foto de admissão', RET.mulher, { x: 860, y: 90, w: 270, h: 340 }, { field: 'Foto', filter: { grayscale: 1, contrast: 0.2 } }), IMG('Presilha', 'casa-prendedor-clipe-prata-1', { x: 960, y: 60, w: 60, h: 110 })] })];
    })(),
  }),
  modelo({
    slug: 'desenho-paciente', name: 'Desenho de paciente', category: 'Médico', era: '1950', tom: 'horror', org: 'sanatorio', tags: ['médico', 'desenho', 'sanatório', 'rabiscos'],
    layers: [
      ...base({ paper: 'papel-de-embrulho', age: 'usado', aging: 'usado', seed: 303, intensity: 0.9 }),
      IMG('Desenho · olhos', 'casa-rabisco-olho-margem', { x: 140, y: 190, w: 420, h: 420 }, { blend: 'multiply', _field: 'Desenho' }), IMG('Desenho · rosto riscado', 'casa-rabisco-rosto-riscado', { x: 640, y: 160, w: 440, h: 484 }, { blend: 'multiply', rot: 4 }),
      IMG('Desenho · casa', 'casa-rabisco-mapa-rua', { x: 130, y: 700, w: 600, h: 414 }, { blend: 'multiply', rot: -3 }), IMG('Desenho · contagem', 'casa-rabisco-contagem-15', { x: 760, y: 790, w: 340, h: 118 }, { blend: 'multiply' }),
      T('Rabisco · texto', 'ELES OUVEM ELES OUVEM ELES OUVEM', { x: 130, y: 1180, w: 980, h: 80 }, { family: 'Permanent Marker', size: 44, color: '#2a2a2a', style: 'handwriting', wear: 0.35, rot: -1.5 }),
      BOX('Etiqueta clínica', { x: 120, y: 1370, w: 1000, h: 240 }, { fill: '#f3efe2', stroke: '#b8ab88', weight: 2, opacity: 0.95 }),
      T('Anotação clínica', 'Paciente nº 212 (H. M. A.). Desenho espontâneo, feito durante a noite do dia 3. Persistência do motivo ocular; a paciente afirma que "o desenho mexe quando ninguém olha". Dr. A. Vilela', { x: 145, y: 1390, w: 950, h: 200 }, { family: 'Courier Prime', size: 25, color: '#1d1b24', field: 'Anotação', lh: 1.35 }),
    ],
  }),
  modelo({
    slug: 'prontuario-cirurgia', name: 'Prontuário de cirurgia', category: 'Médico', era: '1980', tom: 'cotidiano', tags: ['médico', 'cirurgia', 'prontuário', 'formulário'],
    layers: [
      ...formulario({ paper: 'papel-de-fax', age: 'usado', seed: 304, aging: 'usado', font: 'Courier Prime', title: ['HOSPITAL DE CLÍNICAS DE VILA AURORA', 'CENTRO CIRÚRGICO · FICHA DE PROCEDIMENTO'], titleSize: 26, emblem: 'casa-emblema-medico-bastao',
        rows: [['Paciente', 'Edmundo Vaz Cavalcanti, 52 anos'], ['Procedimento', 'Apendicectomia de urgência'], ['Equipe', 'Dr. A. Vilela (cirurgião) · Dra. M. Reis (anestesia) · Enf. D. Nunes', { col: 2 }], ['Início', '03h12'], ['Término', '04h05']],
        signatures: [{ nome: 'A. Vilela', cargo: 'Cirurgião' }, { nome: 'M. Reis', cargo: 'Anestesista' }], signY: 1580,
        extras: [BOX('Diagrama · tronco', { x: 140, y: 920, w: 240, h: 420 }, { stroke: '#222', weight: 3, radius: 80, fill: '#00000008' }), BOX('Diagrama · incisão', { x: 242, y: 1180, w: 70, h: 8 }, { fill: '#b3261e', rot: 30 }), BOX('Diagrama · marcação', { x: 262, y: 1120, w: 56, h: 56 }, { type: 'ellipse', stroke: '#b3261e', weight: 3 }),
          T('Cronologia', '03h12 — indução anestésica\n03h20 — incisão\n03h41 — apêndice retirado\n03h58 — sutura\n04h05 — paciente estável', { x: 450, y: 920, w: 680, h: 300 }, { family: 'Courier Prime', size: 24, color: '#1d1b24', lh: 1.5 }),
          T('Observações', 'Sem intercorrências. Paciente relatou, ao despertar, "vozes no corredor" — atribuído ao efeito anestésico.', { x: 450, y: 1260, w: 680, h: 130 }, { family: 'Courier Prime', size: 22, color: '#1d1b24' })] }),
    ],
  }),
  modelo({
    slug: 'rotulo-remedio', name: 'Bula / rótulo de remédio', category: 'Médico', page: { width: 800, height: 1000 }, background: '#d7d2c6', era: '1920', tom: 'cotidiano', tags: ['remédio', 'rótulo', 'farmácia'],
    layers: [
      ...base({ page: { width: 800, height: 1000 }, paper: 'oficio-creme', age: 'usado', aging: 'antigo', seed: 305, intensity: 0.6 }),
      IMG('Moldura', 'casa-moldura-vitoriana-2', { x: 40, y: 40, w: 720, h: 920 }),
      T('Farmácia', 'PHARMACIA E DROGARIA\nSÃO GABRIEL', { x: 120, y: 120, w: 560, h: 110 }, { family: 'Old Standard TT', size: 38, bold: true, align: 'center', color: '#3a1f14', style: 'clean', wear: 0.05 }),
      IMG('Ornamento', 'casa-ornamento-divisoria-florete', { x: 200, y: 250, w: 400, h: 50 }, { blend: 'multiply', opacity: 0.7 }),
      T('Remédio', 'XAROPE\nDE PEITORAL', { x: 120, y: 330, w: 560, h: 200 }, { family: 'Playfair Display', size: 74, bold: true, align: 'center', color: '#2a1f14', style: 'clean', wear: 0.1, field: 'Remédio', lh: 1.1 }),
      T('Composição', 'Preparado com mel, eucalipto,\nagrião e extrato de ipecacuanha', { x: 120, y: 570, w: 560, h: 100 }, { family: 'Old Standard TT', size: 26, italic: true, align: 'center', color: '#3a1f14', style: 'clean', wear: 0.05 }),
      T('Posologia', 'Adultos: uma colher das de sopa\ntrês vezes ao dia, antes das refeições.\nCrianças: metade da dose.', { x: 120, y: 700, w: 560, h: 150 }, { family: 'Old Standard TT', size: 28, align: 'center', color: '#2a1f14', style: 'clean', wear: 0.05, field: 'Posologia', lh: 1.35 }),
      T('Rodapé', 'Agite antes de usar · Dr. Ismael Prado, pharmaceutico responsável', { x: 120, y: 880, w: 560, h: 50 }, { family: 'Old Standard TT', size: 18, align: 'center', color: '#3a1f14', style: 'clean', wear: 0.05 }),
      T('Número do remédio', 'Nº 3.114', { x: 560, y: 90, w: 160, h: 36 }, { family: 'Old Standard TT', size: 20, color: '#8a1414', style: 'clean', wear: 0.05, rot: 4 }),
    ],
  }),
  modelo({
    slug: 'exame-sangue', name: 'Exame de sangue', category: 'Médico', era: 'hoje', tom: 'cotidiano', tags: ['médico', 'exame', 'laboratório', 'formulário'],
    layers: (() => {
      const t = { y: 740, size: 23, columns: [{ h: 'Exame', w: 380, key: 'e' }, { h: 'Resultado', w: 200, key: 'r', align: 'center' }, { h: 'Unidade', w: 170, key: 'u', align: 'center' }, { h: 'Referência', w: 270, key: 'f', align: 'center' }], rows: [
        { e: 'Hemoglobina', r: '12,9', u: 'g/dL', f: '12,0 a 16,0' }, { e: 'Leucócitos', r: '18.400', u: '/mm³', f: '4.000 a 11.000' }, { e: 'Plaquetas', r: '212.000', u: '/mm³', f: '150.000 a 450.000' }, { e: 'Glicose em jejum', r: '88', u: 'mg/dL', f: '70 a 99' }, { e: 'Ferro sérico', r: '41', u: 'µg/dL', f: '60 a 170' }, { e: 'Creatinina', r: '0,9', u: 'mg/dL', f: '0,6 a 1,1' }] };
      return [...formulario({ paper: 'oficio-branco', age: 'novo', seed: 306, aging: 'novo', font: 'Inter', title: ['LABORATÓRIO CENTRAL DE ANÁLISES CLÍNICAS', 'RESULTADO DE EXAMES'], titleSize: 27, emblem: 'casa-emblema-medico-bastao',
        rows: [['Paciente', 'Duda Alencar Lessa'], ['Data da coleta', '12/03/2023'], ['Médico solicitante', 'Dra. Mariana Reis (CRM-SP 220.381)', { col: 2 }]], signatures: [{ nome: 'Dr. R. Prado', cargo: 'Responsável técnico' }], signY: 1560,
        extras: [...tabela({ ...t, font: 'Inter', ink: '#1d1b24', name: 'Resultados' }), BOX('Destaque do valor', { x: 102, y: 892, w: 1050, h: 42 }, { fill: '#ffe45a', opacity: 0.45, blend: 'multiply' }), IMG('Círculo no valor', 'casa-rabisco-circulo-simples', { x: 530, y: 880, w: 260, h: 74 }, { blend: 'multiply', opacity: 0.85 }), T('Nota do médico', 'repetir exame em 7 dias!', { x: 800, y: 940, w: 340, h: 60 }, { family: 'Caveat', size: 40, color: '#b3261e', style: 'handwriting', wear: 0.15, rot: -3 })] })];
    })(),
  }),
  // ---------------------------------------------------------------- Ciência e laboratório
  modelo({
    slug: 'relatorio-experimento', name: 'Relatório de experimento', category: 'Ciência e laboratório', era: '1960', tom: 'sci-fi', org: 'halden', tags: ['ciência', 'experimento', 'relatório', 'formulário'],
    layers: [
      ...formulario({ org: 'halden', emblem: EMB('halden'), paper: 'papel-maquina', seed: 311, aging: 'usado', title: ['INSTITUTO HALDEN DE BIOLOGIA EXPERIMENTAL', 'RELATÓRIO DE EXPERIMENTO Nº 41'], titleSize: 25,
        rows: [['Experimento', 'Resposta de culturas de Mycena a estímulo sonoro grave'], ['Responsável', 'Dr. Karl Halden'], ['Data', '08 de agosto de 1962']],
        sections: [{ h: '1. Método', field: 'Método', size: 21, text: 'Dez placas de cultura foram expostas a um tom de 38 Hz durante 30 minutos, a 18 °C e 90 % de umidade. Um grupo de controle permaneceu em silêncio.' }, { h: '2. Resultado', field: 'Resultado', size: 21, text: 'As placas expostas cresceram 4,2 vezes mais que as de controle e formaram filamentos em direção à fonte. Na placa 7 observou-se movimento visível a olho nu.' }],
        signatures: [{ nome: 'K. Halden', cargo: 'Diretor científico' }], signY: 1600,
        extras: [FOTO('Foto do laboratório', 'casa-foto-lugar-fabrica-obra', { x: 130, y: 1040, w: 480, h: 330 }, { filter: { grayscale: 1, contrast: 0.2 } }), BOX('Gráfico · eixo', { x: 700, y: 1060, w: 4, h: 300 }, { fill: '#222' }), BOX('Gráfico · base', { x: 700, y: 1360, w: 420, h: 4 }, { fill: '#222' }),
          BOX('Barra controle', { x: 740, y: 1290, w: 80, h: 70 }, { fill: '#9a9a9a' }), BOX('Barra A', { x: 850, y: 1160, w: 80, h: 200 }, { fill: '#2f5d6b' }), BOX('Barra B', { x: 960, y: 1100, w: 80, h: 260 }, { fill: '#2f5d6b' }), T('Legenda do gráfico', 'controle      38 Hz     38 Hz+', { x: 710, y: 1368, w: 420, h: 30 }, { family: 'Courier Prime', size: 17, style: 'clean', wear: 0 })] }),
    ],
  }),
  modelo({
    slug: 'ficha-cobaia', name: 'Ficha de cobaia', category: 'Ciência e laboratório', era: '1970', tom: 'horror', org: 'halden', tags: ['ciência', 'cobaia', 'registro', 'formulário'],
    layers: (() => {
      const t = { y: 840, size: 21, columns: [{ h: 'Dia', w: 90, key: 'd', align: 'center' }, { h: 'Peso', w: 130, key: 'p', align: 'center' }, { h: 'Observação', w: 800, key: 'o' }], rows: [
        { d: '1', p: '212 g', o: 'Comportamento normal. Apetite regular.' }, { d: '3', p: '208 g', o: 'Inquietude após o estímulo. Recusa parcial da ração.' }, { d: '5', p: '197 g', o: 'Não dorme; fica imóvel diante da parede norte da gaiola.' }, { d: '7', p: '180 g', o: 'Ataca o próprio reflexo. Pelagem escurecida na região dorsal.' }, { d: '9', p: '—', o: 'O animal olhou para o observador e repetiu o som do estímulo.' }] };
      return [...formulario({ org: 'halden', emblem: EMB('halden'), paper: 'oficio-creme', age: 'usado', seed: 312, aging: 'usado', title: ['INSTITUTO HALDEN DE BIOLOGIA EXPERIMENTAL', 'FICHA INDIVIDUAL DE COBAIA'], titleSize: 25,
        rows: [['Espécie', 'Rattus norvegicus (macho adulto)'], ['Cobaia nº', 'H-0417']], signatures: [{ nome: 'T. Moreira', cargo: 'Técnico responsável', field: 'Técnico' }], signY: 1600,
        extras: [FOTO('Foto', 'casa-foto-lugar-matriz-coluna', { x: 780, y: 330, w: 350, h: 330, }, { field: 'Foto', filter: { grayscale: 1, contrast: 0.3 } }), ...tabela({ ...t, ink: INK, name: 'Registro' }), T('Observação final', 'Encerrar o experimento imediatamente. — K. Halden', { x: 110, y: 1330, w: 1020, h: 70 }, { family: 'Caveat', size: 44, color: '#a3182b', style: 'handwriting', wear: 0.15, rot: -2 })] })];
    })(),
  }),
  modelo({
    slug: 'planta-laboratorio', name: 'Planta de laboratório', category: 'Ciência e laboratório', page: { width: 1700, height: 1200 }, background: '#1f4f8a', era: '1960', tom: 'sci-fi', org: 'halden', tags: ['ciência', 'planta', 'azul', 'laboratório'],
    layers: [
      IMG('Papel de planta', 'casa-papel-planta-azul-usado', { x: 0, y: 0, w: 1700, h: 1200 }), ...age('usado', 313, { width: 1700, height: 1200 }, 0.6),
      BOX('Planta · contorno', { x: 100, y: 130, w: 1100, h: 760 }, { stroke: '#e6f1fb', weight: 6 }), BOX('Planta · sala principal', { x: 100, y: 130, w: 640, h: 500 }, { stroke: '#e6f1fb', weight: 4 }), BOX('Planta · câmara', { x: 740, y: 130, w: 460, h: 330 }, { stroke: '#e6f1fb', weight: 4 }),
      BOX('Planta · depósito', { x: 740, y: 460, w: 460, h: 430 }, { stroke: '#e6f1fb', weight: 4 }), BOX('Planta · corredor', { x: 100, y: 630, w: 640, h: 260 }, { stroke: '#e6f1fb', weight: 4 }),
      BOX('Porta A', { x: 696, y: 600, w: 90, h: 8 }, { fill: '#1f4f8a', stroke: '#e6f1fb', weight: 2 }), BOX('Porta B', { x: 930, y: 440, w: 90, h: 8 }, { fill: '#1f4f8a', stroke: '#e6f1fb', weight: 2 }),
      BOX('Mesa de trabalho', { x: 180, y: 220, w: 300, h: 110 }, { stroke: '#e6f1fb', weight: 2, fill: '#ffffff10' }), BOX('Câmara de cultivo', { x: 860, y: 200, w: 220, h: 200 }, { stroke: '#e6f1fb', weight: 3, type: 'ellipse' }),
      RULE(100, 930, 1100, { color: '#e6f1fb', weight: 2, name: 'Cota horizontal' }), T('Cota', '18,40 m', { x: 560, y: 935, w: 180, h: 36 }, { family: 'Share Tech Mono', size: 24, color: '#e6f1fb', style: 'clean', wear: 0, align: 'center' }),
      T('Título', 'PLANTA BAIXA · PAVIMENTO SUBTERRÂNEO', { x: 100, y: 50, w: 1100, h: 50 }, { family: 'Share Tech Mono', size: 36, bold: true, color: '#e6f1fb', style: 'clean', wear: 0, field: 'Título' }),
      BOX('Quadro da legenda', { x: 1260, y: 130, w: 340, h: 760 }, { stroke: '#e6f1fb', weight: 3 }),
      T('Legenda', 'LEGENDA\n\n1  Sala principal\n2  Câmara de cultivo\n3  Depósito de amostras\n4  Corredor técnico\n\nEscala 1:50\nProjeto IHBE-114', { x: 1280, y: 150, w: 300, h: 720 }, { family: 'Share Tech Mono', size: 25, color: '#e6f1fb', style: 'clean', wear: 0, lh: 1.5, field: 'Legenda' }),
      T('Planta (campo)', 'Subsolo do Pavilhão B', { x: 1260, y: 940, w: 340, h: 40 }, { family: 'Share Tech Mono', size: 24, color: '#e6f1fb', style: 'clean', wear: 0, field: 'Planta' }),
      IMG('Carimbo de aprovação', 'casa-carimbo-aprovado', { x: 1290, y: 990, w: 300, h: 120 }, { blend: 'screen', opacity: 0.8, rot: -6 }),
    ],
  }),
  modelo({
    slug: 'caderno-pesquisa-uv', name: 'Caderno de pesquisa · UV', category: 'Ciência e laboratório', era: '1980', tom: 'sci-fi', org: 'halden', tags: ['ciência', 'caderno', 'luz negra', 'segredo'],
    layers: [
      ...base({ paper: 'quadriculado', age: 'usado', aging: 'usado', seed: 314, intensity: 0.8 }),
      T('Título', 'CADERNO DE PESQUISA · CULTURA H-0417', { x: 110, y: 90, w: 1020, h: 60 }, { family: 'Courier Prime', size: 28, bold: true, color: '#1d1b24' }),
      T('Anotações', '14/03 — taxa de crescimento: 4,2 cm/dia\nΔT = 18 °C → 22 °C: sem alteração\nf = 38 Hz  →  λ = v / f\n\nE = m·c²  (??)   — não tem nada a ver, mas anotei\n\npH 6,4 · umidade 91 % · luz: nenhuma\n\nA cultura reage à voz. Testar de novo amanhã.', { x: 130, y: 220, w: 980, h: 700 }, { family: 'Caveat', size: 44, color: '#1c2a5a', style: 'handwriting', wear: 0.2, lh: 1.45, field: 'Anotações' }),
      IMG('Seta', 'casa-rabisco-seta-curva', { x: 700, y: 760, w: 330, h: 140 }, { blend: 'multiply', rot: 10 }),
      T('Segredo UV', 'ELA RESPONDE EM LUZ.\nNÃO CONTAR AO DR. HALDEN.\nPorão B, parede norte, às 3h.', { x: 130, y: 1020, w: 980, h: 330 }, { family: 'Caveat', size: 62, bold: true, color: '#9dffb8', style: 'handwriting', wear: 0.1, light: 'uv', field: 'Segredo UV', rot: -2, lh: 1.3 }),
      IMG('Selo UV', 'casa-emblema-universo-halden-carimbo', { x: 820, y: 1360, w: 240, h: 272 }, { light: 'uv', blend: 'screen', opacity: 0.9 }),
    ],
  }),
  modelo({
    slug: 'grafico-sismografo', name: 'Gráfico de sismógrafo', category: 'Ciência e laboratório', era: '1980', tom: 'sci-fi', tags: ['ciência', 'sismógrafo', 'gráfico'],
    layers: [
      ...base({ paper: 'formulario-continuo', age: 'usado', aging: 'usado', seed: 315, intensity: 0.8 }),
      T('Cabeçalho', 'OBSERVATÓRIO SISMOLÓGICO DE VILA AURORA · REGISTRO CONTÍNUO', { x: 150, y: 110, w: 940, h: 70 }, { family: 'Courier Prime', size: 26, bold: true, color: '#1d1b24' }),
      T('Data', 'Data: 14/03/1983', { x: 150, y: 200, w: 450, h: 40 }, { family: 'Courier Prime', size: 26, color: '#1d1b24', field: 'Data' }),
      T('Leitura', 'Leitura: estação 3, componente vertical', { x: 150, y: 250, w: 940, h: 40 }, { family: 'Courier Prime', size: 26, color: '#1d1b24', field: 'Leitura' }),
      ...[0, 1, 2, 3].flatMap(i => [RULE(150, 420 + i * 260, 940, { color: '#9a9a9a', weight: 1, name: `Linha de base ${i + 1}` }), TRACO(`Registro ${i + 1}`, { x: 150, y: 330 + i * 260, w: 940, h: 180 }, onda(220, 40 + i * 7, 0.55 + i * 0.1, 0.06), { color: '#111111', weight: 2.2 })]),
      T('Marcação de hora', '00h          00h15          00h30          00h45', { x: 150, y: 1390, w: 940, h: 30 }, { family: 'Courier Prime', size: 18, color: '#555555', style: 'clean', wear: 0 }),
      T('Nota', 'abalo local, 00h26 — não registrado em outra estação!\nepicentro: Solar dos Pinhais?', { x: 260, y: 1440, w: 830, h: 110 }, { family: 'Caveat', size: 42, color: '#b3261e', style: 'handwriting', wear: 0.15, rot: -2, field: 'Nota' }),
      IMG('Círculo no pico', 'casa-rabisco-circulo-simples', { x: 640, y: 1010, w: 300, h: 140 }, { blend: 'multiply', opacity: 0.9 }),
    ],
  }),
  modelo({
    slug: 'memorando-interno', name: 'Memorando interno', category: 'Ciência e laboratório', era: '1970', tom: 'investigação', org: 'halden', tags: ['memorando', 'ciência', 'interno', 'formulário'],
    layers: [
      ...formulario({ org: 'halden', emblem: EMB('halden'), paper: 'papel-maquina', seed: 316, aging: 'usado', title: ['INSTITUTO HALDEN DE BIOLOGIA EXPERIMENTAL', 'MEMORANDO INTERNO'], titleSize: 26,
        rows: [['Para', 'Dr. Karl Halden', { col: 1 }], ['De', 'Dra. Ingrid Vasconcelos'], ['Assunto', 'Alteração no comportamento das culturas após o dia 14', { col: 2 }], ['Data', '17 de março de 1971']],
        sections: [{ h: 'Texto', field: 'Texto', size: 23, text: 'Venho por meio deste informar que as culturas do Pavilhão B apresentam, desde segunda-feira, atividade incompatível com o padrão esperado: movimento em resposta à presença humana e emissão de luz fraca durante a noite. Solicito autorização para suspender os trabalhos no subsolo até que a causa seja esclarecida. Peço ainda que este memorando não circule fora da diretoria.' }],
        signatures: [{ nome: 'I. Vasconcelos', cargo: 'Pesquisadora sênior' }], signY: 1330, extras: [{ ...{ kind: 'text', name: 'Rubrica 1', x: 1100, y: 1000, width: 130, height: 50, text: { content: 'K.H.', font: { family: 'Nothing You Could Do', library: 'casa-font-nothingyoucoulddo', weight: 400, italic: false }, size: 30, color: '#1c2a5a', align: 'left', lineHeight: 1.2, ink: { style: 'handwriting', wear: 0.2, seed: 5 } } } }, T('Despacho', 'NEGADO. Prosseguir. — K.H.', { x: 600, y: 1180, w: 520, h: 60 }, { family: 'Caveat', size: 46, color: '#a3182b', style: 'handwriting', wear: 0.15, rot: -3 })] }),
    ],
  }),
  // ---------------------------------------------------------------- Ocultismo
  modelo({
    slug: 'grimorio-pagina-dupla', name: 'Grimório · página dupla', category: 'Ocultismo', page: { width: 2000, height: 1300 }, background: '#2a2018', era: 'medieval', tom: 'horror', tags: ['grimório', 'ocultismo', 'livro aberto', 'ilustração'],
    layers: [
      IMG('Mesa', 'casa-superficie-wood060', { x: 0, y: 0, w: 2000, h: 1300 }),
      IMG('Página esquerda (papel)', 'casa-papel-pergaminho-antigo', { x: 60, y: 50, w: 940, h: 1200 }), IMG('Página direita (papel)', 'casa-papel-pergaminho-antigo', { x: 1000, y: 50, w: 940, h: 1200 }),
      ...age('antigo', 321, { width: 2000, height: 1300 }, 0.7),
      BOX('Sombra da lombada', { x: 940, y: 50, w: 120, h: 1200 }, { fill: '#2a1a0a', opacity: 0.45, blend: 'multiply' }),
      T('Título', 'DE VINCULIS UMBRARUM', { x: 160, y: 120, w: 740, h: 70 }, { family: 'Uncial Antiqua', size: 46, align: 'center', color: '#5a1a14', style: 'clean', wear: 0.1, field: 'Título' }),
      IMG('Sigilo', 'casa-simbolo-sigilo-3', { x: 220, y: 230, w: 620, h: 620 }, { blend: 'multiply', opacity: 0.85, _field: 'Ilustração' }),
      T('Legenda do sigilo', 'Sigillum Tertium', { x: 260, y: 880, w: 540, h: 40 }, { family: 'IM Fell English', size: 30, italic: true, align: 'center', color: INK, style: 'clean', wear: 0.1 }),
      T('Texto (esquerda)', 'Aquele que desejar prender uma sombra a um lugar deve primeiro conhecer-lhe o nome e o dia em que o lugar foi fundado. Desenhe-se o sigilo com sal e cinza, e sobre ele se acendam três velas de sebo, uma ao norte, outra ao sul, a terceira no centro, de modo que as chamas não se toquem.', { x: 160, y: 960, w: 740, h: 260 }, { family: 'IM Fell English', size: 29, color: INK, style: 'clean', wear: 0.1, lh: 1.35, field: 'Texto' }),
      T('Texto (direita)', 'Cuidado: a sombra, uma vez presa, não aceita outro dono. Quem a prende fica preso com ela, e à sua morte passa a ser guarda da casa, sem repouso. Assim se explica porque tantos solares antigos guardam um porão que ninguém abre, nem de dia.', { x: 1100, y: 160, w: 740, h: 480 }, { family: 'IM Fell English', size: 29, color: INK, style: 'clean', wear: 0.1, lh: 1.35 }),
      IMG('Ornamento', 'casa-ornamento-divisoria-estrelas', { x: 1180, y: 660, w: 580, h: 70 }, { blend: 'multiply', opacity: 0.7 }),
      T('Nota posterior', 'Experimentei em 1871. Funciona. Que Deus me perdoe. — C.', { x: 1100, y: 780, w: 740, h: 130 }, { family: 'IM Fell English', size: 34, italic: true, color: '#3a2a3a', style: 'handwriting', wear: 0.3, rot: -2 }),
    ],
  }),
  modelo({
    slug: 'pacto-sangue', name: 'Pacto assinado em sangue', category: 'Ocultismo', era: '1890', tom: 'horror', tags: ['ocultismo', 'pacto', 'pergaminho', 'assinatura'],
    layers: [
      ...base({ paper: 'pergaminho', age: 'antigo', aging: 'antigo', seed: 322, intensity: 0.7 }),
      T('Título', 'INSTRUMENTO DE PACTO', { x: 150, y: 130, w: 940, h: 100 }, { family: 'Uncial Antiqua', size: 64, align: 'center', color: '#4a1410', style: 'clean', wear: 0.1 }),
      IMG('Ornamento', 'casa-ornamento-divisoria-losangos', { x: 340, y: 250, w: 560, h: 60 }, { blend: 'multiply', opacity: 0.75 }),
      T('Termos', 'Eu, abaixo assinado, em plena posse de minha vontade, entrego à Casa que habita sob estas terras o que me resta de dias, de sono e de nome, em troca de que o que dela se ouviu não seja jamais dito. Obrigo-me a descer ao porão a cada lua nova e a nada trazer de lá senão o silêncio. Se faltar a este pacto, a Casa tomará de mim o que lhe devo, e de meus filhos, se os tiver.', { x: 150, y: 360, w: 940, h: 680 }, { family: 'IM Fell English', size: 36, color: '#2a1f14', style: 'clean', wear: 0.15, lh: 1.5, field: 'Termos' }),
      T('Assinatura', 'Cornélio de A. Pinhais', { x: 480, y: 1210, w: 660, h: 110 }, { family: 'Mrs Saint Delafield', size: 82, color: '#5a0c0c', style: 'handwriting', wear: 0.4, field: 'Assinatura', rot: -3 }),
      RULE(480, 1330, 620, { color: '#5a0c0c', weight: 2 }), BOX('Pingo de sangue', { x: 1020, y: 1290, w: 26, h: 40 }, { type: 'ellipse', fill: '#5a0c0c', opacity: 0.8 }),
      IMG('Lacre preto', 'casa-lacre-preto-brasao', { x: 160, y: 1180, w: 240, h: 240 }, { rot: -8 }),
    ],
  }),
  modelo({
    slug: 'recorte-livro-proibido', name: 'Recorte de livro proibido', category: 'Ocultismo', era: '1900', tom: 'horror', tags: ['ocultismo', 'livro', 'queimado', 'proibido'],
    layers: [
      ...base({ paper: 'oficio-creme', age: 'antigo', aging: 'queimado', seed: 323, intensity: 0.9 }),
      T('Título corrente', 'INDEX LIBRORUM PROHIBITORUM', { x: 110, y: 100, w: 1020, h: 40 }, { family: 'Old Standard TT', size: 24, align: 'center', color: INK, style: 'clean', wear: 0.2 }),
      T('Texto', 'Quarto. Que ninguém ouse ler em voz alta o que se segue, sob pena de ser ouvido por quem não deve. A palavra dita no escuro tem peso, e o peso vai ao fundo, onde espera. Os que sobreviveram a esta leitura relataram um frio nos pés e a certeza de que a página seguinte já fora lida por outro antes deles. Convém queimar o livro, mas o fogo, dizem, apenas o abre.', { x: 110, y: 200, w: 1020, h: 620 }, { family: 'IM Fell English', size: 38, color: INK, style: 'clean', wear: 0.25, lh: 1.45, field: 'Texto' }),
      fx('Cinzas', 'grain', { blend: 'multiply', opacity: 0.35, amount: 0.6, seed: 81 }),
      IMG('Marca de fuligem', 'casa-queimado-3', { x: 600, y: 900, w: 560, h: 560 }, { blend: 'multiply', opacity: 0.6 }),
      IMG('Digital na margem', 'casa-digitais-3', { x: 860, y: 1180, w: 200, h: 250 }, { blend: 'multiply', opacity: 0.4, rot: 20 }),
      T('Texto (continuação)', 'Quinto. Para romper a ligação, é preciso nomear os três guardas pela ordem inversa à que foram chamados, e fazê-lo antes do nascer da lua, com a porta fechada e a cabeça coberta; depois, sem olhar para trás, atravessar o limiar de espinho e', { x: 110, y: 860, w: 1020, h: 400 }, { family: 'IM Fell English', size: 38, color: INK, style: 'clean', wear: 0.25, lh: 1.45 }),
    ],
  }),
  modelo({
    slug: 'mapa-astral', name: 'Mapa astral', category: 'Ocultismo', page: { width: 1300, height: 1500 }, background: '#d7c9a6', era: '1920', tom: 'horror', tags: ['ocultismo', 'astrologia', 'mapa'],
    layers: (() => {
      const cx = 650, cy = 780;
      const signos = ['ARI', 'TOU', 'GÊM', 'CÂN', 'LEÃ', 'VIR', 'LIB', 'ESC', 'SAG', 'CAP', 'AQU', 'PEI'];
      const raios = signos.map((s, i) => { const a = (i * 30 - 90) * Math.PI / 180; return RULE(cx, cy, 0, { name: `Raio ${s}`, color: '#3a2a1a', weight: 1.4 }); });
      const letras = signos.map((s, i) => { const a = (i * 30 - 75) * Math.PI / 180; return T(`Signo ${s}`, s, { x: cx + Math.cos(a) * 380 - 40, y: cy + Math.sin(a) * 380 - 20, w: 80, h: 40 }, { family: 'Cinzel', size: 26, bold: true, align: 'center', color: '#3a2a1a', style: 'clean', wear: 0.05 }); });
      const traços = signos.map((s, i) => { const a = (i * 30 - 90) * Math.PI / 180; const x0 = cx + Math.cos(a) * 230, y0 = cy + Math.sin(a) * 230, x1 = cx + Math.cos(a) * 440, y1 = cy + Math.sin(a) * 440; const bx = Math.min(x0, x1), by = Math.min(y0, y1); const w = Math.max(1, Math.abs(x1 - x0)), h = Math.max(1, Math.abs(y1 - y0)); return TRACO(`Divisão ${s}`, { x: bx, y: by, w, h }, [[x0 <= x1 ? 0 : 1, y0 <= y1 ? 0 : 1], [x0 <= x1 ? 1 : 0, y0 <= y1 ? 1 : 0]], { color: '#3a2a1a', weight: 2 }); });
      return [
        ...base({ page: { width: 1300, height: 1500 }, paper: 'oficio-creme', age: 'antigo', aging: 'antigo', seed: 324, intensity: 0.6 }),
        T('Título', 'MAPA ASTRAL', { x: 150, y: 70, w: 1000, h: 90 }, { family: 'Cinzel', size: 64, bold: true, align: 'center', color: '#3a2a1a', style: 'clean', wear: 0.05 }),
        BOX('Círculo externo', { x: cx - 440, y: cy - 440, w: 880, h: 880 }, { type: 'ellipse', stroke: '#3a2a1a', weight: 5 }), BOX('Círculo dos signos', { x: cx - 330, y: cy - 330, w: 660, h: 660 }, { type: 'ellipse', stroke: '#3a2a1a', weight: 2 }), BOX('Círculo interno', { x: cx - 230, y: cy - 230, w: 460, h: 460 }, { type: 'ellipse', stroke: '#3a2a1a', weight: 3 }),
        ...traços, ...letras, IMG('Centro', 'casa-simbolo-pentaculo', { x: cx - 120, y: cy - 120, w: 240, h: 240 }, { blend: 'multiply', opacity: 0.75 }),
        T('Nome', 'Nome: Helena Maria Pires', { x: 150, y: 1280, w: 1000, h: 44 }, { family: 'IM Fell English', size: 32, color: INK, style: 'clean', wear: 0.1, field: 'Nome' }), T('Nascimento', 'Nascida em 9 de março de 1900, às 5h, Vila Aurora', { x: 150, y: 1330, w: 1000, h: 44 }, { family: 'IM Fell English', size: 32, color: INK, style: 'clean', wear: 0.1, field: 'Data' }),
        T('Leitura', 'Lua cheia em Escorpião: casa oito marcada. Grande tendência a lidar com o que está sob a terra.', { x: 150, y: 1380, w: 1000, h: 90 }, { family: 'IM Fell English', size: 28, italic: true, color: '#5a1a14', style: 'handwriting', wear: 0.15, field: 'Leitura' }),
      ];
    })(),
  }),
  modelo({
    slug: 'invocacao-uv', name: 'Invocação · UV', category: 'Ocultismo', era: 'hoje', tom: 'horror', tags: ['ocultismo', 'invocação', 'luz negra', 'segredo'],
    layers: [
      ...base({ paper: 'oficio-branco', age: 'novo', aging: 'usado', seed: 325, intensity: 0.5 }),
      T('Título', 'ATA DA REUNIÃO DO CONDOMÍNIO', { x: 110, y: 110, w: 1020, h: 60 }, { family: 'Inter', size: 32, bold: true, color: '#1d1b24', style: 'clean', wear: 0 }),
      T('Texto visível', '1. Aprovação das contas do mês anterior.\n2. Reforma do telhado do bloco B.\n3. Barulho vindo do subsolo, segundo moradores do térreo — adiado para a próxima reunião.\n4. Assuntos gerais.\n\nNada mais havendo a tratar, encerrou-se a reunião às 21h30.', { x: 110, y: 230, w: 1020, h: 560 }, { family: 'Inter', size: 28, color: '#1d1b24', style: 'clean', wear: 0, lh: 1.5, field: 'Texto visível' }),
      T('Texto UV', 'Eu te chamo pelo nome que não tem nome,\nTu que dormes sob o concreto e sob o sal.\nAbre a porta que o tempo fechou.\nVem pela escada que ninguém desce.\nVem, e fica.', { x: 130, y: 880, w: 980, h: 520 }, { family: 'La Belle Aurore', size: 62, color: '#c8ffd4', style: 'handwriting', wear: 0.1, lh: 1.35, light: 'uv', field: 'Texto UV', rot: -1 }),
      T('Rodapé da ata', 'Ata lavrada pela síndica, Sra. Dalva Nunes.', { x: 110, y: 780, w: 1020, h: 40 }, { family: 'Inter', size: 22, color: '#555555', style: 'clean', wear: 0 }),
      IMG('Sigilo UV', 'casa-simbolo-sigilo-7', { x: 780, y: 1360, w: 300, h: 300 }, { light: 'uv', blend: 'screen', opacity: 0.9 }),
    ],
  }),
  // ---------------------------------------------------------------- Medieval e fantasia
  modelo({
    slug: 'carta-nautica', name: 'Carta náutica', category: 'Fantasia', page: { width: 1700, height: 1200 }, background: '#c9b48a', era: 'medieval', tom: 'fantasia', tags: ['mapa', 'náutica', 'pergaminho'],
    layers: (() => {
      const cx = 1380, cy = 360;
      const rumos = Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8; const x1 = cx + Math.cos(a) * 520, y1 = cy + Math.sin(a) * 520; return TRACO(`Rumo ${i + 1}`, { x: Math.min(cx, x1), y: Math.min(cy, y1), w: Math.max(1, Math.abs(x1 - cx)), h: Math.max(1, Math.abs(y1 - cy)) }, [[x1 >= cx ? 0 : 1, y1 >= cy ? 0 : 1], [x1 >= cx ? 1 : 0, y1 >= cy ? 1 : 0]], { color: '#6a3a1a', weight: 1.3, opacity: 0.55 }); });
      return [
        IMG('Pergaminho', 'casa-papel-pergaminho-antigo', { x: 0, y: 0, w: 1700, h: 1200 }), ...age('antigo', 331, { width: 1700, height: 1200 }, 0.7),
        FOTO('Mapa', 'casa-foto-mapa-singapura-1893', { x: 110, y: 110, w: 1100, h: 800 }, { field: 'Mapa', filter: { sepia: 0.9, contrast: 0.1 } }), ...rumos,
        BOX('Rosa dos ventos · círculo', { x: cx - 120, y: cy - 120, w: 240, h: 240 }, { type: 'ellipse', stroke: '#6a1a14', weight: 4 }), IMG('Rosa dos ventos', 'casa-simbolo-sigilo-9', { x: cx - 110, y: cy - 110, w: 220, h: 220 }, { blend: 'multiply', opacity: 0.85 }),
        IMG('Monstro marinho', 'casa-simbolo-espiral', { x: 860, y: 640, w: 200, h: 200 }, { blend: 'multiply', opacity: 0.7, rot: 12 }),
        T('Legenda', 'LEGENDA\n\nRumos de vento em 16 partes.\nPerigo: águas rasas ao sul.\nHic sunt dracones.', { x: 1260, y: 700, w: 380, h: 300 }, { family: 'IM Fell English', size: 30, color: INK, style: 'clean', wear: 0.1, lh: 1.4, field: 'Legenda' }),
        T('Título da carta', 'CARTA DO MAR DAS ILHAS SOMBRIAS · ANNO MDXLII', { x: 110, y: 1000, w: 1100, h: 60 }, { family: 'Uncial Antiqua', size: 38, color: '#5a1a14', style: 'clean', wear: 0.1 }),
      ];
    })(),
  }),
  modelo({
    slug: 'contrato-guilda', name: 'Contrato de guilda', category: 'Fantasia', era: 'medieval', tom: 'fantasia', tags: ['guilda', 'contrato', 'pergaminho'],
    layers: [
      ...base({ paper: 'pergaminho', age: 'antigo', aging: 'antigo', seed: 332, intensity: 0.7 }),
      IMG('Moldura medieval', 'casa-moldura-medieval-1', { x: 60, y: 60, w: 1120, h: 1634 }),
      T('Iluminura', 'E', { x: 160, y: 160, w: 180, h: 200 }, { family: 'Uncial Antiqua', size: 190, color: '#7a1f14', style: 'clean', wear: 0.1 }),
      T('Cabeçalho', 'm nome da Ilustríssima Guilda dos Ferreiros e Cuteleiros', { x: 340, y: 190, w: 760, h: 140 }, { family: 'Uncial Antiqua', size: 38, color: INK, style: 'clean', wear: 0.1, lh: 1.25 }),
      T('Guilda', 'GUILDA DOS FERREIROS DE ALDEMAR', { x: 160, y: 400, w: 920, h: 60 }, { family: 'Uncial Antiqua', size: 34, align: 'center', color: '#5a1a14', style: 'clean', wear: 0.1, field: 'Guilda' }),
      T('Contratado', 'Contrata-se o mestre Tomás de Arles, armeiro, por três anos', { x: 160, y: 480, w: 920, h: 90 }, { family: 'EB Garamond', size: 36, bold: true, align: 'center', color: INK, style: 'clean', wear: 0.1, field: 'Contratado' }),
      T('Cláusulas', 'I. O mestre servirá à guilda de sol a sol, exceto aos dias santos.\nII. Receberá doze moedas de prata ao mês e o pão da casa.\nIII. Não revelará a ninguém de fora o segredo da têmpera do aço negro.\nIV. Quem romper este contrato perderá a mão com que o assinou.\nV. Feito perante testemunhas, no dia de São Miguel.', { x: 180, y: 640, w: 880, h: 640 }, { family: 'EB Garamond', size: 36, color: INK, style: 'clean', wear: 0.1, lh: 1.5, field: 'Cláusulas' }),
      T('Assinatura', 'Tomás de Arles', { x: 700, y: 1370, w: 380, h: 80 }, { family: 'Pinyon Script', size: 54, color: '#1c2a5a', style: 'handwriting', wear: 0.25 }),
      IMG('Selo pendente', 'casa-lacre-vermelho-brasao', { x: 200, y: 1330, w: 260, h: 260 }, { rot: -6 }),
    ],
  }),
  modelo({
    slug: 'bestiario-pagina', name: 'Página de bestiário', category: 'Fantasia', era: 'medieval', tom: 'fantasia', tags: ['bestiário', 'criatura', 'pergaminho', 'ilustração'],
    layers: [
      ...base({ paper: 'pergaminho', age: 'antigo', aging: 'antigo', seed: 333, intensity: 0.7 }),
      T('Título', 'DE BASILISCO', { x: 150, y: 120, w: 940, h: 100 }, { family: 'Uncial Antiqua', size: 70, align: 'center', color: '#5a1a14', style: 'clean', wear: 0.1, field: 'Criatura' }),
      IMG('Moldura da ilustração', 'casa-moldura-fio-duplo-cantos-cortados', { x: 190, y: 270, w: 860, h: 720 }),
      IMG('Ilustração', 'casa-simbolo-espiral', { x: 270, y: 320, w: 700, h: 620 }, { blend: 'multiply', opacity: 0.75, _field: 'Ilustração' }), IMG('Ornamento do canto', 'casa-ornamento-canto-gotico', { x: 190, y: 270, w: 180, h: 180 }, { blend: 'multiply', opacity: 0.8 }),
      T('Descrição', 'O basilisco é serpente de cabeça coroada, nascida de ovo de galo velho chocado por sapo. Seu olhar mata, e seu hálito seca a erva. Só o afugenta o espelho, que lhe devolve o próprio rigor, e o canto do galo, que o faz fugir às tocas. Os viajantes que passam por Aldemar levam sempre um espelho de mão e um galo na carroça.', { x: 170, y: 1050, w: 900, h: 560 }, { family: 'Uncial Antiqua', size: 33, color: INK, style: 'clean', wear: 0.1, lh: 1.5, field: 'Descrição' }),
    ],
  }),
  modelo({
    slug: 'recompensa-reino', name: 'Recompensa do reino', category: 'Fantasia', era: 'medieval', tom: 'fantasia', tags: ['recompensa', 'procurado', 'reino', 'cartaz'],
    layers: [
      ...base({ paper: 'papel-de-embrulho', age: 'antigo', aging: 'antigo', seed: 334, intensity: 0.8 }),
      IMG('Brasão', 'casa-emblema-escudo-leao', { x: 460, y: 80, w: 320, h: 384 }, { blend: 'multiply', opacity: 0.85 }),
      T('Título', 'EM NOME DO REI', { x: 140, y: 480, w: 960, h: 80 }, { family: 'Uncial Antiqua', size: 54, align: 'center', color: '#3a1a10', style: 'clean', wear: 0.2 }),
      T('Procurado', 'PROCURA-SE\nGARRETT, O CORVO', { x: 140, y: 600, w: 960, h: 250 }, { family: 'Rye', size: 70, align: 'center', color: '#2a1410', style: 'clean', wear: 0.25, field: 'Procurado', lh: 1.15 }),
      T('Crime', 'por roubo, bruxaria e pelo desaparecimento do tesouro da Abadia de São Gabriel', { x: 160, y: 880, w: 920, h: 150 }, { family: 'IM Fell English', size: 40, align: 'center', color: '#2a1410', style: 'clean', wear: 0.2, lh: 1.3 }),
      T('Recompensa', 'RECOMPENSA: 500 COROAS DE OURO', { x: 140, y: 1080, w: 960, h: 140 }, { family: 'Uncial Antiqua', size: 54, align: 'center', color: '#7a1410', style: 'clean', wear: 0.2, field: 'Recompensa', lh: 1.2 }),
      T('Aviso', 'Vivo ou morto. Quem o abrigar responderá pelos seus crimes.', { x: 160, y: 1290, w: 920, h: 100 }, { family: 'IM Fell English', size: 34, italic: true, align: 'center', color: '#2a1410', style: 'clean', wear: 0.2 }),
      ...[[70, 70], [1130, 70], [70, 1600], [1130, 1600]].map(([x, y], i) => IMG(`Tacha ${i + 1}`, 'casa-prendedor-tacha', { x, y, w: 60, h: 60 })),
    ],
  }),
  modelo({
    slug: 'carta-taverna', name: 'Carta de taverna', category: 'Fantasia', page: { width: 1300, height: 1700 }, background: '#4a3a2a', era: 'medieval', tom: 'fantasia', tags: ['taverna', 'cardápio', 'madeira', 'giz'],
    layers: [
      IMG('Madeira', 'casa-superficie-wood060', { x: 0, y: 0, w: 1300, h: 1700 }), ...age('usado', 335, { width: 1300, height: 1700 }, 0.5),
      BOX('Moldura da tábua', { x: 50, y: 50, w: 1200, h: 1600 }, { stroke: '#2a1a0a', weight: 22, opacity: 0.8 }),
      T('Taverna', 'O GALO MANCO', { x: 140, y: 120, w: 1020, h: 130 }, { family: 'Rye', size: 100, align: 'center', color: '#f1ead6', style: 'handwriting', wear: 0.5, rot: -1 }),
      T('Subtítulo', '~ comida honesta e cerveja fria ~', { x: 140, y: 270, w: 1020, h: 60 }, { family: 'Shadows Into Light', size: 44, align: 'center', color: '#e6dec6', style: 'handwriting', wear: 0.5 }),
      T('Pratos', 'Sopa de cebola e osso\nGuisado do dia, com pão preto\nCoelho assado com ervas\nTorta de maçã e canela\nQueijo curado e nozes\nCerveja escura (a caneca)\nHidromel da casa (o cálice)', { x: 150, y: 400, w: 780, h: 960 }, { family: 'Shadows Into Light', size: 52, color: '#f1ead6', style: 'handwriting', wear: 0.5, lh: 1.6, field: 'Pratos' }),
      T('Preços', '2 cobres\n5 cobres\n9 cobres\n4 cobres\n3 cobres\n1 cobre\n2 cobres', { x: 960, y: 400, w: 260, h: 960 }, { family: 'Shadows Into Light', size: 52, align: 'right', color: '#e6c978', style: 'handwriting', wear: 0.5, lh: 1.6, field: 'Preços' }),
      T('Aviso', 'Fiado só para quem já morreu.', { x: 150, y: 1480, w: 1000, h: 70 }, { family: 'Shadows Into Light', size: 46, align: 'center', color: '#e6dec6', style: 'handwriting', wear: 0.5, rot: -1 }),
      fx('Pó de giz', 'grain', { blend: 'screen', opacity: 0.2, amount: 0.6, seed: 71 }),
    ],
  }),
];
