/**
 * Lote C11 · Tecnologia, objetos, cotidiano e destruídos (26 modelos novos): telas e conversas, fotografias e
 * objetos, papéis do cotidiano, documentos destruídos e composições de mesa.
 */
import { A4, T, IMG, FOTO, RULE, BOX, TRACO, base, formulario, carta, tabela, altura, modelo } from './montagem.js';
import { aging, silhouette, barcode } from '../kit.js';

const RET = { bigode: 'casa-foto-retrato-homem-bigode-oculos', rapaz: 'casa-foto-retrato-rapaz-cdv', senhora: 'casa-foto-retrato-senhora-capa', hussardo: 'casa-foto-retrato-jovem-hussardo', oficial: 'casa-foto-retrato-oficial-sabre', mulher: 'casa-foto-retrato-mulher-sanfona' };
const EMB = org => `casa-emblema-universo-${org}`;
const fx = (name, type, o = {}) => ({ kind: 'effect', name, blend: o.blend || 'multiply', opacity: o.opacity ?? 0.4, effect: { type, seed: o.seed || 9, amount: o.amount ?? 0.5, params: o.params || {} } });
const age = (preset, seed, page, intensity = 1) => aging(preset, { seed, intensity, page });
const INK = '#1d1b24';

/** Conversa de celular: o moldura vai por cima da tela; os balões são caixas arredondadas com o texto dentro. */
function conversa({ modo, contato, mensagens, aparelho = 'android' }) {
  const claro = modo === 'claro';
  const c = claro ? { tela: '#ffffff', nome: '#1c1c1e', mudo: '#8e8e93', entra: '#e9e9ee', entraTxt: '#1c1c1e', sai: '#2f7cf6', saiTxt: '#ffffff', barra: '#f1f1f4' } : { tela: '#111114', nome: '#f2f2f5', mudo: '#8a8a90', entra: '#2a2a30', entraTxt: '#f2f2f5', sai: '#2b6ad0', saiTxt: '#ffffff', barra: '#1c1c20' };
  const k = 1.25;
  const ox = 50, oy = 40;
  const sx = ox + 38 * k, sy = oy + 40 * k, sw = 484 * k, sh = 1060 * k;
  const L = [
    BOX('Tela', { x: sx, y: sy, w: sw, h: sh }, { fill: c.tela, radius: 40 }),
    IMG('Barra de status', `casa-interface-barra-status-${modo}`, { x: sx, y: sy + 10, w: sw, h: 52 * k }),
    BOX('Cabeçalho da conversa', { x: sx, y: sy + 70, w: sw, h: 100 }, { fill: c.barra }),
    BOX('Avatar do contato', { x: sx + 24, y: sy + 88, w: 64, h: 64 }, { type: 'ellipse', fill: '#9aa0a6' }),
    T('Contato', contato, { x: sx + 106, y: sy + 100, w: sw - 140, h: 44 }, { family: 'Inter', size: 30, bold: true, color: c.nome, style: 'clean', wear: 0, field: 'Contato' }),
  ];
  let y = sy + 200;
  mensagens.forEach((m, i) => {
    const maxW = Math.round(sw * 0.72);
    const w = Math.min(maxW, Math.max(180, m.texto.length * 17 + 56));
    const h = Math.max(70, altura(m.texto, w - 40, 26, { family: 'Inter' }) + 34);
    const x = m.de === 'sai' ? sx + sw - w - 28 : sx + 28;
    L.push(BOX(`Balão ${i + 1}`, { x, y, w, h }, { fill: m.de === 'sai' ? c.sai : c.entra, radius: 30 }));
    L.push(T(i === 0 ? 'Mensagens' : `Mensagem ${i + 1}`, m.texto, { x: x + 20, y: y + 14, w: w - 40, h: h - 20 }, { family: 'Inter', size: 26, color: m.de === 'sai' ? c.saiTxt : c.entraTxt, style: 'clean', wear: 0, field: i === 0 ? 'Mensagens' : undefined }));
    L.push(T(`Hora ${i + 1}`, m.hora || '', { x: m.de === 'sai' ? x : x + 6, y: y + h + 2, w: w, h: 26 }, { family: 'Inter', size: 18, color: c.mudo, style: 'clean', wear: 0, align: m.de === 'sai' ? 'right' : 'left' }));
    y += h + 44;
  });
  L.push(IMG('Digitando…', `casa-interface-digitando-${modo}`, { x: sx + 28, y: y + 4, w: 150, h: 71 }));
  L.push(IMG('Moldura do celular', `casa-interface-celular-${aparelho}-${modo}`, { x: ox, y: oy, w: 700, h: 1425 }));
  return L;
}

/** Linha falhada de fax: faixas do papel por cima do texto. */
const falhas = (ys, w, cor) => ys.map((y, i) => BOX(`Linha falhada ${i + 1}`, { x: 100, y, w: w - 200, h: 6 + (i % 3) * 4 }, { fill: cor, opacity: 0.9 }));

