# Progresso — Ateliê de Documentos

## Visão Geral

Implementação do Ateliê de Documentos (engine de documentos editáveis e imersivos para RPG), conforme plano em `docs/plano/`.

| Etapa | Situação | Data | Resumo |
|---|---|---|---|
| 1 — O projeto | concluída | 2026-10-24 | Estrutura inicial do projeto, Express, Vite, UI base, testes unitários e E2E |
| 2 — Identidade e casca | concluída | 2026-10-24 | Identidade visual, primitivas, fontes OFL, casca, gavetas, inspetor, ajustes, Ctrl+K |
| 3 — Modelo de dados | concluída | 2026-10-24 | Formato do documento, camadas, limites, mesclagens e validações |
| 4 — Renderizador | concluída | 2026-10-24 | Desenho de camadas em Canvas 2D, mesclagens, recorte, ajustes e luz UV |
| 5 — Texto | concluída | 2026-10-24 | Diagramação pura, 4 estilos de tinta, carregador FontFace e testes |
| 6 — Armazenamento | concluída | 2026-10-24 | IndexedDB, rotas de biblioteca, documentos, lixeira e envios |
| 7 — Editor | concluída | 2026-10-24 | Palco, camadas, desfazer/refazer, propriedades, arquivamento e uploads |
| 8 — Manipulação | concluída | 2026-10-24 | Mover, redimensionar, girar, encaixe, atalhos e edição inline de texto |
| 9 — Ferramentas do editor | concluída | 2026-10-24 | Guias, réguas, histórico navegável, mini-barra, conta-gotas, colar imagens, alinhar |
| 10 — Documentos e rascunho | concluída | 2026-10-24 | Navegador com pastas, fixados, favoritos, recentes; rascunho automático; versões; lixeira; abas |
| 11 — Efeitos procedurais | concluída | 2026-10-24 | 9 efeitos procedurais em código, determinismo por semente PRNG, cortes e propriedades |
| 12 — Coleção papéis e texturas | concluída | 2026-10-24 | 48 papéis em 3 idades e 53 texturas de sobreposição em WebP (7,78 MB total) |
| 13 — Coleção elementos | concluída | 2026-10-24 | Coleção da casa: 140 elementos vetoriais em SVG (carimbos, selos, prendedores, fitas, molduras, etc.) |
| 14 — Coleção fontes | concluída | 2026-10-24 | Coleção da casa: 26 famílias de fontes livres, parser sfnt, seletor visual e eixos variáveis |
| 15 — Biblioteca | concluída | 2026-10-24 | Gaveta Biblioteca com busca, filtros, drag & drop e modo Preencher com exemplos em português |
| 16 — Coleção modelos | concluída | 2026-10-24 | Coleção da casa: 39 modelos próprios em 8 categorias, gerador de modelos, frente/verso, UV e folha de contato |
| 17 — Início e galeria | concluída | 2026-10-24 | Tela de abertura, 9 folhas em branco, continuar, 8 modelos em destaque, expansões, boas-vindas e gaveta Modelos |
| 18 — Assar e entregar | concluída | 2026-10-25 | Assado em alta resolução (2048 px) e entrega ao Tabletop pelos 3 caminhos do contrato (A: mesa-handouts-v1, B: postMessage, C: HTTP e CORS) |
| 19 — Luz UV | concluída | 2026-10-25 | Camadas secretas sob luz negra, escurecimento da página (tint e strength), mudança de clima da interface, atalho U, selos UV e assado UV |
| 20 — Modo leitura | concluída | 2026-10-25 | Leitura imersiva em tela cheia, lupa 2,5×, lanterna UV com máscara radial, virar frente/verso e carrossel de documentos |
| 21 — Exportar e imprimir | pendente | | Exportação em alta resolução e folha A4 |
| 22 — Importar elementos | pendente | | Expansão: acervo Arquivos Confidenciais |
| 23 — PSD leitura | pendente | | Expansão: análise e estrutura de PSDs |
| 24 — PSD compositor | pendente | | Expansão: composição de PSD em Node |
| 25 — PSD modelos | pendente | | Expansão: conversão de PSD para modelos |
| 26 — Publicar no Pages | pendente | | Build estático e workflow do GitHub Pages |
| 27 — Documentação | pendente | | Manuais, guia de uso e licenças |
| 28 — Integração Tabletop | pendente | | Consumo e interação direta dentro do Tabletop |
| 29 — Expansão no navegador | pendente | | Expansão local no navegador (opcional) |

---

## Etapa 12 — Coleção da casa · papéis e texturas

### Feito
- **Módulo de Ruído Puro (`src/domain/noise.js` e `scripts/colecao/noise.js`)**:
  - Implementação pura e determinística em JavaScript:
    - `mulberry32(seed)`: gerador pseudoaleatório uniforme de 32 bits no intervalo [0, 1).
    - `valueNoise2D(seed)`: ruído 2D suave com interpolação smoothstep cúbica entre nós de grade.
    - `fbm(noise, x, y, { octaves, lacunarity, gain })`: ruído fractal browniano normalizado.
    - `worley2D(seed)`: ruído celular de Voronoi medindo distância mínima ao ponto de vizinhança mais próximo.
    - `domainWarp(noise, x, y, amount)`: distorção de coordenadas 2D usando o próprio campo de ruído.
- **Raster e Utilitários de Síntese (`scripts/colecao/raster.js`)**:
  - Classe `Raster` baseada em `Float32Array` RGBA normalizado (0..1), com suporte a amostragem, preenchimento, mesclagens (`normal`, `multiply`, `screen`, `overlay`, `soft-light`), traçado de linhas orgânicas com tremor (`jitter`), anéis com deformação angular (`drawRing`), círculos suaves e exportação nativa via `sharp` para WebP e prévias redimensionadas.
- **Receitas e Gerador de Papéis (`scripts/colecao/papers.json` e `scripts/colecao/papers.js`)**:
  - 16 receitas de papel com proporção exata e resolução de até 2400 px:
    1. *Ofício branco*: base clara `#f4f1ea`, grão fino, manchado sutil.
    2. *Ofício creme*: base quente `#efe6d2`, manchado suave.
    3. *Papel jornal*: base `#e3dccb`, fibras escuras, grão forte, alto amarelamento.
    4. *Kraft*: base parda `#b8916a`, fibras escuras longas e densas, manchado expressivo.
    5. *Pergaminho*: base couro `#e6d3a8`, nuvens largas, borda deckle e foxing natural.
    6. *Carta pautada*: base `#f3eee2`, pautas cinza-azuladas finas.
    7. *Caderno*: base `#f7f4ea`, pauta azul, margem vermelha e furos de espiral.
    8. *Quadriculado*: base `#f6f3ea`, grade azul de 5 mm.
    9. *Milimetrado*: base `#f3f1e6`, grade verde de alta precisão com linhas mestras.
    10. *Almaço*: base `#f2ecdc`, pauta e margem dupla vermelha.
    11. *Telegrama*: base amarela `#efe4bf` em proporção deitada 1,4 : 1 (2400 × 1714 px).
    12. *Cartolina*: base cinza-azulada espessa `#c9cfd3` com fibras médias.
    13. *Papel de seda*: base translúcida `#f2efe8` com alfa 0.85 e borda serrilhada.
    14. *Papel fotográfico (verso)*: base `#f6f5f0` com marca d'água diagonal "PAPEL FOTOGRÁFICO".
    15. *Papel de máquina (onionskin)*: base semitransparente `#f1eee4` ultrafina.
    16. *Papel carbono*: base azul-escuro profundo `#1f2a5a` com reflexo irregular.
  - Pipeline de 7 camadas por papel: Base → Manchado (FBM em grade otimizada) → Fibras → Grão → Pauta/Grade → Envelhecimento (amarelamento `#d8b77a`, manchas de oxidação/foxing, vinheta escura nas bordas e desbotamento de linhas) → Borda (reta, serrilhada ou deckle recortada no alfa).
  - 3 idades (`novo`, `usado`, `antigo`) para cada papel, totalizando 48 arquivos WebP (`quality: 80`).
- **Gerador de Texturas de Sobreposição (`scripts/colecao/overlays.js`)**:
  - 53 texturas de acabamento e desgaste em PNG/WebP com canal alfa:
    - *Manchas de café (8)*: anéis de fundo de xícara, anel duplo, respingos, xícara incompleta, poça densa, escorrido e anéis múltiplos.
    - *Água e umidade (6)*: marcas d'água secas com halo periférico, cantos molhados, escorridos verticais e infiltração de borda.
    - *Sangue (12)*: gotas com cauda direcional, leque de spray, arrastos estriados de dedo, poças oxidadas, marcas palmares e coágulos.
    - *Sujeira e poeira (6)*: poeira fina, mancha de graxa, marcas de fuligem, atrito de mesa e fuligem difusa.
    - *Queimado (5)*: bordas perimetrais queimadas, furos de cigarro, canto chamuscado e labaredas laterais.
    - *Amassados (4)*: mapas de relevo para `soft-light` em cinza neutro 50% com vincos claros e escuros (suave, médio, pesado e bolso).
    - *Dobras (4)*: dobra simples, em três partes (carta), em cruz e mapa desdobrado.
    - *Digitais (4)*: impressões datiloscópicas em tinta preta, gasta e sangue.
    - *Rasgos (4)*: máscaras de corte inferior, superior, canto arrancado e lateral irregular.
- **Pipeline de Build e Manifesto (`scripts/colecao/build.js` e `package.json`)**:
  - Script `npm run colecao:texturas` gerando os 101 ativos e suas respectivas miniaturas de 320 px em `public/colecao/previews/`.
  - Atualização do manifesto `public/colecao/library.json` com schema 1, `generatedAt`, categorias oficiais em português e `license: 'própria'`.
  - Tamanho total da pasta `public/colecao/`: **7,78 MB**, amplamente inferior ao teto de 60 MB.
- **Folhas de Contato e Documento Exemplo (`scripts/colecao/contact-sheet.js`)**:
  - `docs/referencias/colecao-papeis.png`: grade completa dos 48 papéis em suas 3 idades com identificação de tipo.
  - `docs/referencias/colecao-texturas.png`: grade completa das 53 sobreposições compostas sobre fundo de pergaminho para conferência do canal alfa.
  - `docs/referencias/colecao-exemplo.png`: documento de teste investigativo A4 feito exclusivamente com os papéis e texturas gerados (ofício creme antigo, texto datilografado, mancha de café, digital, dobras e poeira).
- **Testes Unitários**:
  - `tests/noise.test.js`: determinismo, conformidade de faixa [0, 1] e suavidade do FBM (5 testes).
  - `tests/colecao-papers.test.js`: integridade das 16 receitas, determinismo de hash e validação de amarelamento/escurecimento de bordas por idade (3 testes).
  - `tests/colecao-manifest.test.js`: validação de 100% dos arquivos no manifesto, ausência de arquivos órfãos, licença própria e conformidade do prefixo `casa-` (1 teste).

### Validação
- `npm test`: 82 testes unitários passando 100%.
- `npm run test:e2e`: 8 suítes E2E Playwright passando 100%.
- `npm run colecao:texturas`: 101 arquivos WebP gerados com sucesso e manifesto `library.json` validado.

---

## Etapa 17 — Início e galeria de modelos

### Feito
- **Tela de início (`src/editor/start.js` e `src/ui/start.css`)**:
  - Exibida na bancada quando não há documento aberto (e acionável via `Ctrl + clique` em Mesa no trilho, ou Ctrl+K "Ir para o início"). Substitui o estado vazio inicial.
  - Seção `[fita] COMEÇAR`: 9 cartões `.at-card.start-preset-card` desenhados nas proporções reais dos `PAGE_PRESETS` (altura fixa de 120 px), com nomes e dimensões em Courier Prime e rotações orgânicas (`tiltOf`). Clicar cria o documento.
  - Seção `[fita] CONTINUAR`: exibe até 6 documentos recentes sobre a mesa com suas prévias; clicar abre o documento.
  - Seção `[fita] MODELOS` com atalho `[ver todos →]`: 8 modelos em destaque (um para cada uma das 8 categorias da coleção), espalhados sobre a bancada com leve rotação e sombra. Clicar abre a cópia do modelo já na aba Preencher do inspetor.
  - Seção `[fita] EXPANSÕES`: renderizada condicionalmente caso fontes externas existam na biblioteca, com contagem de modelos e elementos e botão "Explorar".
  - Navegação fluida por teclado: setas direcionais entre cartões dentro da fileira, Tab entre fileiras e seções, Enter/Espaço para acionar.
