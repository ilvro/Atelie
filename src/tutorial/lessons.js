/**
 * Lessons as data. A lesson is a list of steps; a step says
 *
 *   say     the instruction, one sentence
 *   why     optional explanation shown under it
 *   target  what to point at, by the selectors the interface already uses
 *   done    the condition that completes it (see conditions.js); `['read']` waits for "Continuar"
 *   tab     the inspector tab the target lives in ('layers', 'properties', 'fill', 'history'), opened before pointing
 *   drawer  the drawer the target lives in ('library', 'templates', 'documents', 'export'), opened before pointing
 *   try     "agora sozinho": no ring, only the goal; the card offers "Mostrar onde" after a while
 *   hint    optional text for "Mostrar o valor" (otherwise taken from the `fill` and `select` gestures of `act`)
 *   learn   on closing: what the step taught, a phrase or [key, what it does]
 *   act     how a test performs the step: 'click' (the target, default), 'continue', ['fill', selector, text],
 *           ['select', selector, value], ['click', selector], ['key', name], ['upload', selector, fixture],
 *           ['draw', [[x, y], …]] (a drag on the page, in page units), ['wait', ms] (let a panel finish drawing),
 *           or a list of these done in order
 *
 * `start` says what a lesson opens on the practice tab: 'blank' (an empty A4), 'text' (with a text layer),
 * 'rect' (with a rectangle) or a template id; `secret: true` adds a text only the UV light shows. A lesson on a practice tab never touches the person's own documents.
 * Nothing here is interface code: adding a lesson is adding an entry. Every lesson is run by
 * tests/e2e/tutorials.test.js, which fails when a target disappears or a condition can no longer be met.
 */

const LIBRARY = '.rail-btn[data-action="library"]';
const SEARCH = '.library-search-input';
const ADD_TEXT = [['click', '[data-action="toggle-add-menu"]'], ['click', '[data-add="text"]']];

/** Search the library and click one item: the ring points at the search box, the step ends when the layer exists. */
const useItem = (word, id, name, say, extra = {}) => ({
  say: say ?? `Busque <b>${word}</b> e clique em <b>${name}</b>.`,
  target: SEARCH,
  drawer: 'library',
  done: ['layerFrom', id],
  act: [['click', '.library-type-chips [data-type="elements"]'], ['fill', SEARCH, word], ['click', `.library-item-card[data-id="${id}"]`]],
  ...extra,
});

/** Open a template from the Modelos drawer: three clicks the person does by hand. */
const openTemplate = (id, title) => [
  { say: 'Abra <b>Modelos</b> no trilho.', target: '.rail-btn[data-action="templates"]', done: ['drawer', 'templates'] },
  { say: `Clique em <b>${title}</b>.`, target: `.template-card[data-id="${id}"]`, drawer: 'templates', done: ['templateDetail'] },
  { say: 'Clique em <b>Usar este modelo</b>.', target: '[data-action="use-template"]', drawer: 'templates', done: ['docNamed', title] },
];