export default [
  // ---------------------------------------------------------------- Tecnologia
  modelo({
    slug: 'conversa-celular-claro', name: 'Conversa de celular · claro', category: 'Tecnologia', page: { width: 800, height: 1500 }, background: '#6a6a70', era: 'hoje', tom: 'cotidiano', tags: ['celular', 'mensagens', 'conversa', 'tela'],
    layers: [BOX('Fundo', { x: 0, y: 0, w: 800, h: 1500 }, { fill: '#6a6a70' }), ...conversa({ modo: 'claro', contato: 'Duda', mensagens: [{ de: 'in', texto: 'vc ta acordada??', hora: '23:41' }, { de: 'sai', texto: 'to. o que foi?', hora: '23:41' }, { de: 'in', texto: 'tem alguem no porao da casa velha. eu vi a luz de novo', hora: '23:43' }, { de: 'sai', texto: 'duda, nao vai la sozinha', hora: '23:43' }, { de: 'in', texto: 'ja to na porta', hora: '23:44' }] })],
  }),
  modelo({
    slug: 'conversa-celular-escuro', name: 'Conversa de celular · escuro', category: 'Tecnologia', page: { width: 800, height: 1500 }, background: '#2a2a30', era: 'hoje', tom: 'horror', tags: ['celular', 'mensagens', 'conversa', 'tela', 'modo escuro'],
    layers: [BOX('Fundo', { x: 0, y: 0, w: 800, h: 1500 }, { fill: '#2a2a30' }), ...conversa({ modo: 'escuro', aparelho: 'iphone', contato: 'Número desconhecido', mensagens: [{ de: 'in', texto: 'sei o que voce viu na casa', hora: '03:12' }, { de: 'sai', texto: 'quem e voce?', hora: '03:12' }, { de: 'in', texto: 'olha pela janela', hora: '03:13' }, { de: 'sai', texto: '???', hora: '03:13' }, { de: 'in', texto: 'nao. a de tras.', hora: '03:14' }] })],
  }),
  modelo({
    slug: 'email-celular', name: 'E-mail no celular', category: 'Tecnologia', page: { width: 800, height: 1500 }, background: '#6a6a70', era: 'hoje', tom: 'investigação', tags: ['celular', 'e-mail', 'tela', 'formulário'],
    layers: [
      BOX('Fundo', { x: 0, y: 0, w: 800, h: 1500 }, { fill: '#6a6a70' }),
      BOX('Tela', { x: 97, y: 90, w: 605, h: 1325 }, { fill: '#ffffff', radius: 50 }), IMG('Barra de status', 'casa-interface-barra-status-claro', { x: 97, y: 100, w: 605, h: 65 }),
      T('Cabeçalho do app', '‹ Caixa de entrada', { x: 120, y: 190, w: 560, h: 50 }, { family: 'Inter', size: 30, color: '#2f7cf6', style: 'clean', wear: 0 }),
      T('Remetente', 'Dra. Ingrid Vasconcelos', { x: 120, y: 270, w: 560, h: 44 }, { family: 'Inter', size: 30, bold: true, color: '#1c1c1e', style: 'clean', wear: 0, field: 'De' }),
      T('Para', 'para mim · 14 de março, 22:07', { x: 120, y: 316, w: 560, h: 34 }, { family: 'Inter', size: 22, color: '#8e8e93', style: 'clean', wear: 0 }),
      RULE(120, 366, 560, { color: '#d8d8dc' }),
      T('Assunto', 'Re: Subsolo — NÃO ENCAMINHAR', { x: 120, y: 388, w: 560, h: 90 }, { family: 'Inter', size: 32, bold: true, color: '#1c1c1e', style: 'clean', wear: 0, field: 'Assunto' }),
      T('Corpo', 'Oi,\n\nconfirmei os dados do sensor. A leitura de ontem não é erro de calibração: houve variação de 0,8 °C a cada três minutos, sempre às 3h. Não comente com a diretoria.\n\nVou ao Solar amanhã cedo. Leve a lanterna.\n\nIngrid', { x: 120, y: 500, w: 560, h: 720 }, { family: 'Inter', size: 27, color: '#1c1c1e', style: 'clean', wear: 0, lh: 1.45, field: 'Corpo' }),
      T('Anexo', '📎 leituras_subsolo.pdf (212 KB)', { x: 120, y: 1260, w: 560, h: 44 }, { family: 'Inter', size: 22, color: '#2f7cf6', style: 'clean', wear: 0, field: 'Anexo' }),
      IMG('Moldura do celular', 'casa-interface-celular-iphone-claro', { x: 50, y: 40, w: 700, h: 1425 }),
      BOX('Reflexo da tela', { x: 97, y: 90, w: 605, h: 1325 }, { fill: '#ffffff', opacity: 0.05, radius: 50, blend: 'screen' }), fx('Brilho do vidro', 'fade', { blend: 'screen', opacity: 0.08, amount: 0.5, params: { color: '#ffffff' }, seed: 1101 }),
    ],
  }),
  modelo({
    slug: 'tela-computador-anos-90', name: 'Tela de computador · anos 90', category: 'Tecnologia', page: { width: 1400, height: 1000 }, background: '#008080', era: '1990', tom: 'cotidiano', tags: ['computador', 'tela', 'retrô', 'anos 90'],
    layers: [
      BOX('Área de trabalho', { x: 0, y: 0, w: 1400, h: 1000 }, { fill: '#008080' }),
      ...[['Meu Computador', 60, 60], ['Lixeira', 60, 200], ['Documentos', 60, 340]].flatMap(([n, x, y], i) => [BOX(`Ícone ${i + 1}`, { x, y, w: 64, h: 56 }, { fill: '#c0c0c0', stroke: '#000', weight: 2 }), T(`Nome do ícone ${i + 1}`, n, { x: x - 30, y: y + 64, w: 130, h: 56 }, { family: 'VT323', size: 28, color: '#ffffff', align: 'center', style: 'clean', wear: 0 })]),
      IMG('Janela', 'casa-interface-janela-retro-90', { x: 190, y: 90, w: 1140, h: 780 }),
      T('Barra de título', 'Sem título - Bloco de Notas', { x: 214, y: 118, w: 800, h: 40 }, { family: 'VT323', size: 34, bold: true, color: '#ffffff', style: 'clean', wear: 0, field: 'Título' }),
      T('Menu', 'Arquivo   Editar   Localizar   Ajuda', { x: 214, y: 178, w: 800, h: 36 }, { family: 'VT323', size: 30, color: '#000000', style: 'clean', wear: 0 }),
      T('Texto', 'Relatório 14/03/97\n\nO servidor da prefeitura travou de novo às 03:00.\nBackup restaurado do disquete 7.\nCorrupção em: C:\\\\ARQUIVO\\\\PORAO.DAT\n\nQuem esteve no prédio depois das 22h?\nA câmera do corredor gravou 14 minutos\nde uma sala que não existe na planta.\n\n— Marcos', { x: 224, y: 250, w: 1080, h: 560 }, { family: 'VT323', size: 38, color: '#000000', style: 'clean', wear: 0, lh: 1.25, field: 'Texto' }),
      BOX('Barra de tarefas', { x: 0, y: 950, w: 1400, h: 50 }, { fill: '#c0c0c0', stroke: '#000', weight: 2 }), T('Iniciar', 'Iniciar', { x: 20, y: 958, w: 150, h: 34 }, { family: 'VT323', size: 30, bold: true, color: '#000', style: 'clean', wear: 0 }), T('Relógio', '03:07', { x: 1260, y: 958, w: 120, h: 34 }, { family: 'VT323', size: 30, color: '#000', align: 'right', style: 'clean', wear: 0 }),
    ],
  }),
  modelo({
    slug: 'monitor-moderno-mesa', name: 'Monitor moderno', category: 'Tecnologia', page: { width: 1500, height: 1100 }, background: '#4a3a2a', era: 'hoje', tom: 'investigação', tags: ['computador', 'monitor', 'mesa', 'navegador', 'composição'],
    layers: [
      IMG('Mesa de madeira', 'casa-superficie-wood026', { x: 0, y: 0, w: 1500, h: 1100 }),
      IMG('Monitor', 'casa-interface-monitor-moderno', { x: 250, y: 120, w: 1000, h: 760 }),
      BOX('Navegador', { x: 298, y: 168, w: 904, h: 524 }, { fill: '#ffffff' }), BOX('Barra do navegador', { x: 298, y: 168, w: 904, h: 64 }, { fill: '#e8eaed' }), BOX('Campo de endereço', { x: 400, y: 180, w: 700, h: 40 }, { fill: '#ffffff', radius: 20, stroke: '#c9ccd1', weight: 1 }),
      T('Endereço', 'www.noticiasdevilaaurora.com.br/solar-dos-pinhais', { x: 420, y: 186, w: 660, h: 30 }, { family: 'Inter', size: 20, color: '#3c4043', style: 'clean', wear: 0 }),
      T('Página', 'PORÃO DO SOLAR É REABERTO APÓS 90 ANOS', { x: 340, y: 270, w: 820, h: 120 }, { family: 'Inter', size: 44, bold: true, color: '#1a1a1a', style: 'clean', wear: 0, field: 'Página' }),
      T('Texto', 'A prefeitura de Vila Aurora autorizou ontem a abertura do porão do Solar dos Pinhais para vistoria técnica. Moradores dizem ter ouvido sons durante a madrugada. Os engenheiros não quiseram dar entrevista. A área está isolada.', { x: 340, y: 410, w: 820, h: 260 }, { family: 'Inter', size: 24, color: '#3c4043', style: 'clean', wear: 0, lh: 1.5, field: 'Texto' }),
      IMG('Xícara · pires', 'casa-manchas-cafe-2', { x: 1280, y: 760, w: 140, h: 140 }, { blend: 'multiply', opacity: 0.7 }), BOX('Xícara', { x: 1290, y: 770, w: 110, h: 110 }, { type: 'ellipse', fill: '#f4f1ea', stroke: '#9a958a', weight: 4 }), BOX('Café', { x: 1305, y: 785, w: 80, h: 80 }, { type: 'ellipse', fill: '#4a2c14' }),
      IMG('Post-it no monitor', 'casa-investigacao-postit-amarelo', { x: 1080, y: 560, w: 220, h: 220 }, { rot: 6 }), T('Nota do post-it', 'senha: PINHAIS83', { x: 1110, y: 620, w: 170, h: 100 }, { family: 'Caveat', size: 32, color: '#1c2a5a', style: 'handwriting', wear: 0.2, rot: 6 }),
      fx('Sombra da mesa', 'damp', { opacity: 0.25, amount: 0.4, params: { color: '#1a0f06' }, seed: 1102 }),
    ],
  }),
  modelo({
    slug: 'log-servidor', name: 'Log de servidor', category: 'Tecnologia', page: { width: 1400, height: 1000 }, background: '#0c100d', era: 'hoje', tom: 'sci-fi', tags: ['servidor', 'log', 'terminal', 'erro'],
    layers: [
      BOX('Fundo do terminal', { x: 0, y: 0, w: 1400, h: 1000 }, { fill: '#0c100d' }),
      T('Prompt', 'root@vilaaurora-srv:~# tail -f /var/log/arquivo/porao.log', { x: 60, y: 50, w: 1280, h: 40 }, { family: 'Share Tech Mono', size: 28, color: '#7dd88a', style: 'clean', wear: 0 }),
      T('Linhas', '[2023-03-14 02:58:11] INFO  sensor-b/temperatura  ok  18.2C\n[2023-03-14 02:59:40] INFO  sensor-b/umidade      ok  91%\n[2023-03-14 03:00:00] INFO  cron/backup          iniciado\n[2023-03-14 03:00:03] WARN  sensor-b/temperatura  18.2C -> 19.0C\n[2023-03-14 03:03:00] WARN  sensor-b/temperatura  19.0C -> 19.8C\n[2023-03-14 03:06:00] WARN  sensor-b/temperatura  19.8C -> 20.6C\n[2023-03-14 03:06:41] INFO  porta-b/trinco        fechado\n[2023-03-14 03:07:02] WARN  porta-b/trinco        ABERTO (sem comando)\n[2023-03-14 03:07:03] INFO  camera-2/movimento    detectado', { x: 60, y: 120, w: 1280, h: 420 }, { family: 'Share Tech Mono', size: 25, color: '#b9c9bb', style: 'clean', wear: 0, lh: 1.5, field: 'Linhas' }),
      BOX('Destaque do erro', { x: 50, y: 560, w: 1300, h: 150 }, { fill: '#5a1010', opacity: 0.55 }),
      T('Erro', '[2023-03-14 03:07:09] ERROR camera-2/stream      FALHA: quadro 4471 contém 1 pessoa;\n[2023-03-14 03:07:09] ERROR contador/ocupantes   esperado=0 lido=1 -> sala vazia', { x: 60, y: 570, w: 1280, h: 130 }, { family: 'Share Tech Mono', size: 25, bold: true, color: '#ff6b5e', style: 'clean', wear: 0, lh: 1.5, field: 'Erro' }),
      T('Linhas finais', '[2023-03-14 03:07:15] INFO  porta-b/trinco        fechado\n[2023-03-14 03:07:16] INFO  camera-2/movimento    encerrado\n[2023-03-14 03:07:20] WARN  sensor-b/temperatura  20.6C -> 18.2C\n[2023-03-14 03:09:00] INFO  cron/backup          concluído com 1 aviso', { x: 60, y: 730, w: 1280, h: 200 }, { family: 'Share Tech Mono', size: 25, color: '#b9c9bb', style: 'clean', wear: 0, lh: 1.5 }),
      fx('Granulação do terminal', 'grain', { blend: 'soft-light', opacity: 0.2, amount: 0.4, seed: 1103 }), fx('Brilho do vidro', 'fade', { blend: 'screen', opacity: 0.05, amount: 0.5, params: { color: '#9dffb5' }, seed: 1104 }),
      T('Rodapé', '-- fim do arquivo por enquanto --', { x: 60, y: 940, w: 1280, h: 36 }, { family: 'Share Tech Mono', size: 22, color: '#5a8a62', style: 'clean', wear: 0 }),
      BOX('Moldura da janela', { x: 20, y: 20, w: 1360, h: 960 }, { stroke: '#2a3a2d', weight: 4, radius: 10 }),
    ],
  }),
  modelo({
    slug: 'transcricao-ligacao', name: 'Transcrição de ligação', category: 'Tecnologia', era: '1990', tom: 'investigação', org: 'delegacia', tags: ['polícia', 'ligação', 'transcrição', 'formulário'],
    layers: (() => {
      const t = { y: 560, size: 22, columns: [{ h: 'Hora', w: 130, key: 'h' }, { h: 'Interlocutor', w: 210, key: 'i' }, { h: 'Fala', w: 680, key: 'f' }], rows: [
        { h: '02:14:07', i: 'Homem (voz grave)', f: 'Você sabe o que tem debaixo da casa.' }, { h: '02:14:11', i: 'Delegado', f: 'Quem fala? Identifique-se.' }, { h: '02:14:15', i: 'Homem', f: 'Já abriram o porão. Eles já estão acordados.' }, { h: '02:14:23', i: 'Delegado', f: 'Que porão? Onde o senhor está?' }, { h: '02:14:31', i: 'Homem', f: '[ruído de estática] ...sob a escada... não deixem a Helena...' }, { h: '02:14:44', i: '—', f: '[ligação interrompida]' }] };
      return [...formulario({ org: 'delegacia', emblem: EMB('delegacia'), paper: 'papel-de-fax', age: 'usado', seed: 1105, aging: 'usado', title: ['DELEGACIA DE INVESTIGAÇÕES ESPECIAIS', 'TRANSCRIÇÃO DE LIGAÇÃO GRAVADA'], titleSize: 25,
        rows: [['Interlocutores', 'Homem não identificado e Delegado de plantão'], ['Data', '02/09/1993 · fita nº 417'], ['Linha', '(011) 3250-4471 · linha de denúncias', { col: 2 }]], signatures: [{ nome: 'Marta Quintanilha', cargo: 'Transcrição: escrivã' }], signY: 1560, extras: tabela({ ...t, ink: INK }) })];
    })(),
  }),
  modelo({
    slug: 'fax-recebido', name: 'Fax recebido', category: 'Tecnologia', era: '1990', tom: 'investigação', tags: ['fax', 'térmico', 'comunicação'],
    layers: [
      ...base({ paper: 'papel-de-fax', age: 'usado', aging: 'usado', seed: 1106, intensity: 0.7 }),
      T('Cabeçalho do fax', '14/03/1994  02:41      DE: 011 3250 4471      PARA: 011 5544 0183      PÁG. 1/1', { x: 70, y: 30, w: 1100, h: 40 }, { family: 'Courier Prime', size: 20, color: '#333333', style: 'clean', wear: 0.2 }),
      RULE(70, 78, 1100, { color: '#333', weight: 2 }),
      T('Título', 'FAX', { x: 100, y: 130, w: 400, h: 150 }, { family: 'Anton', size: 130, color: '#1d1b24', style: 'clean', wear: 0.3 }),
      T('Remetente', 'DE: Delegado A. Salgueiro\nDIE · Seção Especial', { x: 100, y: 320, w: 900, h: 110 }, { family: 'Courier Prime', size: 30, bold: true, color: '#1d1b24', wear: 0.3, field: 'Remetente' }),
      T('Texto', 'URGENTE.\n\nO homem da ligação desta madrugada foi localizado: trata-se do ex-vigia do Solar, internado no sanatório desde 1954. Ele afirma não ter telefone nem saber de ligação alguma. A fita 417 será periciada pelo IML. Aguardo instruções antes de qualquer diligência no local.\n\nFavor confirmar o recebimento.', { x: 100, y: 470, w: 1040, h: 700 }, { family: 'Courier Prime', size: 32, color: '#1d1b24', wear: 0.3, lh: 1.4, field: 'Texto' }),
      ...falhas([260, 640, 980, 1330], 1240, '#ece9e2'), BOX('Faixa de ruído', { x: 0, y: 760, w: 1240, h: 22 }, { fill: '#1d1b24', opacity: 0.12 }),
      fx('Ruído térmico', 'grain', { blend: 'multiply', opacity: 0.35, amount: 0.7, params: { size: 1.2 }, seed: 1107 }),
      T('Rodapé do fax', '*** FIM DA TRANSMISSÃO *** OK 02:43 ***', { x: 70, y: 1640, w: 1100, h: 40 }, { family: 'Courier Prime', size: 22, color: '#555555', style: 'clean', wear: 0.3, align: 'center' }),
    ],
  }),
  modelo({
    slug: 'postagem-rede-social', name: 'Postagem de rede social fictícia', category: 'Tecnologia', page: { width: 900, height: 1500 }, background: '#e6e8eb', era: 'hoje', tom: 'cotidiano', tags: ['rede social', 'postagem', 'foto', 'celular', 'formulário'],
    layers: [
      BOX('Fundo', { x: 0, y: 0, w: 900, h: 1500 }, { fill: '#e6e8eb' }), BOX('Cartão da postagem', { x: 40, y: 60, w: 820, h: 1380 }, { fill: '#ffffff', radius: 28, stroke: '#d8dbe0', weight: 2 }),
      FOTO('Foto de perfil', RET.mulher, { x: 80, y: 100, w: 100, h: 100 }, { field: 'Perfil' }),
      T('Usuário', 'duda.alencar', { x: 200, y: 108, w: 560, h: 44 }, { family: 'Inter', size: 32, bold: true, color: '#1a1a1a', style: 'clean', wear: 0, field: 'Usuário' }), T('Local', 'Vila Aurora, SP · há 2 horas', { x: 200, y: 154, w: 560, h: 34 }, { family: 'Inter', size: 22, color: '#8e8e93', style: 'clean', wear: 0 }),
      FOTO('Foto', 'casa-foto-lugar-casarao-1895', { x: 40, y: 230, w: 820, h: 700 }, { field: 'Foto', filter: { saturation: -0.2, contrast: 0.1 } }),
      T('Curtidas', '♥  1.284 curtidas', { x: 80, y: 960, w: 740, h: 44 }, { family: 'Inter', size: 28, bold: true, color: '#1a1a1a', style: 'clean', wear: 0 }),
      T('Texto', 'a casa mais assustadora da cidade 👻 alguém aí já entrou? juro que vi uma luz na janela do porão #solardospinhais #vilaaurora #urbex', { x: 80, y: 1020, w: 740, h: 160 }, { family: 'Inter', size: 26, color: '#1a1a1a', style: 'clean', wear: 0, lh: 1.45, field: 'Texto' }),
      T('Comentários', 'beto.s  não vai lá, a Dona Odete disse que ninguém mora\nnath_p  eu fui em 2019 e nunca mais dormi direito\nsolar.pinhais  quem entrou, voltou. quem voltou, ficou.', { x: 80, y: 1190, w: 740, h: 220 }, { family: 'Inter', size: 22, color: '#3c4043', style: 'clean', wear: 0, lh: 1.5 }),
    ],
  }),
  // ---------------------------------------------------------------- Fotografias e objetos
  modelo({
    slug: 'foto-colada-fita', name: 'Foto colada com fita', category: 'Fotografias e objetos', page: { width: 1100, height: 1300 }, background: '#c9c0a8', era: '1950', tom: 'investigação', tags: ['foto', 'fita', 'legenda', 'composição'],
    layers: [
      ...base({ page: { width: 1100, height: 1300 }, paper: 'papelao', age: 'usado', aging: 'usado', seed: 1111, intensity: 0.8 }),
      IMG('Moldura da foto', 'casa-moldura-foto-antiga-serrilhada', { x: 190, y: 150, w: 720, h: 900 }, { rot: -2 }), FOTO('Foto', RET.oficial, { x: 225, y: 185, w: 650, h: 830 }, { field: 'Foto', rot: -2, filter: { sepia: 0.4 } }),
      IMG('Fita 1', 'casa-fita-crepe-diagonal', { x: 120, y: 120, w: 220, h: 80 }, { rot: -38 }), IMG('Fita 2', 'casa-fita-crepe-diagonal', { x: 760, y: 120, w: 220, h: 80 }, { rot: 38 }), IMG('Fita 3', 'casa-fita-crepe-media', { x: 380, y: 1010, w: 300, h: 70 }, { rot: 3 }),
      T('Legenda', 'Tenente Orlando, Vila Aurora, 1952\n(verso: "nunca confiem nele")', { x: 190, y: 1100, w: 720, h: 130 }, { family: 'Caveat', size: 44, color: '#1c2a5a', style: 'handwriting', wear: 0.2, rot: -1.5, field: 'Legenda', lh: 1.25 }),
    ],
  }),
  modelo({
    slug: 'porta-retrato', name: 'Porta-retrato', category: 'Fotografias e objetos', page: { width: 1100, height: 1300 }, background: '#5a4a3a', era: '1950', tom: 'cotidiano', tags: ['foto', 'moldura', 'objeto', 'vidro'],
    layers: [
      IMG('Mesa', 'casa-superficie-wood060', { x: 0, y: 0, w: 1100, h: 1300 }),
      BOX('Sombra', { x: 150, y: 170, w: 820, h: 1000 }, { fill: '#000000', opacity: 0.4, radius: 14 }), IMG('Moldura de madeira', 'casa-superficie-wood026', { x: 120, y: 120, w: 820, h: 1000 }),
      BOX('Filete interno', { x: 210, y: 210, w: 640, h: 820 }, { fill: '#c9a24a', radius: 4 }), BOX('Passe-partout', { x: 224, y: 224, w: 612, h: 792 }, { fill: '#efe8d8' }),
      FOTO('Foto', RET.senhora, { x: 280, y: 280, w: 500, h: 680 }, { field: 'Foto', filter: { sepia: 0.5, contrast: 0.1 } }),
      BOX('Reflexo do vidro', { x: 210, y: 210, w: 640, h: 820 }, { fill: '#ffffff', opacity: 0.12, blend: 'screen' }), BOX('Reflexo diagonal', { x: 250, y: 250, w: 220, h: 700, }, { fill: '#ffffff', opacity: 0.1, blend: 'screen', rot: 24 }),
      fx('Poeira no vidro', 'grain', { blend: 'screen', opacity: 0.12, amount: 0.4, seed: 1112 }), fx('Sombra do canto', 'damp', { opacity: 0.2, amount: 0.4, params: { color: '#2a1a0a' }, seed: 1113 }),
      BOX('Suporte traseiro', { x: 440, y: 1100, w: 200, h: 140 }, { fill: '#4a3a2a', radius: 8, stroke: '#2a1a0a', weight: 3 }),
    ],
  }),
  modelo({
    slug: 'tira-fotos-cabine', name: 'Tira de fotos de cabine', category: 'Fotografias e objetos', page: { width: 560, height: 1700 }, background: '#6a6a70', era: '1960', tom: 'cotidiano', tags: ['foto', 'cabine', 'tira', 'fotomatic'],
    layers: [
      BOX('Mesa', { x: 0, y: 0, w: 560, h: 1700 }, { fill: '#6a6a70' }), BOX('Sombra da tira', { x: 70, y: 70, w: 440, h: 1580 }, { fill: '#000', opacity: 0.35 }),
      IMG('Papel fotográfico', 'casa-papel-papel-fotografico-usado', { x: 50, y: 40, w: 440, h: 1580 }),
      ...[RET.rapaz, RET.mulher, RET.rapaz, RET.mulher].flatMap((id, i) => [FOTO(`Foto ${i + 1}`, id, { x: 80, y: 80 + i * 380, w: 380, h: 350 }, { field: i === 0 ? 'Fotos' : undefined, filter: { grayscale: 1, contrast: 0.2 + i * 0.05, brightness: i % 2 ? 0.05 : -0.03 } }), BOX(`Borda ${i + 1}`, { x: 80, y: 80 + i * 380, w: 380, h: 350 }, { stroke: '#f6f4ee', weight: 6 })]),
      ...age('usado', 1114, { width: 560, height: 1700 }, 0.8).filter(l => l.kind === 'effect'),
      T('Data da cabine', 'FOTO-EXPRESSA · 14/03/1964', { x: 80, y: 1580, w: 380, h: 30 }, { family: 'Courier Prime', size: 16, color: '#444444', style: 'clean', wear: 0.2 }),
    ],
  }),
  modelo({
    slug: 'negativo-filme', name: 'Negativo de filme', category: 'Fotografias e objetos', page: { width: 1700, height: 700 }, background: '#1a1410', era: '1970', tom: 'investigação', tags: ['foto', 'negativo', 'filme', 'laranja'],
    layers: [
      BOX('Tira de filme', { x: 30, y: 60, w: 1640, h: 580 }, { fill: '#b8591a' }), fx('Base laranja do filme', 'damp', { blend: 'multiply', opacity: 0.3, amount: 0.5, params: { color: '#6a2a08' }, seed: 1115 }),
      ...Array.from({ length: 24 }, (_, i) => [BOX(`Furo superior ${i + 1}`, { x: 52 + i * 68, y: 80, w: 28, h: 22 }, { fill: '#1a1410', radius: 5 }), BOX(`Furo inferior ${i + 1}`, { x: 52 + i * 68, y: 598, w: 28, h: 22 }, { fill: '#1a1410', radius: 5 })]).flat(),
      ...[RET.bigode, 'casa-foto-lugar-casarao-1895', RET.mulher].flatMap((id, i) => [FOTO(`Quadro ${i + 1}`, id, { x: 70 + i * 540, y: 130, w: 500, h: 440 }, { field: i === 0 ? 'Fotos' : undefined, filter: { invert: true, grayscale: 1, sepia: 0.3, contrast: 0.1 } }), BOX(`Moldura do quadro ${i + 1}`, { x: 70 + i * 540, y: 130, w: 500, h: 440 }, { stroke: '#7a3a10', weight: 5 }), T(`Número do quadro ${i + 1}`, `${14 + i}A`, { x: 90 + i * 540, y: 100, w: 90, h: 28 }, { family: 'Courier Prime', size: 18, color: '#0c0805', style: 'clean', wear: 0 })]),
      T('Marca do filme', 'KODAK  SAFETY FILM  5063', { x: 700, y: 20, w: 600, h: 30 }, { family: 'Courier Prime', size: 18, color: '#f0b060', style: 'clean', wear: 0.2 }),
      fx('Riscos do negativo', 'crumple', { blend: 'soft-light', opacity: 0.5, amount: 0.3, params: { creases: 6 }, seed: 1116 }),
    ],
  }),
  modelo({
    slug: 'etiqueta-fita-vhs', name: 'Etiqueta de fita VHS', category: 'Fotografias e objetos', page: { width: 1100, height: 700 }, background: '#4a4a50', era: '1990', tom: 'horror', tags: ['vhs', 'fita', 'etiqueta', 'objeto', 'vídeo'],
    layers: [
      BOX('Mesa', { x: 0, y: 0, w: 1100, h: 700 }, { fill: '#4a4a50' }), IMG('Fita VHS', 'casa-objeto-fita-vhs', { x: 80, y: 60, w: 940, h: 520 }),
      IMG('Etiqueta', 'casa-objeto-etiqueta-vhs', { x: 150, y: 110, w: 800, h: 160 }, { rot: -0.5 }),
      T('Título', 'NÃO ASSISTIR SOZINHO', { x: 190, y: 160, w: 720, h: 60 }, { family: 'Permanent Marker', size: 44, color: '#1c2a5a', style: 'handwriting', wear: 0.25, rot: -0.5, field: 'Título' }), T('Data', '14/03/1993', { x: 700, y: 222, w: 220, h: 36 }, { family: 'Caveat', size: 32, color: '#a3182b', style: 'handwriting', wear: 0.2, rot: -0.5, field: 'Data' }),
      T('Nota da lombada', 'FITA 417 · SOLAR', { x: 150, y: 600, w: 800, h: 40 }, { family: 'Courier Prime', size: 26, bold: true, color: '#e8e4d6', style: 'clean', wear: 0.2 }),
      fx('Poeira da fita', 'grain', { blend: 'soft-light', opacity: 0.3, amount: 0.5, seed: 1117 }),
    ],
  }),
  modelo({
    slug: 'carteira-investigador', name: 'Carteira de investigador', category: 'Fotografias e objetos', page: { width: 1500, height: 900 }, background: '#3a2f25', era: '1980', tom: 'investigação', org: 'delegacia', tags: ['carteira', 'distintivo', 'identificação', 'objeto'],
    layers: [
      IMG('Mesa', 'casa-superficie-wood060', { x: 0, y: 0, w: 1500, h: 900 }),
      BOX('Sombra', { x: 90, y: 110, w: 1340, h: 720 }, { fill: '#000', opacity: 0.45, radius: 30 }),
      IMG('Couro (esquerda)', 'casa-superficie-leather026', { x: 70, y: 80, w: 660, h: 720 }), IMG('Couro (direita)', 'casa-superficie-leather026', { x: 740, y: 80, w: 690, h: 720 }), BOX('Costura esquerda', { x: 100, y: 110, w: 600, h: 660 }, { stroke: '#8a7a5a', weight: 2, dash: [10, 8], radius: 10 }), BOX('Costura direita', { x: 770, y: 110, w: 630, h: 660 }, { stroke: '#8a7a5a', weight: 2, dash: [10, 8], radius: 10 }),
      IMG('Distintivo', 'casa-emblema-policia-estrela', { x: 190, y: 220, w: 440, h: 440 }, { opacity: 0.95 }), T('Inscrição do distintivo', 'POLÍCIA CIVIL · INVESTIGADOR', { x: 120, y: 690, w: 580, h: 50 }, { family: 'Oswald', size: 30, align: 'center', color: '#d8b66a', style: 'clean', wear: 0 }),
      BOX('Cartão de identidade', { x: 830, y: 150, w: 520, h: 560 }, { fill: '#f1ecde', radius: 14, stroke: '#cbc3a8', weight: 2 }),
      FOTO('Foto', RET.hussardo, { x: 860, y: 190, w: 200, h: 260 }, { field: 'Foto' }),
      T('Nome', 'Cássio Prado\nInvestigador de 1ª classe', { x: 1080, y: 190, w: 250, h: 150 }, { family: 'Courier Prime', size: 24, bold: true, color: INK, field: 'Nome' }),
      T('Matrícula', 'Matrícula\n2218', { x: 1080, y: 360, w: 250, h: 90 }, { family: 'Courier Prime', size: 26, color: INK, field: 'Matrícula' }),
      T('Texto legal', 'Válida em todo o território nacional. Porte de arma sujeito a portaria. Em caso de perda, comunicar à Corregedoria.', { x: 860, y: 480, w: 470, h: 130 }, { family: 'Courier Prime', size: 19, color: '#444', style: 'clean', wear: 0.1 }),
      IMG('Carimbo', 'casa-carimbo-br-autenticado', { x: 1150, y: 560, w: 170, h: 170 }, { blend: 'multiply', opacity: 0.7, rot: 8 }),
    ],
  }),
  // ---------------------------------------------------------------- Cotidiano
  modelo({
    slug: 'cardapio-restaurante', name: 'Cardápio de restaurante', category: 'Cotidiano', page: { width: 1100, height: 1500 }, background: '#d7c9a6', era: '1950', tom: 'cotidiano', tags: ['cardápio', 'restaurante', 'art déco', 'preços'],
    layers: [
      ...base({ page: { width: 1100, height: 1500 }, paper: 'oficio-creme', age: 'usado', aging: 'usado', seed: 1121, intensity: 0.8 }),
      IMG('Moldura art déco', 'casa-moldura-art-deco-1', { x: 40, y: 40, w: 1020, h: 1420 }),
      T('Restaurante', 'RESTAURANTE\nO GALO DOURADO', { x: 150, y: 140, w: 800, h: 190 }, { family: 'Cinzel', size: 66, bold: true, align: 'center', color: '#5a3a14', style: 'clean', wear: 0.05, field: 'Restaurante', lh: 1.1 }),
      IMG('Divisória', 'casa-ornamento-divisoria-losangos', { x: 300, y: 340, w: 500, h: 56 }, { blend: 'multiply', opacity: 0.8 }),
      T('Pratos', 'Consommé de galinha\nFilé à Parmegiana com batatas\nBacalhau à Gomes de Sá\nFrango com quiabo\nPudim de leite\nSorvete de creme\nCafé expresso\nVinho tinto da casa (a taça)', { x: 170, y: 440, w: 560, h: 780 }, { family: 'Playfair Display', size: 34, color: '#2a1f14', style: 'clean', wear: 0.05, lh: 1.7, field: 'Pratos' }),
      T('Preços', 'Cr$ 18,00\nCr$ 42,00\nCr$ 56,00\nCr$ 38,00\nCr$ 14,00\nCr$ 12,00\nCr$ 6,00\nCr$ 15,00', { x: 760, y: 440, w: 200, h: 780 }, { family: 'Playfair Display', size: 34, color: '#7a1f14', align: 'right', style: 'clean', wear: 0.05, lh: 1.7 }),
      T('Rodapé', 'Rua Direita, 218 · Vila Aurora · Fone 22-4107\nAberto das 11h às 23h · Aos domingos, almoço em família', { x: 150, y: 1290, w: 800, h: 100 }, { family: 'Playfair Display', size: 24, italic: true, align: 'center', color: '#5a3a14', style: 'clean', wear: 0.05 }),
      IMG('Mancha de vinho', 'casa-manchas-cafe-3', { x: 640, y: 1100, w: 260, h: 260 }, { blend: 'multiply', opacity: 0.5 }),
    ],
  }),
  modelo({
    slug: 'lista-compras', name: 'Lista de compras', category: 'Cotidiano', page: { width: 900, height: 1000 }, background: '#d7d2c6', era: 'hoje', tom: 'cotidiano', tags: ['lista', 'compras', 'post-it', 'manuscrito'],
    layers: [
      BOX('Mesa', { x: 0, y: 0, w: 900, h: 1000 }, { fill: '#d7d2c6' }), IMG('Post-it', 'casa-investigacao-postit-amarelo', { x: 140, y: 90, w: 640, h: 640 }, { rot: -2 }),
      T('Itens', 'pão\nleite\ncafé\nfósforos\npilhas (!!)\nvelas\nsal grosso\nlanterna', { x: 250, y: 220, w: 430, h: 480 }, { family: 'Caveat', size: 56, color: '#1c2a5a', style: 'handwriting', wear: 0.2, lh: 1.15, rot: -2, field: 'Itens' }),
      IMG('Riscado 1', 'casa-rabisco-risco-reto', { x: 245, y: 255, w: 190, h: 40 }, { blend: 'multiply', rot: -2 }), IMG('Riscado 2', 'casa-rabisco-risco-reto', { x: 245, y: 315, w: 190, h: 40 }, { blend: 'multiply', rot: -2 }), IMG('Riscado 3', 'casa-rabisco-risco-reto', { x: 245, y: 375, w: 190, h: 40 }, { blend: 'multiply', rot: -2 }),
      IMG('Círculo no item', 'casa-rabisco-circulo-simples', { x: 235, y: 500, w: 300, h: 110 }, { blend: 'multiply', rot: -2 }),
      fx('Sombra do post-it', 'damp', { opacity: 0.15, amount: 0.3, params: { color: '#3a2a1a' }, seed: 1122 }),
    ],
  }),
  modelo({
    slug: 'conta-de-luz', name: 'Conta de luz', category: 'Cotidiano', era: '1980', tom: 'cotidiano', tags: ['conta', 'luz', 'formulário', 'consumo'],
    layers: [
      ...formulario({ paper: 'formulario-continuo', age: 'usado', seed: 1123, aging: 'usado', font: 'Courier Prime', margin: 150, title: ['COMPANHIA PAULISTA DE FORÇA E LUZ', 'CONTA DE ENERGIA ELÉTRICA'], titleSize: 27,
        rows: [['Titular', 'Cornélio de A. Pinhais'], ['Endereço', 'Estrada Velha, km 7 — Vila Aurora'], ['Valor', 'Cr$ 18.420,00'], ['Vencimento', '10/04/1987']],
        sections: [{ h: 'Consumo (kWh)', field: 'Consumo', size: 22, text: 'Leitura anterior: 41.002 · Leitura atual: 41.388 · Consumo do mês: 386 kWh (média dos últimos seis meses: 118 kWh)' }],
        signatures: [], extras: [...[['Out', 100], ['Nov', 110], ['Dez', 120], ['Jan', 105], ['Fev', 115], ['Mar', 386]].flatMap(([m, kwh], i) => [BOX(`Barra ${m}`, { x: 190 + i * 150, y: 1280 - kwh * 1.7, w: 100, h: kwh * 1.7 }, { fill: i === 5 ? '#b3261e' : '#3a5a7a' }), T(`Mês ${m}`, m, { x: 190 + i * 150, y: 1290, w: 100, h: 30 }, { family: 'Courier Prime', size: 20, align: 'center', style: 'clean', wear: 0 })]), RULE(170, 1285, 920, { color: '#222', weight: 2, name: 'Eixo do gráfico' }), barcode('8470001283860', { x: 150, y: 1420, width: 480, height: 90 }),
          IMG('Carimbo de pago', 'casa-carimbo-pago', { x: 780, y: 1380, w: 260, h: 130 }, { blend: 'multiply', opacity: 0.75, rot: -8 }), T('Aviso', 'AVISO: consumo muito acima da média. Verifique sua instalação.', { x: 150, y: 1550, w: 940, h: 50 }, { family: 'Courier Prime', size: 22, bold: true, color: '#b3261e' })] }),
    ],
  }),
  modelo({
    slug: 'extrato-bancario', name: 'Extrato bancário', category: 'Cotidiano', era: '1990', tom: 'investigação', org: 'banco', tags: ['banco', 'extrato', 'lançamentos', 'formulário'],
    layers: (() => {
      const t = { y: 600, size: 22, columns: [{ h: 'Data', w: 150, key: 'd' }, { h: 'Histórico', w: 520, key: 'h' }, { h: 'Valor (Cr$)', w: 190, key: 'v', align: 'right' }, { h: 'Saldo', w: 190, key: 's', align: 'right' }], rows: [
        { d: '02/03', h: 'SALDO ANTERIOR', v: '', s: '41.200,00' }, { d: '04/03', h: 'COMPRA CARTÃO · FARMÁCIA SÃO GABRIEL', v: '-186,40', s: '41.013,60' }, { d: '09/03', h: 'DEPÓSITO · ESPÉCIE', v: '2.000,00', s: '43.013,60' }, { d: '11/03', h: 'SAQUE · CAIXA ELETRÔNICO 3', v: '-500,00', s: '42.513,60' }, { d: '14/03', h: 'TRANSFERÊNCIA · CORNÉLIO A PINHAIS', v: '-38.000,00', s: '4.513,60' }, { d: '15/03', h: 'TARIFA DE MANUTENÇÃO', v: '-42,00', s: '4.471,60' }] };
      return [...formulario({ org: 'banco', emblem: EMB('banco'), paper: 'papel-timbrado-bancario', age: 'usado', seed: 1124, aging: 'usado', intensity: 0.6, title: ['BANCO COMERCIAL DO PLANALTO', 'EXTRATO DE CONTA CORRENTE'], titleSize: 26,
        rows: [['Titular', 'Edmundo Vaz Cavalcanti'], ['Agência', '0417-3 · Vila Aurora'], ['Conta', '112.388-0', { col: 2 }]], signatures: [], extras: [...tabela({ ...t, ink: INK, name: 'Lançamentos' }), IMG('Círculo no valor', 'casa-rabisco-circulo-duplo', { x: 600, y: 820, w: 420, h: 110 }, { blend: 'multiply', opacity: 0.9 }), T('Nota à mão', 'quem recebeu isso??', { x: 760, y: 930, w: 360, h: 60 }, { family: 'Caveat', size: 40, color: '#b3261e', style: 'handwriting', wear: 0.15, rot: -4 }), T('Rodapé', 'Ouvidoria 0800 41 7000 · Este extrato não serve como comprovante de quitação', { x: 110, y: 1620, w: 1020, h: 40 }, { family: 'Courier Prime', size: 17, color: '#555', style: 'clean', wear: 0.1, align: 'center' })] })];
    })(),
  }),
  modelo({
    slug: 'cheque-bancario', name: 'Cheque', category: 'Cotidiano', page: { width: 1600, height: 700 }, background: '#c9c4b6', era: '1970', tom: 'investigação', org: 'banco', tags: ['banco', 'cheque', 'guilhochê', 'assinatura', 'formulário'],
    layers: [
      IMG('Papel de cheque', 'casa-papel-papel-timbrado-bancario-usado', { x: 0, y: 0, w: 1600, h: 700 }), ...age('usado', 1125, { width: 1600, height: 700 }, 0.5),
      IMG('Guilhochê', 'casa-codigo-guilhoche-verde', { x: 1000, y: 60, w: 520, h: 520 }, { blend: 'multiply', opacity: 0.5 }),
      T('Banco', 'BANCO COMERCIAL DO PLANALTO S.A.', { x: 70, y: 40, w: 900, h: 50 }, { family: 'Old Standard TT', size: 34, bold: true, color: '#1f3a28', style: 'clean', wear: 0 }), T('Número', 'Nº 000417', { x: 1280, y: 40, w: 260, h: 44 }, { family: 'Courier Prime', size: 30, bold: true, color: '#a3182b', align: 'right', style: 'clean', wear: 0 }),
      T('Valor', 'Cr$ 38.000,00', { x: 1150, y: 130, w: 390, h: 60 }, { family: 'Courier Prime', size: 38, bold: true, color: INK, align: 'right', field: 'Valor' }),
      T('Texto', 'Pague por este cheque a quantia de', { x: 70, y: 150, w: 800, h: 40 }, { family: 'Old Standard TT', size: 24, italic: true, color: '#1f3a28', style: 'clean', wear: 0 }),
      T('Por extenso', 'trinta e oito mil cruzeiros ************', { x: 70, y: 210, w: 1470, h: 56 }, { family: 'Courier Prime', size: 34, color: INK, field: 'Por extenso' }),
      T('Favorecido', 'ao portador: Cornélio de Albuquerque Pinhais', { x: 70, y: 310, w: 1100, h: 56 }, { family: 'Courier Prime', size: 34, color: INK, field: 'Favorecido' }),
      T('Local e data', 'Vila Aurora, 14 de março de 1976', { x: 70, y: 410, w: 800, h: 44 }, { family: 'Courier Prime', size: 28, color: INK, field: 'Data' }),
      T('Assinatura', 'E. Vaz Cavalcanti', { x: 950, y: 440, w: 560, h: 90 }, { family: 'Homemade Apple', size: 52, color: '#1c2a5a', style: 'handwriting', wear: 0.2, field: 'Assinatura' }), RULE(950, 540, 560, { color: '#444' }),
      T('Linha magnética', '⑆ 0417 ⑈ 00112388 ⑉ 000417 ⑆', { x: 70, y: 600, w: 1000, h: 50 }, { family: 'Share Tech Mono', size: 34, color: '#222', style: 'clean', wear: 0 }),
      IMG('Carimbo de compensado', 'casa-carimbo-br-protocolo', { x: 440, y: 440, w: 340, h: 200 }, { blend: 'multiply', opacity: 0.65, rot: -7 }),
    ],
  }),
  modelo({
    slug: 'bilhete-cinema', name: 'Bilhete de cinema', category: 'Cotidiano', page: { width: 1000, height: 450 }, background: '#d0c8b4', era: '1950', tom: 'cotidiano', tags: ['ingresso', 'cinema', 'picote', 'sessão'],
    layers: [
      ...base({ page: { width: 1000, height: 450 }, paper: 'papel-de-recibo', age: 'usado', aging: 'usado', seed: 1126, intensity: 0.7, cut: ['picote', { seed: 1126 }] }),
      T('Cinema', 'CINE METRÓPOLE', { x: 60, y: 40, w: 600, h: 70 }, { family: 'Cinzel', size: 52, bold: true, color: '#7a1f14', style: 'clean', wear: 0.1 }),
      T('Filme', 'A SOMBRA NO PORÃO', { x: 60, y: 130, w: 640, h: 70 }, { family: 'Playfair Display', size: 46, bold: true, color: INK, style: 'clean', wear: 0.1, field: 'Filme' }),
      T('Sessão', 'Sessão das 20h · Poltrona 14-F · Cr$ 12,00', { x: 60, y: 230, w: 720, h: 50 }, { family: 'Courier Prime', size: 30, color: INK, field: 'Sessão' }),
      T('Rodapé', 'Proibido para menores de 14 anos · Não se devolve o dinheiro', { x: 60, y: 310, w: 780, h: 40 }, { family: 'Courier Prime', size: 20, color: '#555', style: 'clean', wear: 0.1 }),
      RULE(760, 40, 0, { color: '#8a7a5a', weight: 2, name: 'Picote do canhoto' }), T('Número', 'Nº 02417', { x: 790, y: 60, w: 190, h: 50 }, { family: 'Courier Prime', size: 30, bold: true, color: '#a3182b', style: 'clean', wear: 0.1 }),
      T('Canhoto', 'CANHOTO\nPOLTRONA 14-F', { x: 790, y: 160, w: 190, h: 120 }, { family: 'Courier Prime', size: 22, color: INK, style: 'clean', wear: 0.1 }),
    ].map(l => (l.name === 'Picote do canhoto' ? { ...l, height: 360, shape: { type: 'line', stroke: '#8a7a5a', strokeWidth: 2, dash: [8, 8] } } : l)),
  }),
  // ---------------------------------------------------------------- Destruídos e composições
  modelo({
    slug: 'carta-queimada', name: 'Carta queimada', category: 'Destruídos e composições', era: '1920', tom: 'horror', org: 'solar', tags: ['carta', 'queimada', 'destruído', 'manuscrito'],
    layers: [
      ...carta({ paper: 'oficio-creme', age: 'antigo', aging: 'queimado', seed: 1131, intensity: 1, font: 'Mrs Saint Delafield', size: 58, color: '#2a1f14', top: 170, date: 'Vila Aurora, 2 de agosto de 1921', greeting: 'Minha querida Helena,', greetingField: 'Destinatário', lh: 1.3,
        body: 'se você está lendo esta carta é porque o fogo não chegou até ela, e então ainda há tempo. O que está no porão não deve ser acordado. Eu fiz o que pude: queimei os livros, selei a porta, enterrei a chave no jardim, mas ele sabe onde estou. Quando a luz da vela tremer duas vezes seguidas, não responda ao que ouvir. Vá embora da casa antes do amanhecer e leve consigo apenas',
        closing: '', signature: 'Cornélio',
        extras: [fx('Cinzas', 'grain', { blend: 'multiply', opacity: 0.3, amount: 0.6, seed: 1134 }), fx('Fumaça nas bordas', 'damp', { blend: 'multiply', opacity: 0.4, amount: 0.7, params: { color: '#2a1a0a' }, seed: 1135 }), IMG('Fuligem', 'casa-queimado-2', { x: 500, y: 1100, w: 640, h: 640 }, { blend: 'multiply', opacity: 0.6 })] }),
    ],
  }),
  modelo({
    slug: 'documento-molhado', name: 'Documento molhado', category: 'Destruídos e composições', era: '1980', tom: 'investigação', tags: ['documento', 'molhado', 'destruído', 'tinta escorrida'],
    layers: [
      ...base({ paper: 'papel-maquina', age: 'usado', aging: 'molhado', seed: 1132, intensity: 1 }),
      T('Cabeçalho', 'RELATÓRIO PRELIMINAR · POÇO DO SOLAR DOS PINHAIS', { x: 110, y: 100, w: 1020, h: 90 }, { family: 'Courier Prime', size: 30, bold: true, color: '#1d1b24', wear: 0.9 }),
      T('Texto', 'O poço foi esvaziado em 11/05/1982. No fundo, a 18 metros, foram encontrados: um relógio de bolso parado às 3h07; três chaves de ferro; ossos de pequenos animais; e uma caixa de madeira lacrada, que não foi aberta. A água subiu novamente em menos de seis horas, sem chuva nem nascente conhecida. O nível não baixa quando se retira água. Recomenda-se interditar o terreno e não beber da fonte da propriedade.', { x: 110, y: 230, w: 1020, h: 860 }, { family: 'Courier Prime', size: 31, color: '#1d1b24', wear: 0.95, lh: 1.5, field: 'Texto' }),
      fx('Tinta escorrida', 'damp', { blend: 'multiply', opacity: 0.35, amount: 0.8, params: { color: '#5a5a70' }, seed: 1133 }), IMG('Gotas d’água', 'casa-agua-umidade-4', { x: 150, y: 500, w: 700, h: 700 }, { blend: 'multiply', opacity: 0.45 }),
      fx('Grão do papel úmido', 'grain', { blend: 'soft-light', opacity: 0.3, amount: 0.5, seed: 1136 }), IMG('Mancha de umidade', 'casa-agua-umidade-1', { x: 0, y: 900, w: 700, h: 700 }, { blend: 'multiply', opacity: 0.4 }),
      T('Assinatura', 'Eng. R. Mendes', { x: 640, y: 1330, w: 500, h: 70 }, { family: 'Homemade Apple', size: 40, color: '#1c2a5a', style: 'handwriting', wear: 0.9 }),
    ],
  }),
  modelo({
    slug: 'pagina-rasgada-pedacos', name: 'Página rasgada em pedaços', category: 'Destruídos e composições', page: { width: 1300, height: 1700 }, background: '#6a5a46', era: '1950', tom: 'horror', tags: ['página', 'rasgada', 'pedaços', 'fita', 'composição'],
    layers: (() => {
      const pecas = [
        { x: 100, y: 120, w: 560, h: 740, rot: -3, seed: 1141, txt: 'Se alguém ler isto, a casa já terá me levado.' },
        { x: 640, y: 150, w: 560, h: 700, rot: 2, seed: 1142, txt: 'Os três sinais são: o cheiro de terra, a vela que treme duas vezes, e a porta que se abre sem vento.' },
        { x: 120, y: 860, w: 540, h: 700, rot: 1.5, seed: 1143, txt: 'Nunca desça sozinho. Nunca diga o nome dela em voz alta. Nunca,' },
        { x: 650, y: 850, w: 560, h: 720, rot: -2, seed: 1144, txt: 'em hipótese alguma, responda quando ela chamar pelo seu nome. Eu respondi.' },
      ];
      const out = [IMG('Mesa', 'casa-superficie-wood060', { x: 0, y: 0, w: 1300, h: 1700 })];
      pecas.forEach((p, i) => {
        out.push(IMG(`Pedaço ${i + 1} (papel)`, 'casa-papel-oficio-creme-antigo', { x: p.x, y: p.y, w: p.w, h: p.h }, { rot: p.rot }));
        const ent = silhouette('rasgado-bordas', { seed: p.seed, page: { width: p.w, height: p.h } });
        out.push({ ...ent, name: `Pedaço ${i + 1} (rasgo)`, x: p.x, y: p.y, width: p.w, height: p.h, rotation: p.rot, clip: true });
        out.push(T(`Pedaço ${i + 1}`, p.txt, { x: p.x + 50, y: p.y + 70, w: p.w - 100, h: p.h - 140 }, { family: 'Mrs Saint Delafield', size: 56, color: '#2a1f14', style: 'handwriting', wear: 0.25, rot: p.rot, lh: 1.3, field: `Pedaço ${i + 1}` }));
      });
      out.push(IMG('Fita da junção 1', 'casa-fita-crepe-longa', { x: 420, y: 800, w: 460, h: 90 }, { rot: 18 }), IMG('Fita da junção 2', 'casa-fita-crepe-media', { x: 540, y: 400, w: 300, h: 80 }, { rot: 82 }), IMG('Fita da junção 3', 'casa-fita-crepe-media', { x: 540, y: 1140, w: 300, h: 80 }, { rot: 78 }));
      return out;
    })(),
  }),
  modelo({
    slug: 'mesa-investigacao', name: 'Mesa de investigação', category: 'Destruídos e composições', page: { width: 1700, height: 1200 }, background: '#4a3a2a', era: 'hoje', tom: 'investigação', tags: ['mesa', 'composição', 'documentos', 'polaroides', 'investigação'],
    layers: [
      IMG('Madeira da mesa', 'casa-superficie-wood026', { x: 0, y: 0, w: 1700, h: 1200 }),
      ...[[110, 90, 560, 760, -4, 'casa-papel-oficio-branco-usado'], [200, 120, 560, 760, 3, 'casa-papel-oficio-creme-usado'], [260, 150, 560, 760, -1, 'casa-papel-papel-maquina-usado']].map(([x, y, w, h, r, id], i) => IMG(`Documento ${i + 1}`, id, { x, y, w, h }, { rot: r, _field: i === 2 ? 'Documentos' : undefined })),
      T('Texto do documento de cima', 'RELATÓRIO DE OCORRÊNCIA\nSolar dos Pinhais\n\nA equipe entrou às 22h. O porão estava aberto. Não havia ninguém. Havia, porém, uma cadeira no centro da sala, virada para a parede norte, e quatro velas ainda quentes.', { x: 300, y: 200, w: 440, h: 560 }, { family: 'Courier Prime', size: 25, color: INK, rot: -1, lh: 1.4, field: 'Texto' }),
      ...[[1010, 110, RET.bigode, 6], [1280, 190, RET.mulher, -5], [1050, 520, RET.oficial, -3]].flatMap(([x, y, id, r], i) => [IMG(`Moldura polaroide ${i + 1}`, 'casa-moldura-polaroide', { x, y, w: 300, h: 360 }, { rot: r }), FOTO(`Polaroide ${i + 1}`, id, { x: x + 22, y: y + 22, w: 256, h: 256 }, { rot: r, field: i === 0 ? 'Fotos' : undefined })]),
      BOX('Pires da xícara', { x: 1280, y: 660, w: 260, h: 260 }, { type: 'ellipse', fill: '#e8e4d8', stroke: '#9a958a', weight: 4 }), BOX('Xícara', { x: 1315, y: 695, w: 190, h: 190 }, { type: 'ellipse', fill: '#f4f1ea', stroke: '#9a958a', weight: 4 }), BOX('Café', { x: 1340, y: 720, w: 140, h: 140 }, { type: 'ellipse', fill: '#3a2010' }), BOX('Asa da xícara', { x: 1500, y: 770, w: 70, h: 50 }, { type: 'ellipse', stroke: '#9a958a', weight: 10 }),
      BOX('Lupa · lente', { x: 780, y: 820, w: 250, h: 250 }, { type: 'ellipse', stroke: '#3a2a1a', weight: 14, fill: '#cfe3f01a' }), BOX('Lupa · cabo', { x: 1010, y: 1040, w: 200, h: 34 }, { fill: '#3a2a1a', radius: 16, rot: 40 }), BOX('Lupa · brilho', { x: 820, y: 860, w: 90, h: 50 }, { type: 'ellipse', fill: '#ffffff', opacity: 0.4, rot: -30 }),
      IMG('Barbante', 'casa-investigacao-barbante-curvo', { x: 760, y: 340, w: 360, h: 130 }, { rot: 4 }), IMG('Post-it', 'casa-investigacao-postit-azul', { x: 640, y: 900, w: 180, h: 180 }, { rot: -6 }),
      BOX('Luz do abajur', { x: 0, y: 0, w: 1700, h: 1200 }, { fill: '#ffdca0', opacity: 0.08, blend: 'screen' }), IMG('Poeira da mesa', 'casa-sujeira-2', { x: 120, y: 700, w: 640, h: 440 }, { blend: 'multiply', opacity: 0.3 }), BOX('Sombra da borda da mesa', { x: 0, y: 1100, w: 1700, h: 100 }, { fill: '#1a0f06', opacity: 0.3, blend: 'multiply' }),
    ],
  }),
  modelo({
    slug: 'envelope-evidencias', name: 'Envelope de evidências', category: 'Destruídos e composições', page: { width: 1300, height: 1100 }, background: '#4a4540', era: '1990', tom: 'investigação', org: 'delegacia', tags: ['evidência', 'envelope', 'lacre'],
    layers: [
      IMG('Mesa', 'casa-superficie-metal032', { x: 0, y: 0, w: 1300, h: 1100 }),
      BOX('Sombra', { x: 150, y: 160, w: 1000, h: 800 }, { fill: '#000', opacity: 0.4, radius: 8 }), IMG('Envelope', 'casa-objeto-envelope-pardo-cordao', { x: 120, y: 120, w: 1000, h: 711 }),
      IMG('Etiqueta de evidência', 'casa-etiqueta-evidencia', { x: 560, y: 380, w: 400, h: 240 }, { rot: -3 }),
      T('Número', 'EV-1993-0417', { x: 600, y: 440, w: 320, h: 50 }, { family: 'Courier Prime', size: 30, bold: true, color: '#a3182b', rot: -3, field: 'Número' }),
      T('Conteúdo', 'Conteúdo: 1 chave de ferro, 1 fita VHS, fotografias (6)', { x: 150, y: 640, w: 700, h: 120 }, { family: 'Caveat', size: 42, color: '#1c2a5a', style: 'handwriting', wear: 0.2, rot: -1.5, field: 'Conteúdo' }),
      IMG('Fita de evidência', 'casa-fita-isolante-diagonal', { x: 90, y: 150, w: 360, h: 100 }, { rot: -20 }), IMG('Fita de evidência 2', 'casa-fita-isolante-diagonal', { x: 790, y: 650, w: 360, h: 100 }, { rot: -20 }),
      IMG('Carimbo', 'casa-carimbo-evidencia', { x: 180, y: 480, w: 330, h: 130 }, { blend: 'multiply', opacity: 0.8, rot: 6 }),
      IMG('Assinatura de custódia', 'casa-prendedor-clipe-prata-2', { x: 1000, y: 150, w: 60, h: 140 }, { rot: 8 }),
      fx('Poeira do plástico', 'grain', { blend: 'soft-light', opacity: 0.25, amount: 0.5, seed: 1153 }),
    ],
  }),
];