- **Primeira Visita e Bilhetes de Boas-Vindas (`localStorage` `atelie-welcome`)**:
  - 3 bilhetes sequenciais `.at-note` presos à bancada por fita crepe, com indicador de passo (1/3, 2/3, 3/3), botões "Pular", "Anterior" e "Próximo / Começar":
    1. *Escolha um ponto de partida* ("Um modelo pronto ou uma folha em branco.")
    2. *Preencha* ("Os campos do modelo ficam na aba Preencher, à direita. Para ir além, cada elemento da página é uma camada que você move, troca e recolore.")
    3. *Leve para a mesa* ("Exporte em PNG, imprima, ou use no Tabletop, onde o documento vira uma carta que os jogadores pegam para ler.")
  - Conclusão ou pulo grava `atelie-welcome: 'done'` no `localStorage`, evitando que os bilhetes reapareçam em visitas subsequentes.
  - Suporte completo a `prefers-reduced-motion: reduce`.
- **Gaveta Modelos (`src/editor/templates-drawer.js`)**:
  - Acessível pelo trilho lateral, pelo atalho `[ver todos →]` do início ou por comando na paleta Ctrl+K ("Modelos de documentos").
  - Campo de busca em tempo real com normalização de acentos e maiúsculas (busca em nome, categoria e campos).
  - Barra de chips de origem (todas as origens, casa e expansões) e chips das 8 categorias com contagem dinâmica de modelos.
  - Grade responsiva de 2 colunas com cartões de 160 px, exibindo prévia em WebP, título, categoria, selo com número de campos e selo "frente e verso".
  - Visão de detalhe (Detail View) interna na gaveta: imagem ampliada em alta resolução, carimbo da categoria, lista de campos estruturados e botão de destaque "Usar este modelo".
  - Verificação de alterações não arquivadas com diálogo de confirmação antes de instanciar a cópia na aba Preencher.
- **Capturas de Referência (`scripts/capture-inicio.js`)**:
  - `docs/referencias/atelie-inicio.png`: tela de início na primeira visita, com a bancada, fita crepe e bilhete de introdução.
  - `docs/referencias/atelie-inicio-2.png`: bancada de abertura com a fileira CONTINUAR populada com documentos recentes.
- **Testes e Validação**:
  - `tests/e2e/start.test.js`: suíte E2E cobrindo primeira visita com os 3 bilhetes, 9 cartões de proporção, criação de Polaroide (880 × 1070), retorno ao início com fileira Continuar, abertura de modelo em destaque na aba Preencher, filtros e detalhe da gaveta de modelos e fileira de expansões com mock.
  - 101 testes unitários passando 100%.
  - 11 suítes de testes ponta a ponta (E2E) Playwright passando 100%.

### Pendências reais
- Nenhuma pendência na Etapa 17.

---

## Etapa 20 — Modo leitura

### Feito
- **Geometria e Carrossel (`src/reading/reading-geometry.js`)**:
  - `fitPage(page, viewport, margin)`: cálculo determinístico do maior tamanho que cabe na tela mantendo a proporção exata da folha com margem configurável (padrão 6%), centralizado no palco.
  - `neighbors(list, id)`: localização circular de documento anterior, atual e próximo para carrossel e transições.
- **Motor do Modo Leitura (`src/reading/reading.js`)**:
  - `createReading(shell, { api, images, fonts, editor })`: interface de ciclo de vida com métodos `open(handoutId)`, `close()`, `isOpen()`, `toggleLoupe()`, `toggleLantern()`, `flipSheet()`, `navigateCarousel(direction)`.
  - Modo imersivo e tela cheia: entrada via `requestFullscreen` (com fallback elegante), ocultação da casca inteira (`body.is-reading`).
  - Renderização da folha em resolução da tela × `devicePixelRatio` sobre a textura de bancada e iluminação da luminária escolhida nos Ajustes.
  - Barra de ferramentas inferior flutuante: auto-ocultação após 2s de inatividade do mouse, reaparecimento imediato ao mover o cursor e permanência enquanto o ponteiro estiver sobre a barra.
  - Três miniaturas de carrossel (anterior · atual · próximo) com micro-rotação tátil (`tiltOf`), seleção rápida e botões de seta anterior/próximo.
- **Lupa (atalho L)**:
  - Lente circular de 220 px que segue o ponteiro sobre a folha.
  - Segundo render em escala 2,5× a partir de canvas ampliado fora de tela (`ensureLargeCanvas`).
  - Aro escuro de lente física, contorno sutil de vidro e reflexo gradiente diagonal (`.reader-loupe-glare`).
- **Lanterna UV (atalho U)**:
  - Ativação condicional automática: só fica disponível quando o documento tem camadas sob luz ultravioleta (`hasUvLayers`).
  - Escurecimento sutil da folha (`.reader-dark-overlay`) simulando o apagamento da luz ambiente da sala.
  - Máscara radial suave (`globalCompositeOperation = 'destination-in'`) desenhada dinamicamente na posição do cursor, revelando o render UV do documento.
  - Halo violeta pulsante com brilho suave `--at-uv-glow` (`.reader-uv-halo`).
  - Ajuste dinâmico de diâmetro pela roda do mouse (`wheel`) entre 120 e 480 px (raio 60–240 px).
- **Virar Folha (atalho F)**:
  - Suporte completo a documentos de frente e verso (`handout.back?.handoutId`).
  - Carregamento assíncrono do verso pelo ID vinculado e renderização da face traseira.
  - Animação física de rotação 3D no eixo Y (`rotateY(180deg)`) com perspectiva de 1600 px e `backface-visibility: hidden`.
  - Suporte a acessibilidade: transição instantânea quando `prefers-reduced-motion` estiver ativo.
- **Navegação e Carrossel (atalhos ← e →)**:
  - Navegação entre documentos da mesma pasta ou da lista de recentes quando o documento não tiver pasta.
  - Animação de deslizamento lateral (`reader-slide-left` / `reader-slide-right`) e atualização fluida das miniaturas.
  - Ao sair com **Esc**, o editor é restaurado mostrando o documento em que o jogador parou no modo leitura.
- **Integração na Casca e no Editor**:
  - Botão **Leitura** no trilho principal (`data-action="reader"` com atalho `P` e ícone `eye`).
  - Atalho global **P** (ignora inputs, textareas e selects) para entrar no modo leitura direto do documento em edição.
  - Opção **Ler** com tecla `P` no menu de contexto de documentos do navegador lateral.
  - Exposição de `window.__atelie.reading` para diagnóstico e controle externo.
- **Testes e Validação**:
  - `tests/reading.test.js`: testes unitários de proporção, escala máxima, margem 6%, centralização e navegação circular.
  - `tests/e2e/reading.test.js`: teste Playwright validando entrada pelo trilho e por atalho P, ocultação da casca, ativação da lupa e seguimento do cursor, ativação da lanterna UV com teste de discriminação de pixels dentro e fora do círculo, ampliação por scroll do mouse, rotação de folha dupla, navegação por carrossel e restauração do documento ao sair com Esc.
  - Captura de referência `docs/referencias/atelie-leitura-uv.png` (1600 × 950) gerada com a lanterna UV revelando a frase secreta no "Diário de culto · com UV".

### Validação
- `npm test`: 113 testes unitários passando 100%.
- `npm run test:e2e`: 14 suítes E2E passando 100%.
- `npm run build`: bundle de produção gerado com sucesso.
- `docs/referencias/atelie-leitura-uv.png`: gerada e conferida em 1600 × 950.

### Pendências reais
- Nenhuma pendência na Etapa 20.

---

## Etapa 19 — Luz UV

### Feito
- **Modelo de Dados (`src/domain/handouts.js`)**:
  - `page.uv`: campo opcional de configuração `{ tint: '#2b1d52', strength: 0.65 }`.
  - Constante imutável `DEFAULT_PAGE_UV = Object.freeze({ tint: '#2b1d52', strength: 0.65 })`.
  - `createHandout` inicializa com `uv: { ...DEFAULT_PAGE_UV }`.
  - Validação estrita em `validateHandout`: `page.uv` opcional/objeto, `tint` em formato hexadecimal de 6 dígitos (`#rrggbb`), `strength` numérico entre 0 e 1.
- **Renderização sob Luz UV (`src/render/handout-render.js`)**:
  - `renderHandout(canvas, handout, { light: 'uv' })`:
    1. Renderiza todas as camadas visíveis com `light: 'both'`, respeitando grupos de recorte.
    2. Aplica escurecimento com `multiply`: `ctx.fillStyle = tint` e `ctx.globalAlpha = strength` sobre o canvas inteiro da página.
    3. Renderiza todas as camadas visíveis com `light: 'uv'` na ordem do documento sobre o escurecimento.
  - Assegura que camadas UV no meio da lista sejam compostas por cima do escurecimento sem serem afetadas pelo filtro da página.
- **Clima da Interface e Controles no Editor (`src/editor/editor.js`, `src/ui/editor.css`)**:
  - Botão **Luz UV** na barra do documento com estado de acessibilidade `aria-pressed="true|false"` e tooltip indicando atalho.
  - Carimbo **UV** (`.at-stamp.is-uv`) visível na barra do documento quando a luz ultravioleta está ligada.
  - Atalho de teclado **U** (ignora inputs e textareas ativos) para alternar a luz UV.
  - Mudança de clima completa da interface: `document.documentElement.dataset.light = 'uv'`.
  - CSS com transições suaves em `--eco-mid`:
    - Bancada (`.at-desk`) escurece para `#0b0914` e a vinheta quente da luminária é apagada (`background-image: none !important`).
    - Destaques (aba ativa, botão primário, barra de documento) ganham brilho violeta `box-shadow: 0 0 12px var(--at-uv-glow)`.
  - Novas camadas criadas enquanto a luz UV está ligada recebem automaticamente `light: 'uv'`; desligada, `both`.
- **Painel de Camadas (`src/editor/layers-panel.js`)**:
  - Selo visual de luz para cada camada:
    - Camadas `uv`: badge roxo `.layer-uv-badge.is-uv` com texto "UV" e brilho ultravioleta.
    - Camadas `normal`: badge neutro `.layer-uv-badge.is-normal` com texto "sem UV".
- **Painel de Propriedades (`src/editor/properties-panel.js`)**:
  - Quando nenhuma camada está selecionada, o painel exibe as propriedades da **Página**:
    - Tamanho em px (somente leitura).
    - Cor de fundo (`page.background`) com seletor de cor e amostras.
    - Seção **Escurecer sob UV**: seletor de cor `tint` e controle deslizante `strength` de 0 a 100%.
- **Assado em Alta Resolução**:
  - `bakeHandout` e o arquivamento do editor geram e salvam o assado UV em alta definição (2048 px) com a composição sob luz negra quando o documento contém camadas UV (`hasUv: true`).
- **Testes e Validação**:
  - `tests/handouts.test.js`: validação de `page.uv` (válido, ausente, inválido em tipo, formato e limites).
  - `tests/handout-render.test.js`: agrupamento de camadas sob UV priorizando `both` e depois `uv`.
  - `tests/e2e/handout-render.test.js`: pixel do fundo escurece e ganha tom roxo sob UV (B > R > G), camada UV no meio da lista permanece clara/branca por cima do escurecimento.
  - `tests/e2e/editor.test.js`: atalho U alterna luz UV, fundo do canvas escurece, novas camadas entram com `light: 'uv'`, badge UV roxo aparece na lista e salvar gera assado UV (`hasUv: true` na API).
  - `tests/e2e/templates.test.js`: modelo "Diário de culto · com UV" oculta mensagem verde fluorescente em luz normal e a revela sob luz UV.

### Validação
- `npm test`: 110 testes unitários passando 100%.
- `npm run test:e2e`: 13 suítes E2E passando 100%.
- `npm run build`: bundle de produção gerado com sucesso.

### Pendências reais
- Nenhuma pendência na Etapa 19.

---

## Etapa 18 — Assar e entregar ao Tabletop