export const LESSONS = [
  {
    id: 'fill-template', folder: 'start', kind: 'lesson', task: ['fill'], next: 'letter-1890', minutes: 3,
    title: 'Preencher um modelo',
    summary: 'Abra a “Carta envelhecida”, troque a data e a assinatura e arquive o documento.',
    start: 'blank',
    steps: [
      { say: 'Vamos preencher um modelo pronto: o jeito mais rápido de ter um documento.', why: 'Você opera a tela de verdade; o tutorial só aponta. Cada passo avança sozinho quando o resultado aparece, e dá para sair e continuar depois.', done: ['read'], act: 'continue' },
      ...openTemplate('casa-tpl-carta-envelhecida', 'Carta envelhecida'),
      { say: 'Na aba <b>Preencher</b>, troque o campo <b>Local e data</b>.', why: 'Cada modelo marca os textos que mudam. Aqui você não mexe em camadas, só escreve.', target: '.fill-field-input[data-field-id="l-local-data"]', tab: 'fill', done: ['layerText', 'l-local-data', 'Rio de Janeiro, 3 de março de 1891'], act: ['fill', '.fill-field-input[data-field-id="l-local-data"]', 'Rio de Janeiro, 3 de março de 1891'], hint: '<b>Local e data</b>: Rio de Janeiro, 3 de março de 1891' },
      { say: 'Agora a <b>Assinatura</b>.', target: '.fill-field-input[data-field-id="l-assinatura"]', tab: 'fill', done: ['layerText', 'l-assinatura', 'Elisa Moreira'], act: ['fill', '.fill-field-input[data-field-id="l-assinatura"]', 'Elisa Moreira'], hint: '<b>Assinatura</b>: Elisa Moreira' },
      { say: 'Clique em <b>Arquivar</b> para guardar o documento.', why: 'Arquivar salva uma versão e a entrega ao Tabletop. Até lá, o que você faz fica só como rascunho.', target: '[data-action="archive"]', done: ['archived'], learn: ['Ctrl+S', 'arquivar o documento'] },
    ],
  },
  {
    id: 'letter-1890', folder: 'start', kind: 'lesson', task: ['layers', 'library'], next: 'torn-note', minutes: 8,
    title: 'Uma carta de 1890',
    summary: 'Folha em branco, papel antigo, texto em fonte de época, mancha de café, dobras e um lacre de cera.',
    start: 'blank',
    steps: [
      { say: 'Vamos fazer uma carta antiga do zero, camada por camada.', why: 'Um documento é uma pilha de camadas: papel embaixo, textos e manchas por cima.', done: ['read'], act: 'continue' },
      { say: 'Abra a <b>Biblioteca</b> no trilho.', target: LIBRARY, done: ['drawer', 'library'] },
      { say: 'Busque <b>Ofício creme</b>.', target: SEARCH, drawer: 'library', done: ['librarySearch', 'ofício creme'], act: ['fill', SEARCH, 'Ofício creme'] },
      { say: 'Clique em <b>Ofício creme (Antigo)</b>.', why: 'Papéis sempre entram no fundo da pilha: trocar de papel não esconde o que já está na página.', target: '.library-item-card[data-id="casa-papel-oficio-creme-antigo"]', drawer: 'library', done: ['layerFrom', 'casa-papel-oficio-creme-antigo'] },
      { say: 'Em <b>Camadas</b>, adicione um <b>Texto</b>.', target: '[data-action="toggle-add-menu"]', tab: 'layers', done: ['layerCount', 'text', 1], act: ADD_TEXT },
      { say: 'Em <b>Propriedades</b>, escreva <b>Prezado Dr. Alencar,</b> no conteúdo.', target: 'textarea[data-field="h:text.content"]', tab: 'properties', done: ['selectedText', 'Prezado Dr. Alencar'], act: ['fill', 'textarea[data-field="h:text.content"]', 'Prezado Dr. Alencar,'], hint: '<b>Conteúdo</b>: Prezado Dr. Alencar,' },
      { say: 'Na Biblioteca, abra a aba <b>Fontes</b>.', target: '.library-type-chips [data-type="fonts"]', drawer: 'library', done: ['libraryTab', 'fonts'] },
      { say: 'Busque <b>Baskerville</b> e clique em <b>Libre Baskerville Italic</b>.', why: 'Com um texto selecionado, clicar numa fonte troca a fonte dele.', target: SEARCH, drawer: 'library', done: ['selected', { 'text.font.library': 'casa-font-librebaskerville-italic' }], act: [['fill', SEARCH, 'Baskerville'], ['click', '.library-font-card[data-id="casa-font-librebaskerville-italic"]']] },
      { say: 'Troque a <b>Cor da tinta</b> para um marrom sépia.', why: 'Tinta velha nunca é preta pura.', target: '[data-hex="h:text.color"]', tab: 'properties', done: ['textColorNear', '#5b3a1e'], act: ['fill', '[data-hex="h:text.color"]', '#5b3a1e'], hint: '<b>Cor da tinta</b>: #5b3a1e' },
      useItem('Mancha de café', 'casa-manchas-cafe-1', 'Mancha de café · anel', undefined, { why: 'Repare: a mancha entra em <b>Multiplicação</b>. Assim ela escurece o papel em vez de cobri-lo.', learn: 'Manchas e sujeira entram em Multiplicação' }),
      useItem('Dobras', 'casa-dobras-2', 'Dobras · carta em três'),
      useItem('Lacre de cera', 'casa-lacre-vermelho-brasao', 'Lacre de cera · vermelho (com brasão)', 'Agora sozinho: ponha um <b>Lacre de cera vermelho com brasão</b> na carta.', { try: true }),
      { say: 'Arquive a carta.', target: '[data-action="archive"]', done: ['archived'] },
    ],
  },
  {
    id: 'torn-note', folder: 'start', kind: 'lesson', task: ['rotation'], next: null, minutes: 5,
    title: 'Bilhete rasgado',
    summary: 'Modelo de bilhete de caderno: girar o texto, prender com fita crepe e rasgar um canto.',
    start: 'blank',
    steps: [
      { say: 'Um bilhete escrito às pressas: tudo um pouco torto.', done: ['read'], act: 'continue' },
      ...openTemplate('casa-tpl-bilhete-caderno-rasgado', 'Bilhete de caderno rasgado'),
      { say: 'Em <b>Camadas</b>, clique em <b>Texto do bilhete</b>.', target: '.layer-item[data-id="l-texto"]', tab: 'layers', done: ['selected', { id: 'l-texto' }] },
      { say: 'Em <b>Propriedades</b>, gire o texto para <b>−2,5°</b>.', why: 'Quem escreve rápido nunca escreve reto. Um pouquinho de rotação basta.', target: '[data-field="h:rotation"]', tab: 'properties', done: ['layerNear', 'rotation', -2.5, 0.6], act: ['fill', '[data-field="h:rotation"]', '-2.5'], hint: '<b>Rotação</b>: -2,5' },
      useItem('Fita crepe', 'casa-fita-crepe-diagonal', 'Fita crepe · diagonal', 'Prenda o bilhete: busque <b>Fita crepe</b> e clique em <b>Fita crepe · diagonal</b>.'),
      useItem('Rasgo', 'casa-rasgos-3', 'Rasgo · canto arrancado'),
    ],
  },
  {
    id: 'criminal-file', folder: 'inquiry', kind: 'lesson', task: ['adjust'], next: 'invisible-ink', minutes: 8,
    title: 'Ficha criminal',
    summary: 'Preencha a ficha, ponha uma foto em preto e branco, um prendedor, o carimbo e uma tarja.',
    start: 'blank',
    steps: [
      { say: 'Uma ficha de suspeito: nome, foto, carimbo e partes riscadas.', done: ['read'], act: 'continue' },
      ...openTemplate('casa-tpl-ficha-criminal', 'Ficha criminal'),
      { say: 'Na aba <b>Preencher</b>, escreva o <b>Nome</b>: <b>Otávio Bragança</b>.', target: '.fill-field-input[data-field-id="l-nome"]', tab: 'fill', done: ['layerText', 'l-nome', 'Otávio Bragança'], act: ['fill', '.fill-field-input[data-field-id="l-nome"]', 'Otávio Bragança'], hint: '<b>Nome</b>: Otávio Bragança' },
      { say: 'Troque a <b>Foto</b>: clique em <b>Trocar imagem…</b> e envie uma imagem do computador.', target: '.fill-field-card[data-layer-id="l-foto"] button.at-btn', tab: 'fill', done: ['layerWhere', { id: 'l-foto', 'image.src.upload': { set: true } }], act: [['click', '.fill-field-card[data-layer-id="l-foto"] button.at-btn'], ['upload', '.chooser-file-input', 'foto']] },
      { say: 'Em <b>Camadas</b>, adicione um <b>Ajuste</b>.', why: 'Ajustes mudam as camadas de baixo sem mexer nelas.', target: '[data-action="toggle-add-menu"]', tab: 'layers', done: ['layerCount', 'adjust', 1], act: [['click', '[data-action="toggle-add-menu"]'], ['click', '[data-add="adjust"]']] },
      { say: 'Em <b>Propriedades</b>, tire toda a <b>Saturação</b>: <b>−100</b>.', target: '[data-field="h:adjust.saturation"]', tab: 'properties', done: ['selected', { 'adjust.saturation': -1 }], act: ['fill', '[data-field="h:adjust.saturation"]', '-100'], hint: '<b>Saturação</b>: -100' },
      { say: 'Marque <b>Recortar na camada de baixo</b>.', why: 'Com o recorte, o preto e branco vale só para a camada logo abaixo. Para a foto, ponha o ajuste logo acima dela; aqui basta marcar a opção.', target: '[data-field="h:clip"]', tab: 'properties', done: ['selected', { clip: true }], act: ['click', '[data-field="h:clip"]'] },
      useItem('Carimbo', 'casa-carimbo-confidencial', 'Carimbo · Confidencial', undefined, { why: 'Carimbos de borracha nunca ficam perfeitamente retos: este entra levemente torto, de propósito.' }),
      { say: 'Deixe o carimbo mais discreto: <b>Opacidade 85</b>.', target: '[data-field="h:opacity"]', tab: 'properties', done: ['layerNear', 'opacity', 0.85, 0.03], act: ['fill', '[data-field="h:opacity"]', '85'], hint: '<b>Opacidade</b>: 85' },
      { say: 'Agora sozinho: cubra um nome com uma <b>tarja preta</b> (um retângulo).', try: true, done: ['layerWhere', { kind: 'shape', 'shape.type': 'rect', 'shape.fill': '#000000' }], act: [['click', '.inspector-tab[data-tab="layers"]'], ['click', '[data-action="toggle-add-menu"]'], ['click', '[data-add="rect"]'], ['wait', 400], ['click', '.inspector-tab[data-tab="properties"]'], ['fill', '[data-hex="h:shape.fill"]', '#000000']] },
    ],
  },
  {
    id: 'invisible-ink', folder: 'secrets', kind: 'lesson', task: ['light'], next: 'read-as-players', minutes: 6,
    title: 'Tinta invisível',
    summary: 'Escreva um segredo que só aparece sob a luz UV e escureça a página para fazê-lo brilhar.',
    start: 'blank',
    steps: [
      { say: 'Um texto que os jogadores só leem com a lanterna de luz negra.', done: ['read'], act: 'continue' },
      { say: 'Em <b>Camadas</b>, adicione um <b>Texto</b>: a carta “normal”.', target: '[data-action="toggle-add-menu"]', tab: 'layers', done: ['layerCount', 'text', 1], act: ADD_TEXT },
      { say: 'Ligue a <b>Luz UV</b> (tecla <b>U</b>).', why: 'Com a luz UV ligada, tudo o que você criar passa a ser “só UV”.', target: '[data-action="toggle-uv"]', done: ['uvOn'], learn: ['U', 'ligar e desligar a luz UV'] },
      { say: 'Adicione um segundo <b>Texto</b>: o segredo.', target: '[data-action="toggle-add-menu"]', tab: 'layers', done: ['layersWhere', { kind: 'text', light: 'uv' }, 1], act: ADD_TEXT },
      { say: 'Escreva <b>A chave está sob o relógio</b>.', target: 'textarea[data-field="h:text.content"]', tab: 'properties', done: ['selectedText', 'sob o relógio'], act: ['fill', 'textarea[data-field="h:text.content"]', 'A chave está sob o relógio'], hint: '<b>Conteúdo</b>: A chave está sob o relógio' },
      { say: 'Desligue a luz UV: o segredo some.', target: '[data-action="toggle-uv"]', done: ['uvOff'] },
      { say: 'Tire a seleção (tecla <b>Esc</b>): sem camada selecionada, as Propriedades mostram a <b>página</b>.', target: '.inspector-tab[data-tab="properties"]', tab: 'properties', done: ['noSelection'], act: ['key', 'Escape'], learn: ['Esc', 'tirar a seleção'] },
      { say: 'Na seção <b>Luz UV na Folha</b>, ponha <b>Escurecimento</b> em 85.', why: 'Sob a luz UV a sala escurece e a tinta fluorescente brilha. Quanto mais escura a página, mais o segredo salta aos olhos.', target: '[data-field="page:uv.strength"]', tab: 'properties', done: ['pageNear', 'uv.strength', 0.85], act: ['fill', '[data-field="page:uv.strength"]', '85'], hint: '<b>Escurecimento</b>: 85' },
      { say: 'Agora sozinho: mude o <b>outro texto</b>, o que ainda é comum, para <b>só UV</b>.', try: true, done: ['layersWhere', { kind: 'text', light: 'uv' }, 2], act: [['click', '.inspector-tab[data-tab="layers"]'], ['click', '.layer-item:has(.layer-snippet):not(:has(.layer-uv-badge.is-uv))'], ['wait', 400], ['click', '.inspector-tab[data-tab="properties"]'], ['click', '.choice-field:has([data-field="h:light"]) [data-choice="uv"]']] },
    ],
  },
  {
    id: 'read-as-players', folder: 'secrets', kind: 'lesson', task: ['reader'], next: 'print-table', minutes: 3,
    title: 'Ler como os jogadores',
    summary: 'Modo Leitura: lupa, lanterna UV e virar a folha para ver o verso.',
    start: 'casa-tpl-cartao-postal-frente',
    secret: true,
    steps: [
      { say: 'Abra o <b>Modo Leitura</b> no trilho (tecla <b>P</b>).', why: 'É assim que os jogadores veem o documento: sem bancada, em tela cheia.', target: '.rail-btn[data-action="reader"]', done: ['reading'], learn: ['P', 'entrar no modo leitura'] },
      { say: 'Clique na <b>lupa</b> (tecla <b>L</b>) e passe sobre o texto.', target: '[data-action="toggle-loupe"]', done: ['loupe'], learn: ['L', 'lupa de aumento'] },
      { say: 'Ligue a <b>lanterna UV</b> (tecla <b>U</b>).', target: '[data-action="toggle-uv-lantern"]', done: ['lantern'] },
      { say: 'Clique em <b>Virar</b> (tecla <b>F</b>) para ver o verso do cartão.', target: '.reader-bar [data-action="flip-sheet"]', done: ['flipped'], learn: ['F', 'virar a folha'] },
      { say: 'Volte para a bancada com <b>Esc</b> ou no botão de fechar.', target: '[data-action="close-reader"]', done: ['reading', false] },
    ],
  },
  {
    id: 'print-table', folder: 'production', kind: 'lesson', task: ['export'], next: null, minutes: 4,
    title: 'Imprimir e levar à mesa',
    summary: 'Exporte um PNG em 300 ppp para imprimir e entenda como o documento chega ao Tabletop.',
    start: 'casa-tpl-carta-envelhecida',
    steps: [
      { say: 'Para levar o documento à mesa de verdade, exporte uma imagem.', done: ['read'], act: 'continue' },
      { say: 'Abra <b>Exportar</b> no trilho (tecla <b>E</b>).', target: '.rail-btn[data-action="export"]', done: ['drawer', 'export'], learn: ['E', 'abrir a exportação'] },
      { say: 'Clique em <b>Exportar PNG 300 ppp</b>.', why: '300 ppp é a resolução de gráfica: a folha sai com o tamanho real quando impressa.', target: '[data-action="export-print"]', drawer: 'export', done: ['exported', 'print'] },
      { say: 'No Tabletop, o documento chega sozinho.', why: 'Cada vez que você arquiva, o Ateliê entrega a versão nova ao Tabletop (se “Compartilhar com o Tabletop” estiver ligado em Ajustes). Lá, dê um clique em “Do ateliê…” para pôr o documento na mesa.', done: ['read'], act: 'continue' },
    ],
  },
  {
    id: 'tabs-mesa', folder: 'news', kind: 'lesson', task: ['tabs'], next: null, minutes: 3, since: '2026-10-26',
    title: 'Abas de documentos e a Mesa',
    summary: 'Abra vários documentos ao mesmo tempo, volte à Mesa sem fechar nada e troque de aba.',
    start: 'blank',
    steps: [
      { say: 'Cada documento aberto ganha a sua aba, como num editor de imagens.', done: ['read'], act: 'continue' },
      { say: 'Abra <b>Documentos</b> e clique em <b>Novo Documento</b>.', why: 'O novo documento abre numa aba nova, sem fechar o atual.', target: '.nav-new-doc-btn', drawer: 'documents', done: ['practiceTabs', 2], act: ['click', '.nav-new-doc-btn'] },
      { say: 'Clique na aba <b>Mesa</b>, a primeira.', why: 'A Mesa é a tela de início. As outras abas continuam abertas com tudo o que você fez.', target: '.desk-tab.is-mesa', done: ['onMesa'] },
      { say: 'Clique em uma das abas de documento para voltar.', target: '.desk-tab-list .desk-tab', done: ['onDocument'], learn: ['Ctrl+Tab', 'passar para a aba seguinte; Ctrl+W fecha a aba'] },
    ],
  },
  {
    id: 'front-back', folder: 'news', kind: 'lesson', task: ['flip'], next: null, minutes: 3, since: '2026-10-26',
    title: 'Frente e verso no editor',
    summary: 'Crie o verso de um documento, vire a folha, escreva nele e desvincule.',
    start: 'blank',
    steps: [
      { say: 'Um documento pode ter frente e verso. O verso é outro documento, ligado à frente.', done: ['read'], act: 'continue' },
      { say: 'Clique em <b>Criar verso</b>.', why: 'O Ateliê cria um documento com o mesmo tamanho e o mesmo papel, liga os dois e vira a folha para o verso.', target: '[data-action="flip-sheet"]', done: [['hasBack'], ['face', 'back']] },
      { say: 'No verso, adicione um <b>Texto</b>.', target: '[data-action="toggle-add-menu"]', tab: 'layers', done: ['layerCount', 'text', 1], act: ADD_TEXT },
      { say: 'Vire de volta para a frente (tecla <b>F</b>).', target: '[data-action="flip-sheet"]', done: ['face', 'front'], learn: ['F', 'virar a folha'] },
      { say: 'Para separar os dois, clique no <b>×</b> de <b>Desvincular verso</b>.', target: '[data-action="unlink-back"]', done: ['noBack'] },
    ],
  },
  {
    id: 'draw-brush', folder: 'news', kind: 'lesson', task: ['tools'], next: null, minutes: 3, since: '2026-10-26',
    title: 'Desenhar com o pincel',
    summary: 'Pinte um traço à mão livre e desenhe um retângulo arrastando.',
    start: 'blank',
    steps: [
      { say: 'A barra à esquerda da mesa tem as ferramentas de desenho.', done: ['read'], act: 'continue' },
      { say: 'Escolha o <b>Pincel</b> (tecla <b>B</b>).', target: '.stage-tool-btn[data-tool="brush"]', done: ['tool', 'brush'] },
      { say: 'Arraste sobre a página para fazer um traço.', target: '.stage-page-wrap', done: ['layerWhere', { kind: 'shape', 'shape.type': 'path' }], act: ['draw', [[300, 400], [420, 470], [540, 400], [660, 480]]] },
      { say: 'Volte à ferramenta <b>Selecionar</b> (tecla <b>V</b> ou Esc).', target: '.stage-tool-btn[data-tool="select"]', done: ['tool', 'select'], learn: ['Esc', 'voltar a selecionar'] },
      { say: 'Agora sozinho: desenhe um <b>retângulo</b> arrastando na página.', try: true, target: '.stage-tool-btn[data-tool="rect"]', done: ['layerWhere', { kind: 'shape', 'shape.type': 'rect', name: 'Retângulo' }], act: [['click', '.stage-tool-btn[data-tool="rect"]'], ['draw', [[300, 700], [700, 900]]]] },
    ],
  },
  {
    id: 'cut-tear-burn', folder: 'news', kind: 'lesson', task: ['cuts'], next: null, minutes: 4, since: '2026-10-26',
    title: 'Rasgar, cortar e queimar',
    summary: 'Recorte uma camada com o laço, rasgue o topo da folha, queime um canto e veja que nada se perde.',
    start: 'rect',
    steps: [
      { say: 'Tesoura, rasgo e isqueiro não apagam nada: cada gesto vira uma camada de corte, que você pode ocultar, ajustar ou desfazer.', done: ['read'], act: 'continue' },
      { say: 'Escolha a <b>Tesoura</b> (tecla <b>X</b>). A mancha está selecionada: o corte vale só para ela.', target: '.stage-tool-btn[data-tool="scissors"]', done: ['tool', 'scissors'], learn: ['X', 'tesoura (Alt: laço; Shift: picote)'] },
      { say: 'Segure <b>Alt</b> e desenhe um <b>laço</b> dentro da mancha. O que ficar fora do laço é cortado.', why: 'Assim se recorta uma foto de revista ou as letras de um bilhete de ameaça.', target: '.stage-page-wrap', done: ['layerWhere', { kind: 'effect', 'effect.type': 'cut', 'effect.edge': 'tesoura', clip: true }], act: ['draw', [[260, 380], [540, 380], [540, 540], [260, 540], [262, 390]], { alt: true }] },
      { say: 'Volte à seleção (tecla <b>Esc</b>) e tire a seleção com outro <b>Esc</b>: agora o corte vale para a folha inteira.', target: '.stage-tool-btn[data-tool="select"]', done: [['tool', 'select'], ['noSelection']], act: [['key', 'Escape'], ['key', 'Escape']] },
      { say: 'Escolha <b>Rasgar</b> (tecla <b>G</b>).', target: '.stage-tool-btn[data-tool="tear"]', done: ['tool', 'tear'], learn: ['G', 'rasgar (Alt arranca um canto)'] },
      { say: 'Arraste de um lado ao outro, perto do topo, e clique na parte de cima, a que sai.', why: 'Quanto mais rápido o gesto, mais irregular fica a borda. Enter aceita a parte sugerida; Esc cancela.', target: '.stage-page-wrap', done: ['layerWhere', { kind: 'effect', 'effect.type': 'cut', 'effect.edge': 'rasgado' }], act: [['draw', [[80, 240], [1160, 270]]], ['clickPage', [600, 80]]] },
      { say: 'Escolha o <b>Isqueiro</b> (tecla <b>Q</b>).', target: '.stage-tool-btn[data-tool="lighter"]', done: ['tool', 'lighter'], learn: ['Q', 'isqueiro: segure para o fogo avançar'] },
      { say: 'Segure a chama sobre um canto da folha até o furo crescer, e solte.', target: '.stage-page-wrap', done: ['layerWhere', { kind: 'effect', name: 'Queimado' }], act: ['hold', [200, 1500], 700] },
      { say: 'Em <b>Camadas</b>, oculte a camada <b>Queimado</b> no olho: o canto volta, nada foi perdido.', target: '.inspector-tab[data-tab="layers"]', tab: 'layers', done: ['layerWhere', { name: 'Queimado', visible: false }], act: [['click', '.inspector-tab[data-tab="layers"]'], ['wait', 300], ['click', '.layer-item:has-text("Queimado") [data-action="toggle-visible"]']] },
    ],
  },
  {
    id: 'own-font', folder: 'news', kind: 'lesson', task: ['fonts'], next: null, minutes: 3, since: '2026-10-26',
    title: 'Enviar uma fonte própria',
    summary: 'Mande uma fonte do seu computador para a Biblioteca e use-a num texto.',
    start: 'blank',
    steps: [
      { say: 'Tem uma fonte que não está na biblioteca? Dá para enviar a sua.', why: 'Aceitamos .ttf, .otf, .woff e .woff2. A fonte fica guardada neste navegador, em “Minhas fontes”.', done: ['read'], act: 'continue' },
      { say: 'Abra a <b>Biblioteca</b>, aba <b>Fontes</b>.', target: LIBRARY, done: [['drawer', 'library'], ['libraryTab', 'fonts']], act: [['click', LIBRARY], ['click', '.library-type-chips [data-type="fonts"]']] },
      { say: 'Clique em <b>Enviar fonte</b> e escolha o arquivo.', target: '[data-action="upload-font"]', drawer: 'library', done: ['fontDialog'], act: ['upload', '[data-action="upload-font"]', 'fonte'] },
      { say: 'Confira o nome e clique em <b>Adicionar à biblioteca</b>.', target: '.font-upload-confirm', done: ['userFonts', 1], act: ['click', '.font-upload-confirm'] },
      { say: 'Clique na fonte nova, em <b>Minhas fontes</b>, para escrever com ela.', target: '.library-font-card[data-id^="usuario-font-"]', drawer: 'library', done: ['layerWhere', { kind: 'text', 'text.font.library': { includes: 'usuario-font-' } }], learn: 'Botão direito numa fonte enviada: remover' },
    ],
  },

  // --- Dicas rápidas: o “?” de cada tarefa abre uma destas
  {
    id: 'tip-uv', folder: 'tips', kind: 'tip', task: ['light'], minutes: 1,
    title: 'Esconder um texto sob UV',
    summary: 'Um texto marcado como “Luz UV” só aparece com a lâmpada ultravioleta acesa.',
    start: 'text',
    steps: [
      { say: 'Com o texto selecionado, em <b>Iluminação</b>, escolha <b>Luz UV</b>.', target: '.choice-field:has([data-field="h:light"]) [data-choice="uv"]', tab: 'properties', done: ['selected', { light: 'uv' }] },
      { say: 'Acenda a <b>Luz UV</b> para ver o texto aparecer.', target: '[data-action="toggle-uv"]', done: ['uvOn'] },
    ],
  },
  {
    id: 'tip-blend', folder: 'tips', kind: 'tip', task: ['blend'], minutes: 1,
    title: 'Mancha que escurece o papel',
    summary: 'A mesclagem Multiplicação deixa a camada escurecer o que está embaixo, como tinta no papel.',
    start: 'rect',
    steps: [
      { say: 'Com a camada selecionada, em <b>Mesclagem</b>, escolha <b>Multiplicação</b>.', target: 'select[data-field="h:blend"]', tab: 'properties', done: ['selected', { blend: 'multiply' }], act: ['select', 'select[data-field="h:blend"]', 'multiply'], hint: '<b>Mesclagem</b>: Multiplicação' },
    ],
  },
];
