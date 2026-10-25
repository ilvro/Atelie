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
| 12 — Coleção papéis e texturas | pendente | | Coleção da casa: papéis e sobreposições |
| 13 — Coleção elementos | pendente | | Coleção da casa: vetores, carimbos, fitas |
| 14 — Coleção fontes | pendente | | Coleção da casa: 26 famílias de fontes |
| 15 — Biblioteca | pendente | | Gaveta Biblioteca e modo de preenchimento |
| 16 — Coleção modelos | pendente | | Coleção da casa: 36 modelos prontos |
| 17 — Início e galeria | pendente | | Tela de abertura e catálogo de modelos |
| 18 — Assar e entregar | pendente | | Renderização final e integração de entrega |
| 19 — Luz UV | pendente | | Camadas secretas visíveis sob luz negra |
| 20 — Modo leitura | pendente | | Leitura imersiva, lupa, lanterna UV, verso |
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