### Feito
- **Motor de Assado em Alta Resolução (`src/editor/bake.js`)**:
  - `bakeHandout(handout, { images, fonts })`: renderiza PNGs de alta definição escalados para 2048 px no lado maior (`scale = 2048 / Math.max(w, h)`). Gera o assado normal obrigatoriamente e o assado UV sob luz negra se houver camadas visíveis com `light: 'uv'`.
  - `hasUvLayers(handout)`: verificação pura de camadas ativas sob luz ultravioleta.
  - `summaryOf(handout, source)`: formatação do resumo estruturado conforme Seção 2 do contrato (`{ id, name, category, tags, revision, updatedAt, hasUv, source }`).
  - `deliveryOf(handout, { preview, bakes, source })`: formatação do objeto completo de entrega `Delivery` com Blobs de prévia e assados.
  - Integração no fluxo de arquivamento (`archiveDocument`): exibição de estado "Arquivando…", tratamento não fatal com notificação amigável de erro se a entrega falhar sem corromper o documento salvo.
- **Caminho A — Navegador Compartilhado (`src/data/exchange.js`)**:
  - Banco IndexedDB `mesa-handouts-v1` (sem escopo de caminho) com as stores `handouts` (`keyPath: 'id'`) e `bakes` (`keyPath: ['id', 'light']`).
  - `publish(db, summary, preview, bakes)`: gravação atômica em transação única de resumo e assados, limpando assado UV anterior se não houver camadas UV.
  - `unpublish(db, id)`: remoção de resumo e assados ao mover para a lixeira.
  - `unpublishBySource(db, source)`: esvaziamento por origem quando o usuário desativa o compartilhamento.
  - `BroadcastChannel('mesa:handout')`: canais em tempo real com mensagens padronizadas `handout-saved` e `handout-removed`.
  - Controle nos Ajustes da Mesa (`src/ui/settings.js`): opção "Compartilhar com o Tabletop neste navegador" (ativa por padrão); ao desativar, esvazia o banco de troca desta origem; ao reativar, republica todos os documentos.
- **Caminho B — Janela via `postMessage` (`src/editor/handoff.js`)**:
  - `validFrom(origin)`: validação rigorosa de segurança permitindo apenas `https://...` ou `http://127.0.0.1` / `localhost` sem caminhos.
  - `handoffRequest(location, opener)`: detecção e validação dos modos `pick`, `edit` e `new` via query params e presença de `window.opener`.
  - `deliveredMessage(nonce, delivery)`: envelope com contrato versão 1.
  - Modo `?pick=1`: abre gaveta Documentos com banner "O Tabletop pediu um documento", botão "Enviar ao Tabletop" em cada cartão, assa, envia via `postMessage(delivered)` e fecha a janela automaticamente em 1 s.
  - Modos `?handout=` e `?new=`: exibe carimbo "Ligado ao Tabletop" na barra do documento e envia `delivered` a cada arquivamento.
  - Garantia de que `Cross-Origin-Opener-Policy` não é definido em nenhum ponto.
- **Caminho C — Servidor HTTP com CORS (`server/cors.js`, `server/routes/handouts.js`)**:
  - `readOnlyCors(allowedOrigins)`: middleware para permitir leitura restrita (`GET`, `HEAD`) com cabeçalhos `Access-Control-Allow-Origin`, `Vary: Origin`, `Access-Control-Expose-Headers: X-Atelie-Revision` e `OPTIONS` com `204`. Bloqueio estrito de CORS em métodos de escrita (`PUT`/`DELETE`).
  - Rotas de assado:
    - `PUT /api/atelie/handouts/:id/bake?light=normal|uv&revision=<n>`: gravação do PNG no disco e atualização de `<id>.bake.json`, com detecção de conflito de revisão `409 Conflict`.
    - `DELETE /api/atelie/handouts/:id/bake?light=uv&revision=<n>`: remoção de assados específicos sem CORS.
    - `GET /api/atelie/handouts/:id/bake?light=normal|uv`: entrega do PNG com `X-Atelie-Revision` e `Cache-Control: no-cache`.
  - `GET /api/atelie/handouts`: inclusão do campo booleano `hasUv` na listagem de documentos.
- **Documentação e Contrato (`docs/plano/CONTRATO-TABLETOP.md`)**:
  - Tabela de cobertura de testes no rodapé mapeando cada seção do contrato (2, 3, 4 e 5) às suas suítes de teste.
- **Testes e Validação**:
  - `tests/handoff.test.js`: testes unitários de `handoffRequest`, `validFrom`, `deliveredMessage`, `savedMessage` e `removedMessage`.
  - `tests/bake.test.js`: testes unitários de `summaryOf`, `deliveryOf` e `hasUvLayers`.
  - `tests/contract-http.test.js`: servidor real validando `health`, CORS, preflight `OPTIONS`, `PUT` sem CORS, ciclo `PUT` → `GET bake` com headers, conflito `409` e listagem com `hasUv`.
  - `tests/e2e/exchange.test.js`: teste E2E do caminho A em servidor e no modo estático (`VITE_ATELIE_STORAGE=browser`), validando `mesa-handouts-v1`, `BroadcastChannel`, lixeira e chave de ajuste.
  - `tests/e2e/handoff.test.js`: teste E2E do caminho B com popup falso do Tabletop em outra porta, testando modo pick com fechamento e modo edit com entrega contínua.
  - 109 testes unitários passando 100% (`npm test`).
  - 13 suítes E2E passando 100% (`npm run test:e2e`).

### Revisão pós-implementação
- Servidor: prévia e assados acompanham o documento para a lixeira (`<id>.assets/`), voltam na restauração e somem na exclusão definitiva ou expiração; `bake.json` serializado por documento; prévia PNG mantém o tipo; listagem com cache de resumos por tamanho e data.
- Editor: um único assado gera a prévia (sem segundo render); caminhos C, A e B falham de forma independente; republicar (restaurar, religar compartilhamento) leva a prévia; religar mostra `n/total` e pula documentos já publicados na mesma revisão; modo pick reaproveita o assado do banco de troca; lista do modo navegador devolve `hasUv`.

### Pendências reais
- Nenhuma pendência na Etapa 18, exceto: recorte (`clip`) entre camadas de luz diferentes sob UV e listagem do modo navegador que ainda lê todos os documentos (`getAll`).

---

## Etapa 16 — Coleção da casa · modelos próprios

### Feito
- **39 Modelos Próprios em 8 Categorias (`public/colecao/modelos/`)**:
  - Implementação completa dos 39 modelos da casa cobrindo as 8 categorias do plano, usando exclusivamente ativos da coleção (`casa-...`) e fontes livres (`casa-font-...`):
    1. *Cartas e bilhetes (9)*: Carta envelhecida, Carta datilografada · anos 50, Bilhete de caderno rasgado, Bilhete de geladeira, Cartão-postal (frente e verso), Telegrama · anos 20, Carta com envelope (frente e verso).
    2. *Jornal (4)*: Recorte de jornal · anos 20, Capa de jornal, Obituário, Classificados.
    3. *Polícia e investigação (6)*: Relatório policial, Boletim de ocorrência, Ficha criminal, Mandado judicial, Laudo pericial, Cartão de evidência.
    4. *Médico (4)*: Prontuário médico, Receita médica, Certidão de óbito, Internação · sanatório.
    5. *Ocultismo (4)*: Página de grimório, Círculo ritual, Diário de culto · com UV, Pergaminho com selo.
    6. *Fantasia (3)*: Édito real, Mapa rasgado, Cartaz de procurado.
    7. *Cotidiano (6)*: Recibo de venda, Passagem de trem, Cartão de visita, Ingresso de teatro, Polaroide com legenda (frente e verso).
    8. *Tecnologia (3)*: Conversa de celular, E-mail impresso, Tela de terminal.
  - Textos de exemplo plausíveis e em português sem *lorem ipsum*, ordem lógica de camadas, camadas nomeadas em português, e variações ocultas (`Variação · ...`).
- **Suporte a Frente e Verso e Camada de UV**:
  - Modelos de dois lados vinculados via `backTemplate` cruzado no manifesto e instanciação bidirecional automática de documentos no editor.
  - Suporte a camada invisível em luz normal e revelada sob luz negra (`light: 'uv'`) no Diário de culto.
- **Ferramentas CLI e Build de Modelos**:
  - `scripts/colecao/model.js` (`npm run colecao:modelo -- --handout <id> --slug <slug> --category "<categoria>" [--back <verso>]`): validação contra regras da casa, gravação em `public/colecao/modelos/<slug>.json`, registro no manifesto `library.json` com `license: 'CC0-1.0'` e geração de prévia WebP a 480 px.
  - `scripts/colecao/templates.js` (`npm run colecao:modelos`): gerador automatizado dos 39 modelos, renderização de prévias via Playwright e `window.__atelie.renderHandout`, e geração da folha de contato.
- **Instanciação no Editor (`src/editor/editor.js`)**:
  - Métodos `instantiateTemplate` e `openTemplate` e tratamento de parâmetro URL `?template=<id>`.
  - Auto-criação do verso vinculado no armazenamento quando há `backTemplate`, com UUIDs válidos e abertura direta na aba "Preencher".
- **Folha de Contato e Integridade do Acervo**:
  - `docs/referencias/colecao-modelos.png` (1344 × 2310 px): painel de contato com as 39 prévias organizadas em grade com identificador e categoria.
  - Tamanho da pasta `public/colecao/`: ~20 MB (amplamente abaixo do limite de 60 MB).
- **Testes Implementados**:
  - `tests/colecao-templates.test.js`: validação de presença, `validateHandout`, uso exclusivo de itens `casa-`, presença de campos e consistência de `backTemplate` para todos os modelos.
  - `tests/e2e/templates.test.js`: teste E2E Playwright cobrindo instanciação por URL de modelo padrão, modelo frente/verso e modelo com UV, verificação de abertura da aba Preencher, edição de campo com atualização imediata do canvas e ligação bidirecional no armazenamento.

### Validação
- `npm test`: 101 testes unitários passando 100%.
- `npm run test:e2e`: 10 suítes E2E Playwright passando 100%.
- `docs/referencias/colecao-modelos.png` gerada e validada.

### Pendências reais
- Nenhuma pendência na Etapa 16.

---

## Etapa 15 — Biblioteca no editor e modo "Preencher"

### Feito
- **Módulo de Padrões Iniciais de Biblioteca (`src/editor/library-defaults.js`)**:
  - Função pura `defaultsFor(item)` implementando a tabela canônica de mesclagens e posicionamento:
    - *Papéis*: blend `normal`, `cover: true`, posição `bottom` (inserido no fundo cobrindo toda a folha).
    - *Manchas, Água, Sujeira, Queimado, Digitais, Sangue* (ou palavras-chave equivalentes em expansões como `mancha`, `sujeira`, `café`, `queimad`, `sangue`, `poeira`): blend `multiply`.
    - *Amassados, Dobras* (ou palavras-chave `amassad`, `dobrad`, `textura`): blend `soft-light`, `cover: true`.
    - *Carimbos, Selos, Marcas, Ornamentos, Símbolos*: blend `multiply`, opacidade `0.9` e `tint` automático com a cor de tinta (azul-escuro `#1f2f6b` para carimbos em geral; vermelho `#a3202a` para NEGADO/URGENTE/CANCELADO; preto `#000000` para marcas e símbolos).
    - *Rasgos*: blend `normal`, `clip: false` com nota explicativa de uso em corte de papel.
    - *Outros*: blend `normal`, sem cobertura forçada.
- **Módulo de Busca e Filtros da Biblioteca (`src/editor/library-search.js`)**:
  - Função pura `filterLibraryItems(items, options)`:
    - Busca insensível a acentos e maiúsculas (`normalizeText` e `matchesWords`) casando nome, categoria e tags.
    - Filtro por tipo: `elements` (oculta fontes) vs `fonts` (apenas fontes).
    - Filtro por origem: `all` (todas as fontes), `casa` (Coleção do Ateliê) ou ID da expansão instalada.
    - Gerenciamento e filtro de favoritos via `localStorage` (`atelie-favorites`).
- **Gerador de Amostras de Texto Plausíveis em Português (`src/editor/sample-text.js`)**:
  - Função `getSampleText(fieldLabel, currentContent)` gerando nomes de investigadores/vítimas, datas (1890 a 2020), locais e endereços, títulos de relatórios e parágrafos de correspondências/laudos periciais.
- **Painel e Gaveta Biblioteca no Editor (`src/editor/library-panel.js`, `src/ui/editor.css`)**:
  - Busca instantânea e chips de tipo (**Elementos · Fontes**).
  - Chips de origem condicionais (**Tudo · Coleção do Ateliê · [Expansões]**), exibidos apenas quando houver expansões instaladas.
  - Categorias exibidas como fitas recolhíveis (`.at-tape`) com contadores na ordem canônica do plano.
  - Grade de 3 colunas de `.at-card` com rotação física sutil (`tiltOf`), prévias lazy loading e identificadores em Courier Prime.
  - Hover preview flutuante (240 px) após 400 ms.
  - Inserção de itens por clique normal (centralizado em proporção nativa), Shift+clique (cobrindo a página, no fundo se for papel), menu de contexto ("Pôr na página", "Cobrir a página", "Favoritar") e arrastar e soltar (HTML5 Drag & Drop) no palco, posicionando o elemento exatamente nas coordenadas do cursor.
  - Aba Fontes com amostrário *"Querida Lia, não procure por mim."* e aplicação direta na camada de texto selecionada.
  - Mensagem discreta no rodapé sobre instalação de expansões no modo servidor.
- **Modo Preencher e Painel Inspetor (`src/editor/fill-panel.js`, `src/editor/properties-panel.js`)**:
  - Aba **Preencher** no inspetor lateral (`.inspector-tab[data-tab="fill"]`), exibida e acionada automaticamente ao abrir modelos ou documentos com campos.
  - Cada campo listado em cartão com rótulo em `.at-tape`, botão de destaque pulsante no palco, `<input>` para texto curto, `<textarea>` para texto longo e botão **Preencher com exemplo**.
  - Suporte a campos de imagem com miniatura e modal **Trocar imagem** (alternando entre imagens enviadas e coleção da casa, ou envio de novo arquivo).
  - Checkbox **Campo do Preencher** e input **Rótulo** disponíveis nas Propriedades de camadas de texto e imagem via `setField`.
- **Captura de Tela de Referência (`scripts/capture-biblioteca.js`, `docs/referencias/atelie-biblioteca.png`)**:
  - Captura em 1600 × 950 px mostrando a gaveta Biblioteca aberta sobre a bancada enquanto um documento policial de Arkham de 1926 é montado (321 KB).
- **Testes Unitários e E2E**:
  - `tests/library-defaults.test.js`: 6 testes validando todas as regras de mesclagem, opacidade, tint e cobertura.
  - `tests/library-search.test.js`: 4 testes validando busca sem acento, ordem de palavras, tags, tipos, origens e favoritos.
  - `tests/e2e/library.test.js`: teste E2E ponta a ponta com Playwright criando ambiente com coleção e expansão temporárias e validando:
    1. Listagem de itens da casa e expansão com selo de origem, e filtro por origem.
    2. Clique em mancha (multiply), Shift+clique em papel (fundo cobrindo página) e clique em carimbo (tint azul-escuro).
    3. Drag & drop do elemento da expansão para o palco na posição exata do cursor.
    4. Favoritar e filtrar por favoritos.
    5. Aplicação de fonte em camada de texto atualizando `text.font.library`.
    6. Abertura de modelo com campos abrindo aba Preencher automaticamente, edição de campo alterando o canvas e botão Preencher com exemplo gerando texto plausível.

### Validação
- `npm test`: 100 testes unitários passando 100%.
- `npm run test:e2e`: 9 suítes E2E Playwright passando 100%.
- `node scripts/capture-biblioteca.js`: captura `docs/referencias/atelie-biblioteca.png` gerada e validada.

### Pendências reais
- Nenhuma pendência na Etapa 15.

---

## Etapa 14 — Coleção da casa · fontes livres

### Feito
- **Curadoria e Download das Fontes Livres (`scripts/fonts/fetch.js`, `scripts/fonts/fonts.json`)**:
  - Download das 26 famílias de fontes de licença livre (OFL e Apache 2.0) a partir do commit `e7db6ca603fd4862010383ff17ffd6cc4ffac1c0` do repositório `google/fonts`, totalizando 39 arquivos TTF em `public/colecao/fontes/`.
  - Cache de listagem de diretórios via `fonts.lock.json` para evitar atingir o rate limit de 60 req/h da API do GitHub.
  - Download automático de licenças (`OFL.txt` ou `LICENSE.txt`) armazenadas diretamente ao lado dos arquivos de fontes.
  - Geração de `public/colecao/fontes/LICENCAS.md` documentando detalhadamente família, categoria, identificador SPDX da licença (`OFL-1.1` ou `Apache-2.0`) e URL de origem no GitHub.
- **Parser de Tabelas sfnt TrueType/OpenType (`scripts/lib/font-names.js`)**:
  - Implementação pura de `readFontNames(buffer)` sem dependências externas:
    - Suporte a assinaturas sfnt: `0x00010000` (TrueType), `true` e `OTTO` (OpenType). Buffers truncados ou coleções `ttcf` retornam `null`.
    - Leitura da tabela `name`: extração de família (preferindo nameID 16 sobre 1), subfamília (17 sobre 2), nome PostScript (nameID 6) e nome completo (nameID 4), priorizando registros platformID 3 (Windows Unicode UTF-16BE) e platformID 1 (Mac Roman).
    - Leitura da tabela `OS/2`: extração de peso (`usWeightClass`, padrão 400) e estilo itálico (bit 0 de `fsSelection`).
    - Leitura da tabela `fvar`: detecção de eixos de variação (`wght`, `wdth`, `slnt`, etc.) com valores de mínimo, padrão e máximo.
- **Indexação no Manifesto da Coleção (`scripts/colecao/build.js` e `package.json`)**:
  - Adicionado comando `npm run colecao:fontes` (`node scripts/colecao/build.js --fonts`).
  - Varredura de `public/colecao/fontes/` indexando 39 estilos/arquivos de fontes no manifesto `public/colecao/library.json`, totalizando agora 280 itens no acervo (48 papéis, 53 sobreposições, 140 elementos vetoriais e 39 fontes).
  - Cada entrada recebe id `casa-font-<slug do postscript>`, nome completo, família canônica, categoria oficial, peso, estilo, eixos de variação e licença SPDX.
- **Seletor de Fontes no Editor (`src/editor/font-selector.js`, `src/editor/properties-panel.js`, `src/ui/editor.css`)**:
  - Seletor próprio montado na barra de propriedades de texto com `<select>` nativo oculto para compatibilidade e acessibilidade.
  - Menu popover organizado nas 8 categorias oficiais do Ateliê: *Máquina de escrever*, *Letra à mão*, *Marcador*, *Impressão antiga*, *Jornal e cartaz*, *Gótica*, *Estêncil e militar* e *Tela de computador*.
  - Histórico persistente das 5 fontes mais recentemente usadas no topo via `localStorage`.
  - Campo de busca instantânea filtrando por nome da família e categoria.
  - Renderização de cada nome de família escrito na sua própria tipografia com lazy loading via `IntersectionObserver` acoplado ao `document.fonts.load`.
  - Indicador visual `var` para fontes variáveis e controle deslizante contínuo de peso (`range` slider) no painel de propriedades quando uma fonte variável estiver ativa.
- **Amostrário Tipográfico de Referência (`scripts/colecao/font-specimen.js`, `docs/referencias/colecao-fontes.png`)**:
  - Script automatizado com Playwright gerando folha de espécime em alta fidelidade com as 26 famílias agrupadas por categoria, renderizando frases imersivas de documentos de RPG (366 KB).
- **Métricas de Armazenamento**:
  - 39 arquivos TTF em `public/colecao/fontes/`: **8,4 MB**.
  - Tamanho total da pasta `public/colecao/`: **19 MB** (muito abaixo do teto de 60 MB estipulado para a coleção da casa).
- **Testes Unitários e E2E**:
  - `tests/font-names.test.js`: validação de fonte mínima sintética construída em buffer no teste com tabelas `name`, `OS/2` e `fvar`, teste de buffers arbitrários retornando `null`, e validação de 100% das 39 fontes reais da coleção (3 testes).
  - `tests/colecao-fonts.test.js`: validação das 26 famílias no manifesto, conferência da existência física do arquivo e do arquivo de licença ao lado, conformidade dos identificadores de licença e conferência do `LICENCAS.md` (2 testes).
  - `tests/colecao-manifest.test.js`: ajustado para ignorar `LICENCAS.md` e `OFL.txt` na pasta de fontes (1 teste).
  - `tests/e2e/editor.test.js`: ampliado com passo 14 verificando que o item "Special Elite" tem largura renderizada diferente do fallback sem serifa, e que selecionar a fonte manuscrita "Caveat" altera a família do layer e atualiza os pixels do canvas.

### Validação
- `npm test`: 90 testes unitários passando 100%.
- `npm run test:e2e`: 8 suítes E2E Playwright passando 100%.
- `npm run colecao:fontes:specimen`: espécime `docs/referencias/colecao-fontes.png` gerado e conferido.

### Pendências reais
- Nenhuma pendência na Etapa 14. A coleção de fontes da casa e o seletor visual estão 100% integrados e prontos.

---

## Etapa 13 — Coleção da casa · elementos vetoriais

### Feito
- **Motor de Letras em Traço Puro (`scripts/colecao/vectors/letters.js`)**:
  - Desenho de caracteres e numerais diretamente em vetores `<path>` sobre grade de 5 × 7 pontos, sem dependência de fontes externas e sem tags `<text>` no SVG:
    - Alfabeto completo A–Z, numerais 0–9, pontuações (`/`, `-`, `.`, `,`, `:`, `!`, `?`) e acentuações da língua portuguesa (Ç, Ã, Õ, Á, É, Í, Ó, Ú, Â, Ê, Ô).
    - Função `wordPath(text, { scale, letterSpacing, glyphWidth })` gerando contornos com largura estritamente proporcional ao número de letras.
- **140 Elementos Vetoriais em 11 Famílias (`scripts/colecao/vectors/*.js`)**:
  - *Carimbos retangulares (18)*: `CONFIDENCIAL`, `ULTRA SECRETO`, `SECRETO`, `ARQUIVADO`, `URGENTE`, `RECEBIDO`, `APROVADO`, `NEGADO`, `CÓPIA`, `ORIGINAL`, `CLASSIFICADO`, `PAGO`, `VERIFICADO`, `ARQUIVO MORTO`, `NÃO DIVULGAR`, `EVIDÊNCIA`, `CANCELADO`, `DEVOLVER AO REMETENTE`. Filtro procedimental `feTurbulence` + `feComponentTransfer` embutido simulando desgaste de tinta com semente exclusiva.
  - *Carimbos em branco (6)*: retângulo duplo, cantos chanfrados, círculo duplo, oval, triângulo de advertência e moldura de data (dia/mês/ano) para sobreposição de texto em modo Carimbo.
  - *Selos circulares (8)*: Selo do Arquivo, Departamento de Investigação, Cartório Notarial, Carimbo de Postagem com ondas e 4 molduras circulares em branco com estrela, brasão clássico, monograma com louros e coroa.
  - *Prendedores (10)*: clipe prateado (3 rotações: vertical, 15° e -20°), clipe dourado, clipe de pressão preto (*binder clip*), grampo simples, dois grampos, alfinete com cabeça vermelha esférica, tacha de quadro metálica e prendedor de madeira retrô com mola de aço.
  - *Fitas adesivas (11)*: 6 fitas crepe com extremidades rasgadas organicamente por ruído determinístico (curta, média, longa, diagonal, rasgada irregular e ponta reta), 3 fitas transparentes amareladas com ranhuras serrilhadas de dispensador, bolhas e brilho especular, e 2 fitas isolantes pretas com brilho vinílico.
  - *Etiquetas e cantoneiras (8)*: etiqueta de pasta de arquivo pautada, etiqueta de arquivo manila com ilhós de latão e barbante de juta, etiqueta pericial de evidência criminal com cabeçalho preto e campos preenchíveis, cantoneiras individuais para fotografias (preta, dourada ornada e papel kraft) e 2 conjuntos quádruplos de cantoneiras para montagem de fotos de época.
  - *Lacres de cera (8)*: 4 cores autênticas (vermelho carmim, verde floresta, preto ônix e ouro antigo), com borda fundida irregular de cera derretida, em versões lisa com depressão polida e com relevo heráldico de flor-de-lis.
  - *Molduras (13)*: 3 vitorianas com arabescos e florais, 2 art déco geométricas/leque, 2 medievais/iluminura, 2 certificados/diploma com guilhoché e meandro grego, 2 de fio duplo simples (retangular e chanfrada), 1 moldura de foto instantânea polaroide com margem inferior ampla para anotações e 1 moldura de foto antiga com borda serrilhada tipo cartão-postal.
  - *Brasões e emblemas genéricos (6)*: escudo com águia imperial, escudo com leão rampante, escudo com chaves de arquivo, distintivo policial genérico com estrela de 6 pontas esferadas, bastão de esculápio médico com serpente e brasão acadêmico universitário com livro aberto e tocha.
  - *Símbolos ocultos (18)*: 12 sigilos esotéricos originais combinando anéis concêntricos, círculos, lâminas e geometrias rituais, além de pentáculo ritual, olho da providência no triângulo solar, espiral de Arquimedes, mão de quiromancia com olho na palma, chave antiga com palhetão vazado e ampulheta de destino.
  - *Marcas à mão (20)*: 3 círculos manuais de destaque, 3 sublinhados (simples, duplo e ondulado enfático), 4 setas desenhadas à mão (curvas, em U e rápida), X de cancelamento, ponto de interrogação, ponto de exclamação, 3 riscos de censura/tachado sobre palavras, interrogação/exclamação de margem, 2 colchetes de margem (reto e chave) e estrela de destaque.
- **Aprimoramentos no Renderizador e Decodificação de Imagens**:
  - `src/data/handout-images.js`: adicionado suporte resiliente para decodificação de imagens SVG através de `HTMLImageElement` como fallback, permitindo renderização imediata de SVGs no elemento canvas sem as restrições nativas do `createImageBitmap(blob)` em navegadores Chromium/WebKit.
  - `src/render/handout-render.js`: corrigida a aplicação do efeito `tint` em camadas de imagem para isolar o `source-atop` em um canvas temporário da própria imagem, garantindo que a cor de tingimento incida estritamente sobre os traços opacos da ilustração/carimbo, preservando a transparência das áreas vazadas sobre o papel de fundo.
- **Geração de Ativos e Manifesto (`scripts/colecao/build.js` e `package.json`)**:
  - Adicionado comando `npm run colecao:elementos` (`node scripts/colecao/build.js --elements`).
  - Geração automática de todos os 140 arquivos em `public/colecao/elementos/<id>.svg` e suas prévias em WebP de 320 px em `public/colecao/previews/<id>.webp`.
  - Atualização do manifesto `public/colecao/library.json` para 241 itens no total (48 papéis, 53 texturas e 140 elementos vetoriais).
- **Métricas de Armazenamento**:
  - 140 arquivos SVG em `public/colecao/elementos/`: **153.0 KB** (média de ~1,09 KB por arquivo).
  - Prévias WebP dos elementos: **~380 KB**.
  - Tamanho total da pasta `public/colecao/`: **8,46 MB** (muito abaixo do teto de 60 MB estipulado para a coleção da casa).
- **Folha de Contato (`docs/referencias/colecao-elementos.png`)**:
  - Gerada folha de contato em alta resolução (1760 × 2996 px, 947 KB) contendo todos os 140 elementos vetoriais dispostos sobre o papel "Ofício creme · usado", com os itens monocromáticos recoloridos em tinta azul-escura (`#1b3566`) para validação estética de traços e pesos.
- **Revisão Visual pós-geração**:
  - Revisados os traços dos carimbos: a textura de desgaste (`feTurbulence`) produz bordas envelhecidas autênticas sem perder a legibilidade das inscrições.
  - Os clipes metálicos e tachas possuem iluminação coerente com chanfro e sombras suaves projetadas.
  - As fitas crepe e isolantes apresentam cortes e fibras naturais nas extremidades.
- **Testes Unitários e E2E**:
  - `tests/colecao-letters.test.js`: conformidade do alfabeto completo e teste de largura proporcional com `wordPath` (2 testes).
  - `tests/colecao-vectors.test.js`: validação estrutural dos 140 itens, prefixo `casa-`, atributos SVG obrigatórios (`xmlns`, `viewBox`, `width`, `height`), ausência total de tags `<text>`, ausência de URLs externas e ausência de scripts/eventos (1 teste cobrindo todos os módulos).
  - `tests/colecao-manifest.test.js`: integridade do manifesto de 241 itens, licenças e ausência de arquivos órfãos (1 teste).
  - `tests/e2e/handout-render.test.js`: acrescentado caso de teste com carimbo SVG da coleção sob efeito `tint` vermelho, validando a renderização dos traços vermelhos e a preservação do fundo branco circundante.

### Validação
- `npm test`: 85 testes unitários passando 100%.
- `npm run test:e2e`: 8 suítes E2E Playwright passando 100%.
- `npm run colecao:elementos`: 140 elementos vetoriais e prévias WebP gerados com sucesso.
- `node scripts/colecao/contact-sheet.js`: folha de contato `docs/referencias/colecao-elementos.png` gerada e validada.
- Folhas de contato `docs/referencias/colecao-papeis.png` e `docs/referencias/colecao-texturas.png` inspecionadas e validadas.
- Documento de referência `docs/referencias/colecao-exemplo.png` validado com visual orgânico realista.

### Pendências reais
- Nenhuma pendência na Etapa 12. A coleção da casa de papéis e sobreposições está 100% pronta, versionável no git e com tamanho otimizado (7,78 MB).

---

## Etapa 11 — Efeitos procedurais

### Feito
- **Mecanismo e geradores procedurais (`src/render/handout-effects.js`)**:
  - Tabela `EFFECTS` com os 9 acabamentos de papel, nomes em português, mesclagens iniciais recomendadas e parâmetros padrão:
    1. `crumple` ("Amassado", `soft-light`, `{ creases: 18 }`): vincos poligonais com iluminação e sombreamento paralelos sobre cinza 50% neutro.
    2. `fold` ("Dobras", `multiply`, `{ horizontal: 2, vertical: 1 }`): vincos retos com gradiente escuro/claro estreito sobre branco neutro.
    3. `stain` ("Manchas de café", `multiply`, `{ count: 5, color: '#7a4a1e' }`): anéis de secagem radial escuros na borda, manchas irregulares e respingos satélites.
    4. `burn` ("Bordas queimadas", `normal`, `{ depth: 0.08 }`): borda perimetral queimada e chamuscada com gradiente preto/marrom queimado.
    5. `tear` ("Borda rasgada", `normal`, `{ side: 'bottom', depth: 0.04 }`): corte serrilhado com linha de fibra clara do papel ao longo do rasgo.
    6. `damp` ("Umidade", `multiply`, `{ color: '#8a7a5a' }`): marcas de água secas com bordas perimetrais nítidas e lavagem interna suave.
    7. `fade` ("Desbotado", `screen`, `{ color: '#efe6cf' }`): desbotamento radial iluminado clareando a tinta sobre fundo preto neutro.
    8. `blood` ("Sangue", `multiply`, `{ drops: 12, smear: true, color: '#6e0b0b' }`): gotas carmesim com cauda direcional, respingos finos e arrasto estriado opcional.
    9. `grain` ("Grão", `overlay`, `{ size: 1.5 }`): ruído monocromático pontilhado sobre base 50% cinza neutra.
  - Gerador pseudoaleatório determinístico Mulberry32 `createRng(seed)`: nunca usa `Math.random()`, garantindo reprodução idêntica de pixels para a mesma semente.
  - Função `drawEffect(ctx, width, height, { type, seed, amount, params }, scale)` pura e escalável.
  - Função `drawCutMask(ctx, width, height, { type, seed, amount, params }, scale)` para `burn` e `tear` (branco = manter papel, transparente = recortado; `amount: 0` mantém tudo).
- **Integração no Renderizador (`src/render/handout-render.js`)**:
  - `isCutEffect(layer)` e `applyCutEffect(targetCtx, layer, pw, ph, scale)`: aplica máscara com `destination-in` no canvas composto até o momento antes de renderizar a camada de efeito, preservando toda a área externa à caixa do efeito e recortando de forma idêntica e escalada o papel e os conteúdos sob o efeito.
  - Suporte completo no `drawLayer` para camadas `kind === 'effect'`.
- **Interface do Ateliê (`src/editor/layers-panel.js` e `src/editor/properties-panel.js`)**:
  - Menu "+" → botão **Efeito** com submenu/lista exibindo o nome, modo de mesclagem e miniaturas geradas em 64 px de cada um dos 9 efeitos.
  - Ao escolher um efeito, a nova camada é criada cobrindo toda a página (`x: 0, y: 0, width: page.width, height: page.height`), com a mesclagem inicial recomendada da tabela, posicionada logo acima da camada selecionada.
  - Inspetor de Propriedades com controle de **Intensidade** (`amount`, slider 0–100%), **Variação** (`seed` com botão "↻ outra" que incrementa a semente em +1) e controles específicos de cada tipo (número, cor, checkbox ou seleção de lado).
- **Testes Unitários e E2E**:
  - `tests/handout-effects.test.js`: validação da tabela `EFFECTS`, dos 9 tipos e schema contra `validateHandout`.
  - `tests/e2e/handout-render.test.js`:
    1. Renderização determinística dos 9 efeitos com `seed: 7` amostrados em 20 pontos idênticos.
    2. Variação de semente em `blood`: `seed: 7` vs `seed: 8` produz pixels diferentes.
    3. Efeito em `multiply` com `amount: 0` é completamente neutro (diferença $\le 2$ em todos os canais).
    4. Linha de dobra em `fold` é estritamente mais escura que a 100 px de distância.
- **Imagem de referência**:
  - Gerada em `docs/referencias/efeitos.png` com folha A4 contendo texto à máquina e a combinação dos efeitos "Amassado", "Dobras", "Manchas de café" e "Bordas queimadas".

### Validação
- `npm test`: 73 testes unitários passando 100%.
- `npm run test:e2e`: 8 suítes E2E Playwright passando 100%.
- `npm run build`: bundle de produção Vite gerado com sucesso.
- Imagem de referência `docs/referencias/efeitos.png` gerada e validada.

### Pendências reais
- Nenhuma pendência na Etapa 11. O sistema de efeitos procedurais está 100% completo, determinístico e integrado ao editor.

---

## Etapa 10 — Documentos e rascunho

### Feito
- **Pastas (`src/domain/folders.js` + servidor)**:
  - Funções puras: `createFolder`, `renameFolder`, `moveFolder` (com verificação rigorosa impedindo mover uma pasta para dentro de si mesma ou de qualquer descendente), `removeFolder` (com promoção automática de pastas filhas para o `parentId` da excluída) e `folderPath` (retornando a sequência ordenada de nomes de pastas da raiz ao nó folha).
  - Rotas no servidor Express em `server/routes/folders.js`: `GET /api/atelie/folders` e `PUT /api/atelie/folders` com persistência atômica em `<dataDir>/folders.json` e controle de concorrência com verificação de `expectedRevision` (retornando 409 em caso de conflito e 422 para payloads inválidos).
  - Suporte completo no modo navegador via store IndexedDB `folders` com versão 2 do banco de dados em `src/data/api.js`.
- **Gaveta Documentos / Navegador (`src/editor/navigator.js`)**:
  - Barra de ferramentas superior com campo de busca insensível a acentos e maiúsculas (usando `normalizeText` e `matchesWords`) que casa título do documento, categoria, tags e caminho de pastas.
  - Filtros em chips interativos: **Todos · Favoritos · Recentes · Lixeira**.
  - Seções organizadas: **Fixados** (suporte a até 8 documentos com reordenação e persistência em `localStorage`), **Recentes** (os 10 últimos abertos), **Pastas** (árvore hierárquica recolhível com contador de itens e suporte a cores customizadas) e **Sem pasta**.
  - Linha de documento com miniatura em papel `.at-card` inclinada deterministicamente via `tiltOf`, título, data relativa em português (`formatRelativeTime`), estrela de favorito e clipe `.at-clip` fixado no documento atualmente aberto na bancada.
  - Drag-and-drop completo: arrastar um documento para o cabeçalho de uma pasta move o documento; arrastar uma pasta para outra pasta aninha hierarquicamente; arrastar para "Sem pasta" desvincula da pasta.
  - Menu de contexto nativo com botão direito ou botão de opções:
    - No documento: Abrir, Abrir em nova aba, Duplicar, Renomear, Mover para…, Fixar/Desafixar, Favoritar e Excluir.
    - Na pasta: Nova subpasta, Renomear, Cor da pasta e Excluir.
  - Filtro da Lixeira listando itens deletados com data relativa ("excluído há N dias"), botão de **Restaurar** e botão de **Apagar de vez** com confirmação prévia.
  - Navegação e ações por teclado: setas ↑ e ↓ para navegar entre documentos, Enter para abrir, F2 para renomear e Delete para mover para a lixeira.
- **Rascunho Automático Local (`src/editor/draft.js`)**:
  - Gravação automática local com debounce de 800 ms no IndexedDB dedicado `atelie-drafts` (`{ handout, baseRevision, savedAt }`), funcional tanto no modo servidor quanto no modo navegador.
  - Barra visual de rascunho `.desk-draft-bar` posicionada abaixo da barra do documento com carimbo `.at-stamp` "RASCUNHO", texto "Não arquivado" e botões [Arquivar] e [Descartar rascunho].
  - Mecanismo puro de decisão `draftDecision({ draft, serverHandout })` categorizando entre `'none'`, `'offer'` e `'conflict'`.
  - Modal de recuperação no carregamento oferecendo "Recuperar" ou "Descartar", e tratamento de conflito ("Abrir rascunho como cópia" ou "Descartar").
  - Limpeza automática de rascunho após arquivamento bem-sucedido.
  - Proteção `beforeunload` inteligente que só intercepta o fechamento de página caso o rascunho não tenha conseguido ser gravado localmente no IndexedDB.
- **Versões Anteriores (`src/editor/history-panel.js`)**:
  - Abas no painel Inspetor Histórico: `[Passos da sessão] [Versões arquivadas]`.
  - Listagem de todas as versões salvas de `api.handouts.versions(id)` com data formatada e número de revisão.
  - Prévia instantânea desenhada em canvas pequeno via `renderHandout`.
  - Botão **Restaurar esta versão**, gerando uma nova edição na mesa sem sobrescrever o histórico preexistente.
- **Integração de Documentos na Paleta de Comandos (Ctrl+K)**:
  - Provedor dinâmico em `shell.palette` que pesquisa documentos e pastas com nome da pasta como subtítulo, destacando documentos recentes quando a busca está vazia.
  - Ações diretas: "Nova pasta" e "Abrir lixeira".
- **Coordenação Concorrente entre Abas (`BroadcastChannel('atelie')`)**:
  - Bloqueio automático de edição ao abrir o mesmo documento em duas abas simultâneas, mantendo a segunda aba em modo somente leitura com banner `.desk-readonly-banner`.
  - Ação "Editar aqui" para reivindicar a titularidade da edição, transferindo o status de somente leitura para a outra aba.
- **Testes e Validação**:
  - `tests/folders.test.js`: 7 testes unitários cobrindo criação, renomeação, movimentação (com proibição de ciclos/descendentes), remoção com promoção de filhas e `folderPath`.
  - `tests/folders-server.test.js`: rotas REST de pastas e detecção de conflito de revisão 409.
  - `tests/draft.test.js`: lógica pura de `draftDecision` e persistência no IndexedDB mock.
  - `tests/e2e/navigator.test.js`: E2E completo cobrindo fluxo de pastas, drag/move, busca sem acento, fixados, favoritos, lixeira, recuperação de rascunho pós-reload, restauração de versões e Ctrl+K.
  - `tests/e2e/tabs.test.js`: E2E de concorrência multi-aba via `BroadcastChannel`.
  - Captura de tela de referência salva em `docs/referencias/atelie-documentos.png`.

### Validação
- `npm test`: 71 testes unitários passando 100%.
- `npm run test:e2e`: 8 suítes completas de Playwright passando 100%.
- `npm run build`: bundle de produção Vite gerado sem nenhum erro.
- Captura de referência `docs/referencias/atelie-documentos.png` gerada com sucesso.

### Pendências reais
- Nenhuma pendência na Etapa 10. Toda a gestão de documentos, pastas, rascunhos, versões e multi-aba está completamente funcional e testada.

---

## Etapa 9 — Ferramentas do editor

### Feito
- **Réguas e Guias** (`src/editor/rulers.js`):
  - Réguas interativas de 20 px no topo e à esquerda da mesa, com marcas adaptativas ao zoom calculadas para manter distância mínima de 48 px em tela (passos selecionados entre 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000 px ou mm).
  - Conversões matemáticas puras `pxToMm` e `mmToPx` a 150 DPI (1 mm = 150 / 25,4 px), com teste em `tests/rulers.test.js`.
  - Ativação/desativação das réguas via atalho **Shift+R** e comando na paleta.
  - Criação de guias magnéticas arrastando a partir da régua horizontal (eixo Y) ou vertical (eixo X).
  - Remoção de guias ao arrastar para fora dos limites da página e edição de valor exato com duplo clique.
  - Guias salvas no modelo do documento (`handout.guides = { x: [], y: [] }`) com validação estrita em `src/domain/handouts.js`.
  - Magnetismo magnético (`snapBox`) do palco integrado com as guias do documento em tempo real.
- **Histórico Navegável** (`src/editor/history-panel.js` e `src/editor/state.js`):
  - Aba **Histórico** no inspetor lateral apresentando lista de passos em ordem cronológica reversa, passo atual destacado e passos desfeitos em cinza.
  - Navegação temporal com múltiplos undo/redo ao clicar diretamente em qualquer passo histórico (`state.goTo(index)`).
  - Exposição de `state.steps` e `state.stepIndex` testados unitariamente em `tests/editor-state.test.js`.
- **Mini-barra Flutuante sobre a Seleção** (`src/editor/selection-bar.js`):
  - Barra de ferramentas compacta ancorada acima da camada selecionada (`.at-desk-2`), acompanhando zoom e rolagem e invertendo para baixo quando próxima ao topo da página.
  - Ações rápidas: Duplicar (Ctrl+D), Trazer para frente (Ctrl+]), Enviar para trás (Ctrl+[), seletor de mesclagem rápida (Normal, Multiplicação, Sobrepor, Luz suave, Divisão de tela), Travar/Destravar e Excluir.
- **Conta-gotas** (`I`):
  - Lupa com anel de mira circular de 32 px que segue o cursor e mostra em tempo real a cor exata sob o ponteiro amostrada do canvas via `ctx.getImageData` de 1 px.
  - Aplica a cor diretamente ao campo de cor focado ou à cor da tinta/preenchimento da camada selecionada. Cancelamento via `Escape`.
- **Paleta de Cores e Recentes** (`src/editor/properties-panel.js`):
  - "Cores do documento": amostras dinâmicas (até 12 cores) extraídas de todas as camadas de texto, forma e tingimento do documento ativo.
  - "Recentes": histórico persistente em `localStorage` das últimas 8 cores selecionadas.
  - Amostras clicáveis com foco imediato e aplicação direta nos campos de cor.
- **Imagens Externas (Arrastar e Colar)** (`src/editor/editor.js`):
  - Drag-and-drop de arquivos de imagem direto do sistema operacional para o palco, com envio via `api.uploads.send` e criação automática de camada de imagem centralizada no ponto solto com proporção original (largura máxima de 50% da página).
  - Suporte a múltiplos arquivos soltos em cascata com deslocamento progressivo de 20 px.
  - Colar de imagem via `Ctrl+V` da área de transferência nativa.
- **Copiar e Colar Camadas entre Documentos** (`src/editor/editor.js`):
  - `Ctrl+C` serializa a camada selecionada para a área de transferência do sistema (`atelie-layer:v1:` + JSON) e para memória local.
  - `Ctrl+V` cola a camada com novo ID único, deslocada 20 px, funcionando perfeitamente entre documentos e abas.
- **Alinhamento à Página** (`src/editor/properties-panel.js`):
  - Linha de 6 botões no painel de propriedades: Alinhar à esquerda, Centro horizontal, Direita, Topo, Centro vertical, Base.
  - Cálculo geométrico considerando a rotação (`boxCorners(layer)`) para alinhar a caixa envolvente girada aos limites da folha.
- **Menu de Contexto no Palco** (`src/editor/editor.js`):
  - Botão direito numa camada: Duplicar, Copiar, Colar, Trazer para frente, Enviar para trás, Para o topo, Para o fundo, Travar, Ocultar e Excluir (estilo destrutivo em `--at-wax`).
  - Botão direito na página vazia: Colar, Adicionar texto aqui, Adicionar imagem aqui.
  - Prevenção de propagação indevida para o menu da mesa (`desk`).
- **Ações na Paleta de Comandos (Ctrl+K)** (`src/editor/editor.js`):
  - Registro de todas as ações operacionais do editor com atalhos de teclado correspondentes: Novo documento (todos os presets), Arquivar, Desfazer, Refazer, Duplicar camada, Excluir camada, Adicionar texto/imagem/retângulo, Mostrar réguas, Conta-gotas, Caber na tela e Zoom 100%.
- **Testes**:
  - `tests/rulers.test.js`: passo adaptativo por zoom e conversão px ↔ mm a 150 DPI.
  - `tests/editor-state.test.js`: `steps` e navegação `goTo`.
  - `tests/handouts.test.js`: formato e validação de `guides: { x: [], y: [] }`.
  - `tests/e2e/editor-tools.test.js`: suite completa de ponta a ponta cobrindo todos os 10 requisitos da etapa.
  - Captura de imagem de referência salva em `docs/referencias/atelie-editor-ferramentas.png`.

### Validação
- `npm test`: 61 testes unitários passando 100%.
- `npm run test:e2e`: 6 suítes completas de Playwright passando 100%.
- `npm run build`: bundle de produção Vite gerado sem nenhum erro.
- Captura de referência `docs/referencias/atelie-editor-ferramentas.png` gerada com sucesso.

### Pendências reais
- Nenhuma pendência na Etapa 9. O editor agora possui o conjunto completo de ferramentas operacionais profissionais.

---

## Etapa 8 — Manipulação

### Feito
- **Geometria pura** (`src/editor/geometry.js`):
  - Operações matemáticas completas em coordenadas de documento:
    - `boxCorners(box)`: cálculo dos 4 cantos rotacionados (`nw`, `ne`, `se`, `sw`) em torno do centro.
    - `pointInBox(point, box)`: teste de inclusão de ponto em polígonos rotacionados.
    - `moveBox(box, dx, dy)`: translação da caixa.
    - `resizeBox(box, handle, pointer, options)`: redimensionamento orientado ao puxador com ancoragem oposta fixa ou a partir do centro (`fromCenter: true`), preservação opcional de proporção (`keepAspect: true`) e limite mínimo (`min: 4`).
    - `rotateBox(box, pointer, options)`: cálculo angular do puxador de topo (+90°) com encaixe em múltiplos de 15° (`snap: true`).
    - `snapBox(box, targets, threshold)`: alinhamento magnético às bordas e centros em X e Y para caixas sem rotação.
    - `layerAtPoint(handout, point)`: seleção da camada mais alta visível e destravada.
  - Suíte de 7 testes unitários em `tests/editor-geometry.test.js` cobrindo todas as fórmulas e casos de borda.
- **Manipulação interativa no palco** (`src/editor/stage.js`):
  - Contorno tracejado em `--at-uv` sobre a camada selecionada, com contorno neutro e sem puxadores quando bloqueada (`locked`).
  - Arraste do corpo da camada com captura de ponteiro (`setPointerCapture`) e coalescência de histórico (`coalesce: 'drag-' + id`).
  - 8 puxadores de redimensionamento quadrados com tamanho fixo em tela (10 px), suporte a Shift (manter proporção) e Alt (redimensionar a partir do centro).
  - Cursores CSS dinâmicos nos puxadores ajustados conforme a rotação da camada em passos de 45° (`ns-resize`, `nesw-resize`, `ew-resize`, `nwse-resize`).
  - Puxador redondo de rotação 28 px acima do topo com haste vertical, com suporte a Shift para encaixe em múltiplos de 15°.
  - Linhas guia magnéticas de encaixe em magenta (`.stage-guide-x` e `.stage-guide-y`) exibidas durante o alinhamento com bordas e centros da página e de outras camadas visíveis, desativáveis temporariamente segurando `Ctrl`.
- **Edição de texto no lugar (inline text editing)**:
  - Duplo clique no texto (ou `Enter` com camada de texto selecionada) abre um `<textarea>` transparente diretamente sobre a caixa da camada com mesma tipografia, tamanho escalado pelo zoom, alinhamento, entrelinha e rotação.
  - Ocultação da camada no canvas durante a edição para visualização nítida.
  - Coalescência de digitação (`coalesce: 'type-' + id`) para desfazer a edição inteira em um único passo.
  - Fechamento com `Escape` ou clique fora com isolamento de propagação para não desselecionar a camada.
- **Atalhos de teclado no palco** (`src/editor/editor.js`):
  - Setas direcionais movem 1 px (ou 10 px com `Shift`), agrupando toques rápidos (< 600 ms) via `coalesce: 'nudge-' + id`.
  - `Ctrl+D` duplica a camada selecionada.
  - `Ctrl+]` e `Ctrl+[` sobem e descem a camada na pilha de camadas.
  - `Enter` aciona a edição inline de texto.
  - `Delete` / `Backspace` remove a camada selecionada e `Escape` limpa a seleção.
- **Estilização temática** (`src/ui/editor.css`):
  - Estilos dedicados para puxadores, haste de giro, guias magnéticas e textarea de edição inline com variáveis `--at-*`.
- **Testes de ponta a ponta** (`tests/e2e/editor.test.js`):
  - 6 novos cenários cobrindo translação com zoom (100 px em tela com zoom 50% = 200 px no documento com desfazer em um Ctrl+Z), redimensionamento unilateral e proporcional, rotação com encaixe de 15°, magnetismo ao centro da página, edição de texto inline com duplo clique e movimento com Shift+seta.

### Validação
- `npm test`: 57 testes unitários passando 100%.
- `npm run test:e2e`: 5 suítes completas de Playwright passando.
- `npm run build`: bundle de produção compilado com sucesso.

### Pendências reais
- Nenhuma pendência na Etapa 8. Seleção múltipla, agrupar camadas e alinhar várias de uma vez ficam para etapas posteriores conforme especificado no plano.

---

## Etapa 7 — O editor

### Feito
- **Estado e histórico puro** (`src/editor/state.js`):
  - Histórico de desfazer/refazer com imutabilidade estrita dos documentos de `src/domain/handouts.js`.
  - Agrupamento temporal com chave `coalesce` dentro de uma janela de 600 ms para digitação e controles deslizantes.
  - Limite configurável de passos (descarte dos mais antigos).
  - Remoção automática de seleção (`selection = null`) quando a camada selecionada deixa de existir após desfazer.
  - Testes unitários puros em `tests/editor-state.test.js` cobrindo 5 cenários (100% de sucesso).
- **Palco interativo** (`src/editor/stage.js`):
  - Canvas centralizado com fundo xadrez e sombra física de papel.
  - Renderização via `renderHandout` com coalescência de quadros em `requestAnimationFrame`.
  - Controle de zoom de 10% a 400% e função de ajuste ("Caber" / `fit`), barra flutuante no canto inferior direito e atalho Ctrl + roda do mouse.
  - Retângulo delimitador tracejado em `--at-uv` para a camada selecionada em elemento sobreposto com suporte à rotação.
  - Seleção por clique no palco com hit testing de ponto em polígonos rotacionados e clique fora para desseleção.
- **Painel de camadas** (`src/editor/layers-panel.js`):
  - Apresentação no modelo Photoshop (da camada superior para a inferior).
  - Menu "+" de adição de camadas (Texto, Imagem, Retângulo, Elipse, Linha e Ajuste de cor) inserindo acima da selecionada.
  - Alternância de visibilidade (`visible`) e trava (`locked`).
  - Reordenação por botões de seta (↑ / ↓) e por arrastar-e-soltar nativo (HTML5 drag-and-drop).
  - Ações de duplicação, exclusão e renomeação direta com duplo clique.
- **Inspetor de propriedades** (`src/editor/properties-panel.js`):
  - Controles comuns para todas as camadas (`name`, coordenadas `x`, `y`, dimensões `width`, `height`, `rotation`, `opacity`, `blend`, `clip`, `light`).
  - Propriedades de texto com seleção de fontes do sistema, alinhamento horizontal/vertical, entrelinha, espaçamento entre letras, modo de caixa (`area`/`point`), encolhimento para caber (`fit: 'shrink'`), 4 estilos de tinta (`clean`, `typewriter`, `handwriting`, `stamp`), desgaste (`wear`) e semente de ruído (`seed`).
  - Propriedades de imagem com miniaturas, modal de seleção e envio de imagens via `api.uploads` (`input[type="file"]`), espelhamento horizontal/vertical, modos de enquadramento (`stretch`, `cover`, `contain`), matiz e filtros visuais.
  - Formas vetoriais (tipo, preenchimento, contorno, raio) e camadas de ajuste de cor.
  - Banner informativo e desativação de campos quando a camada está travada.
- **Estilização do editor** (`src/ui/editor.css`):
  - Interface construída exclusivamente com tokens `--at-*` e `--eco-*`, cumprindo tamanhos mínimos de fonte `>= 11px`.
- **Orquestração e atalhos** (`src/editor/editor.js` e `src/main.js`):
  - Barra do documento superior com nome editável, tamanho em selo `.at-stamp`, botões desfazer/refazer e botão **Arquivar** (Ctrl+S).
  - Animação imersiva de carimbo **ARQUIVADO** e geração automática de prévia em WebP (480 px) via `api.handouts.savePreview`.
  - Gaveta de documentos com listagem rápida dos documentos salvos e botão **Novo** com presets de página.
  - Atualização do trilho lateral com os últimos 5 documentos abertos.
  - Atalhos de teclado globais: Ctrl+Z (desfazer), Ctrl+Shift+Z / Ctrl+Y (refazer), Ctrl+S (arquivar), Delete (excluir camada selecionada) e Esc (limpar seleção), respeitando campos com foco.
  - Diálogo modal para confirmação de alterações não salvas ao abrir outro documento ou criar um novo, e proteção `beforeunload`.
  - Navegação e sincronização de URL (`?handout=<id>`, `?new=<preset>` e preservação de `&diagnostics`).
- **Testes de ponta a ponta** (`tests/e2e/editor.test.js`):
  - 8 cenários cobrindo abertura com presets, edição de texto, desfazer/refazer, propriedades, arquivamento com persistência e recarga, upload e visualização de imagem, visibilidade, travamento e reordenação.

### Validação
- `npm test`: 50 testes unitários passando.
- `npm run test:e2e`: 4 suítes E2E completas passando no Playwright.
- `npm run build`: compilação do Vite concluída sem erros ou alertas de módulo.

### Pendências reais
- Nenhuma pendência na Etapa 7. A manipulação direta no palco (puxadores de canto para redimensionamento, rotação e arrastar com o mouse) será implementada na Etapa 8.

---

## Etapa 6 — Armazenamento

### Feito
- Criação dos arquivos base da coleção da casa em `public/colecao/library.json` e documentação de integridade em `public/colecao/README.md`.
- Expansão do modelo canônico em `src/domain/handouts.js` com suporte aos campos opcionais `folder` (string até 80 caracteres ou null) e `favorite` (booleano), incluindo validações rigorosas e testes em `tests/handouts.test.js`.
- Adição de rotas de biblioteca em `server/routes/library.js`:
  - Agregação de origens (`casa` e expansões de `data-private/expansoes/` em ordem alfabética).
  - Cache de manifestos por data de modificação (`mtimeMs`).
  - Desduplicação de itens com prioridade para a casa e aviso no console.
  - Ocultação de camadas (`kind: 'layer'`) da listagem geral, permitindo consulta direta por ID e entrega de arquivos.
  - Resolução de modelos (`kind: 'template'`) incluindo a estrutura do documento em `handout`.
  - Serviço seguro de arquivos com verificação estrita contra travessia de diretório (`safeResolve`) e cabeçalho `Cache-Control: public, max-age=31536000, immutable`.
- Adição de rotas de documentos em `server/routes/handouts.js`:
  - Listagem com sumários ordenados por data de atualização e detecção de prévias existentes.
  - Leitura, criação (iniciando em revisão 1) e gravação atômica via `atomicWrite`.
  - Controle estrito de concorrência com verificação de revisão (HTTP 409 em conflitos).
  - Versionamento mantendo as últimas 30 revisões em `versions/<id>/<rev>.json`.
  - Lixeira com registro de `deletedAt`, restauração atômica e purga definitiva.
  - Remoção automática de itens da lixeira com mais de 30 dias durante a listagem.
  - Armazenamento e entrega de prévias WebP/PNG de até 2 MB.
- Adição de rotas de envios de imagem em `server/routes/uploads.js`:
  - Validação estrita de cabeçalhos binários para PNG (`89 50 4E 47`), JPEG (`FF D8 FF`) e WebP (`RIFF....WEBP`) sem bibliotecas externas.
  - Extração de largura e altura direto dos metadados do cabeçalho binário e rejeição de arquivos inválidos (HTTP 422).
  - Identificadores no padrão `up-[0-9a-f]{12}`, índice em `index.json`, serviço estático imutável e exclusão.
- Criação do cliente unificado em `src/data/api.js`:
  - Implementação completa do modo navegador (`mode: 'browser'`) usando IndexedDB `atelie-v1:<scope>` com stores `handouts`, `versions` (mantendo as 10 últimas), `trash`, `uploads` e `previews`.
  - Implementação do modo servidor (`mode: 'server'`) mapeando as rotas REST `/api/atelie/*`.
  - Consulta estática da coleção da casa via `fetch` em modo navegador.
  - Detecção automática de ambiente e requisição de persistência via `navigator.storage.persist()`.
  - Integração do cliente `api` em `src/main.js` e atualização do badge de armazenamento do rodapé.
- Criação de suítes de testes:
  - `tests/library-server.test.js`: carregamento de coleção e expansões, fusão, desduplicação, modelos, segurança e falha de instalação se faltar `public/colecao/library.json`.
  - `tests/handouts-server.test.js`: fluxo completo de CRUD, revisões, conflitos 409, histórico de versões, lixeira, restauração, auto-purga de 30 dias e prévias.
  - `tests/uploads-server.test.js`: validação de cabeçalhos binários (PNG 3x2), rejeição de texto falso (422), listagem, serviço e exclusão.
  - `tests/e2e/storage-browser.test.js`: teste ponta a ponta com Playwright em servidor puramente estático, criando documento no IndexedDB, recarregando a página e validando persistência e catálogo estático.

### Validação
- `npm test`: 45 testes unitários passando (100% de sucesso).
- `npm run test:e2e`: 3 suítes de teste Playwright passando com sucesso (renderização, shell e persistência no navegador).
- `curl http://127.0.0.1:3011/api/atelie/library`: responde com `{"sources":[{"id":"casa","name":"Coleção do Ateliê"}],"items":[]}`.

### Pendências reais
- CORS e rotas de assado para o Tabletop reservadas para a etapa 18, conforme planejado.

---

## Etapa 5 — Texto

### Feito
- Criação de `src/domain/handout-text-layout.js` com motor puro de diagramação e jitter tipográfico determinístico:
  - `layoutText`: quebra de linha por palavras (`box: 'area'`) e quebra explícita por nova linha (`box: 'point'`), fatiamento por caracteres de palavras que excedem a largura da caixa, suporte a `letterSpacing` em milésimos de em incorporado à medição.
  - Alinhamento horizontal: `left`, `center`, `right` e `justify` (distribuição uniforme do espaço restante entre palavras com última linha de parágrafo preservada à esquerda).
  - Alinhamento vertical: `top`, `middle` e `bottom` (deslocamento vertical da linha de base de acordo com a altura útil da caixa).
  - Encolhimento automático `fit: 'shrink'` por busca binária em 12 passos até `minSize`, sinalizando `overflow: true` caso o limite mínimo não caiba.
  - `inkJitter`: variação orgânica e determinística de glifos baseada em PRNG mulberry32 (`prng`), sem uso de `Math.random`:
    - `clean`: traçado nítido e estritamente neutro.
    - `typewriter`: oscilação em `dx` e `dy`, enfraquecimento de fita gasta (`alpha`) e batida dupla (`ghost`) a cada ~12 caracteres.
    - `handwriting`: micro-rotações, oscilação de escala e ondulação senoidal lenta ao longo da linha.
    - `stamp`: rotação sutil uniforme por camada (`seed`), desgaste de tinta e ausência de ghost.
    - Com `wear: 0`, todos os estilos permanecem perfeitamente neutros.
- Implementação completa de `src/render/handout-text.js` (`drawTextLayer`):
  - Resolução de cadeia de fontes e fallbacks conforme o estilo (`Courier New` para máquina, `cursive` para escrita à mão, `serif` para demais).
  - Caminho rápido para texto `clean` com `letterSpacing: 0`.
  - Renderização glifo a glifo para fontes estilizadas, preservando caracteres com acentos e emojis, com aplicação de jitter, transformações matriciais e batida fantasma (`ghost`).
  - Erosão granulada para `stamp` com desgaste via `destination-out` com ruído determinístico (pontos de 1–3 px) em buffer temporário.
  - Regra de não desenhar nada quando o conteúdo de texto for vazio ou só espaços.
- Criação de `src/data/handout-fonts.js`:
  - Carregador e cache assíncrono de fontes da biblioteca via API `FontFace` do navegador.
  - Cache pela chave `${library}|${weight}|${italic}`.
  - Resolução graciosa com aviso no console caso o arquivo da fonte falhe, permitindo que os fallbacks desenhem normalmente.
- Integração de `createHandoutFonts` e `loadFont` em `src/main.js`.
- Criação da suíte de testes unitários `tests/handout-text.test.js` com 8 cenários cobrindo todas as regras da especificação.
- Adição de testes E2E em `tests/e2e/handout-render.test.js`:
  - Verificação de determinismo pixel a pixel de 20 pontos de amostragem em texto `typewriter` com `wear: 1`.
  - Verificação de simetria geométrica de texto centralizado (diferença de pixels escuros entre metades < 15%).

### Validação
- `npm test`: 40 testes unitários passando (100% de sucesso).
- `npm run test:e2e`: 2 suítes Playwright de ponta a ponta passando com sucesso.
- `npm run build`: build de produção do Vite executado sem erros.
- `grep -n "Math.random" src/domain/handout-text-layout.js src/render/handout-text.js src/data/handout-fonts.js`: zero ocorrências.

### Pendências reais
- Vários estilos tipográficos dentro de um mesmo bloco (ex.: uma palavra em negrito e outra normal) não implementados, conforme planejado para etapas futuras.

---

## Etapa 4 — Renderizador

### Feito
- Criação de `src/domain/wrap.js` copiando `wrapText` de Tabletop e testes em `tests/wrap.test.js`.
- Criação de `src/domain/handout-pixels.js` com matemática pura de filtros e cores:
  - `cssFilter`: conversão de parâmetros de filtro em string CSS com escala para desfoque.
  - `applyAdjustPixels`: manipulação direta de buffers RGBA (curvas por interpolação linear, escala de cinza, sépia W3C, brilho, contraste, saturação, rotação de matiz e inversão).
  - `blendChannel`: cálculo separável de canais para todos os modos da especificação (multiply, screen, overlay, soft-light, hard-light, color-dodge, color-burn, linear-burn, etc.).
- Criação de `src/render/handout-text.js` com implementação inicial mínima de renderização de texto (`drawTextLayer`).
- Criação de `src/data/handout-images.js` gerenciando carregamento assíncrono e cache de `ImageBitmap` para recursos da biblioteca e envios.
- Criação de `src/render/handout-render.js` contendo o motor de renderização `renderHandout`:
  - `visibleIn`: filtro por visibilidade e modo de luz (`normal` vs `uv`).
  - `clipGroups`: agrupamento de camadas base e máscaras de recorte (`clip: true`).
  - `layerMatrix`: cálculo de translação ao centro da caixa, rotação e espelhamento (`flipX`, `flipY`).
  - `fitRect`: cálculo de corte e posicionamento (`contain`, `cover`, `stretch` e `crop` percentual).
  - Composição com até 3 canvases reutilizáveis para grupos de recorte e máscaras de canal alfa.
  - Suporte a camadas de ajuste globais e recortadas, xadrez cinza 50% para imagens ausentes e aviso de efeitos pendentes.
- Suporte a diagnóstico em `src/main.js` (`?diagnostics`) expondo `window.__atelie.renderHandout`.
- Suíte de testes unitários puros em `tests/handout-render.test.js`.
- Suíte de testes de renderização de pixels no navegador com Playwright em `tests/e2e/handout-render.test.js`.

### Validação
- `npm test`: 32 testes unitários passando.
- `npm run test:e2e`: 2 suítes de teste de ponta a ponta Playwright passando (shell + renderização de pixels).
- `npm run build`: gerando build estático sem erros.

### Pendências reais
- Nenhuma pendência na Etapa 4.

---

## Etapa 3 — Modelo de dados

### Feito
- Criação de `src/domain/errors.js` exportando a classe `ValidationError` com caminho e mensagem formatados.
- Criação de `src/domain/handouts.js` definindo a estrutura canônica de dados de documentos do Ateliê:
  - Formato JSON canônico: schema 1, ID UUID, revisão, nome, categoria, tags, dimensões/cor de fundo da página, lista de camadas, campos de preenchimento ("Preencher"), tipo de origem e referência opcional de verso (`back`).
  - 5 tipos de camada com blocos de propriedades exclusivos: `image`, `text`, `shape`, `adjust` e `effect`.
  - Mapeamento completo de modos de mesclagem em `BLEND_MODES` (16 modos nativos + 4 modos de compatibilidade Photoshop mapeados via `canvasOperation`).
  - Dimensões padrão em `PAGE_PRESETS` (A4 retrato/paisagem, carta, recorte de jornal, polaroid, telegrama, cartão, bilhete, quadrado).
  - Funções puras imutáveis: `createHandout`, fábricas (`imageLayer`, `textLayer`, `shapeLayer`, `adjustLayer`, `effectLayer`), `addLayer`, `updateLayer`, `removeLayer`, `moveLayer`, `duplicateLayer`, `setField`, `fillFields`, `layerAt` e `libraryRefs`.
  - Função de validação rigorosa `validateHandout(doc)` que verifica limites, integridade de cores hexadecimais, unicidade de IDs de camadas, ordem estrita de pontos de curva e referências válidas de campos e verso.
- Criação da suíte de testes em `tests/handouts.test.js` cobrindo todos os 9 cenários do plano com 100% de sucesso.

### Validação
- `npm test`: 25 testes passando (100% de sucesso).
- `npm run test:e2e`: teste ponta a ponta Playwright passando normalmente.

### Pendências reais
- Nenhuma pendência na Etapa 3.

---

## Etapa 2 — Identidade visual e casca da interface

### Feito
- Download automatizado de fontes OFL da interface (`IM Fell English` e `Courier Prime`) do repositório `google/fonts` (commit `e7db6ca603fd4862010383ff17ffd6cc4ffac1c0`) via `scripts/fonts/fetch.js`, com integridade garantida por SHA-256 em `scripts/fonts/fonts.lock.json`.
- Substituição da camada de tokens `--tt-*` pela camada `--at-*` em `src/ui/theme.css`, definindo tipografia editorial, cores da bancada noturna, tinta ferrogálica, papel envelhecido, cera e violeta UV.
- Implementação das primitivas visuais em `src/ui/primitives.css` e `src/ui/primitives.js`:
  - `.at-tape`: fita crepe com pontas serrilhadas e Courier Prime.
  - `.at-stamp`: carimbo com borda dupla e falha de tinta via máscara procedural SVG `feTurbulence`.
  - `.at-card`: cartão de papel com rotação determinística estável por id (`tiltOf`).
  - `.at-note`: bilhete preso por fita crepe para notificações.
  - `.at-desk`: superfície da bancada com vinheta radial da luminária.
  - `.at-btn` e `.at-icon-btn`: botões táteis nos tons ultravioleta, cera e neutro da mesa.
- Estrutura completa da casca em `src/ui/shell.js`:
  - Trilho (80px) com botões táteis, área de recentes e atalhos.
  - Gavetas laterais deslizantes (360px) para Documentos, Biblioteca e Modelos.
  - Bancada central (`.at-desk`) com ilustração vetorial SVG (`src/ui/illustrations.js`) e estado vazio.
  - Rodapé discreto indicando "Salvando neste navegador".
  - Inspetor lateral direito (320px) com abas Propriedades, Preencher, Camadas e Histórico.
- Notificações em formato de bilhete em `src/ui/notify.js` com empilhamento de até 3 notas e animação física de assentamento.
- Menu de contexto flutuante em `src/ui/context-menu.js` com reposicionamento automático na tela e navegação por teclado.
- Paleta de comandos (Ctrl+K) em `src/ui/palette.js` com suporte a busca insensível a acentos/maiúsculas, palavras em qualquer ordem e registro dinâmico de comandos da casca.
- Painel de Ajustes da mesa em `src/ui/settings.js` com 5 texturas procedurais de bancada (Madeira, Feltro, Couro, Concreto, Preto), intensidade/temperatura da luminária, unidades de medida e suporte a redução de animação persistidos em `localStorage`.
- Script de captura de referência `scripts/capture.js` com geração de 8 imagens em `docs/referencias/` (6 do Ateliê e 2 da Ficha).

### Comparativo Visual (Ateliê vs. Ficha)
- **Comum**: Fundo escuro imersivo, tipografia editorial marcante, layout estruturado com trilho de navegação lateral à esquerda, paleta rápida de comandos via Ctrl+K com atalhos em rodapé e elementos que remetem a recortes táteis de papel.
- **Próprio do Ateliê**: O Ateliê é concebido como a bancada noturna de um artesão/falsificador sob iluminação quente de luminária ajustável, destacando-se pelo violeta de luz negra (`--at-uv`), títulos colados com fita crepe serrilhada, carimbos de borracha granulados e micro-rotações físicas nos cartões.

### Validação
- `npm test`: 16 testes unitários passando (taxas de contraste conferidas, fontes mínimas >= 11px, `tiltOf` estável, busca da paleta sem acentos e fora de ordem).
- `npm run test:e2e`: teste ponta a ponta com Playwright executando todas as interações da casca, gavetas, teclado (Esc, setas, Enter), Ctrl+K, troca de material nos ajustes com persistência após recarregamento e verificação de redução de movimento.
- `scripts/capture.js`: gerou todas as 8 capturas em 1600x950 em `docs/referencias/`.

### Pendências reais
- Nenhuma pendência na Etapa 2.

---

## Etapa 1 — O projeto

### Feito
- Estrutura completa de diretórios: `scripts/`, `scripts/library/`, `server/`, `src/ui/`, `src/ui/fonts/`, `tests/`, `tests/e2e/`, `data/`, `public/colecao/`, `data-private/expansoes/`.
- Configuração do `.gitignore` com exclusão rigorosa de `data-private/`, `node_modules/`, `dist/`, etc.
- Definição do `package.json` com scripts (`dev`, `build`, `start`, `test`, `test:e2e`, `library:*`) e dependências alinhadas.
- Servidor Express em `server/app.js`, `server/index.js`, `server/paths.js` e `server/storage.js` com rota `/api/atelie/health` e suporte a SPA.
- Configuração do Vite em `vite.config.js` com porta padrão 5174 e proxy para API na porta 3011.
- Script de desenvolvimento unificado em `scripts/dev.js`.
- Arquivos de UI iniciais: `index.html`, `src/main.js`, `src/ui/theme.css`, fontes Hanken Grotesk, `src/ui/icons.js` (com ícone `doc`), `src/ui/controls.js`, `src/ui/styles.css`.
- Testes unitários implementados:
  - `tests/privacy.test.js`: limites estritos entre arquivos públicos e coleções privadas (`data-private`), ausência de importações restritas no código do cliente.
  - `tests/server.test.js`: inicialização do servidor Express, verificação da rota `/api/atelie/health` e roteamento SPA.
  - `tests/controls.test.js`: validação de componentes de controle (`splitLabel`, `numberField`, `choiceField`, `colorField`, `normalizeHex`).
  - `tests/theme.test.js`: verificação de fontes mínimas (>= 11px), contraste e ausência de cores hardcoded na folha de estilos.
- Teste E2E implementado em `tests/e2e/shell.test.js` com Playwright.

### Validação
- `npm test` rodando e passando 100%.
- `npm run build` executado gerando `dist/` sem pacotes de backend.
- `npm run test:e2e` rodando e passando com Chromium headless.

### Pendências reais
- Nenhuma pendência na Etapa 1.
