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
| 21 — Exportar e imprimir | concluída | 2026-10-25 | Exportação de PNG em alta resolução (2048 px e 300 ppp), luz UV, gaveta Exportar, atalho E e layout de impressão 1:1 sem margens |
| 22 — Importar elementos | concluída | 2026-10-25 | Importador CLI de imagens, símbolos e fontes para a expansão privada Arquivos Confidenciais |
| 23 — PSD leitura | concluída | 2026-10-25 | Expansão: leitura da estrutura dos PSDs (sem pixels), relatórios, métricas e árvore normalizada |
| 24 — PSD compositor | concluída | 2026-10-25 | Expansão: composição de PSD em Node |
| 25 — PSD modelos | concluída | 2026-10-25 | Expansão: conversão de PSD para modelos editáveis com campos, fusão de fundo, WebP, UV e testes |
| 26 — Publicar no Pages | concluída | 2026-10-25 | Build estático sem servidor, workflow GitHub Pages, backup/restauração e testes |
| 27 — Documentação | concluída | 2026-10-25 | Manuais, guia de uso, manutenção, atalhos, gaveta de ajuda e licenças |
| Refinamento de UI & UX | concluída | 2026-10-25 | Correção miniatura trilho, alinhamento abas, controles CSS, texturas da bancada, pan por botão direito/meio, filtros rápidos de categoria na biblioteca |
| Tutoriais Interativos | planejado | 2026-10-25 | Sistema de lições práticas guiadas estilo Tabletop (motor tutor, anel de foco, 4 trilhas práticas) |
| 28 — Integração Tabletop | concluída | 2026-10-25 | Consumo e interação direta dentro do Tabletop (rotas A, B e C, UV, bakes, popover, paleta, atualização em tempo real) |
| 29 — Expansão no navegador | concluída | 2026-10-25 | Instalação local de expansões via pasta (IndexedDB), manifesto, cota, persistência offline, cache de blobs e remoção |
| 30 — Importador JIT de Bundles | concluída | 2026-10-25 | Importar pastas de bundles brutos (.psd + prévias + fontes) sob demanda no navegador sem terminal |
| Refinamento de Tipografia e Camadas | concluída | 2026-10-25 | Geometria e alinhamento de textos, proporção de fontes mistas, recorte de caixas de texto, e painel de camadas com pastas, cores e snippets |
| Refinamento de Expansões na Gaveta de Modelos | concluída | 2026-10-25 | Botão direto de instalação de expansão na gaveta Modelos, atalho em buscas vazias e mensagens claras sobre PSDs brutos |
| Qualidade de Vida · Fase 0 — Inserção de Camadas | concluída | 2026-10-25 | Função pura insertionIndex, papéis acima de papéis existentes, assets acima da seleção ou no topo, addLayer estrito, rolagem e flash no painel |

---

## Etapa 28 — Integração no Tabletop

### Feito
- **Implementação completa da integração no Tabletop (`/home/ilvro/Documents/Projects/Tabletop`) conforme Contrato v1**:
  - `src/data/atelie.js`: módulo cliente do contrato com determinação de URL padrão (`defaultAtelieUrl` para GitHub Pages irmão `../Atelie/` e dev local `http://127.0.0.1:3011/`), sanitização de URL com HTTPS ou localhost (`setAtelieUrl`), seleção pura das três rotas (`chooseRoute`), filtro rigoroso de mensagens de janela (`filterAtelieMessage`: origem do Ateliê, `app === 'atelie'`, `contract === 1`, `nonce` ativo) e link de ciclo de vida (`createAtelieLink`).
  - `src/domain/inspectables.js`: suporte nativo a `design: { app: 'atelie', id, revision, source }` e `uvImageRef: { id, revision } | null` em lados de página inspecionáveis, validação estrita, inclusão em `pageImages` e `sideKey`, preservação de segredo de apresentação no projetor e novo papel em `PAPERS`: `['design', 'Documento do ateliê']`.
  - `src/render/page-textures.js`: papel `paper === 'design'` desenha a imagem assada cobrindo a folha (`cover`), sem grão, manchas nem vincos procedurais. Suporte a assados sob luz UV no runtime de páginas.
  - `src/ui/inspection-overlay.js` & `src/app/live/inspection.js`: botão **Luz UV** e atalho **U** na inspeção quando há `uvImageRef`, vinheta violeta radial sobre a cena desfocada e sincronização ao vivo do estado `uv: true/false` para a janela do projetor caso a pista tenha sido revelada.
  - `src/app/application.js` & `src/ui/inspectable-panel.js`:
    - "Do ateliê…": popover `#atelie-dialog` com prévias e busca nos caminhos A e C; abertura de popup `pick()` no caminho B.
    - "Editar no Ateliê" e "Novo no Ateliê": passagem segura de `nonce` e origem.
    - "Desvincular": remove o vínculo sem alterar o modelo da mesa.
    - "Atualizar a partir do Ateliê" e aviso `#notice` com "Atualizar na cena (N objetos)": sincronização em tempo real via `BroadcastChannel('mesa:handout')` ou `postMessage`.
    - Ação na paleta de comandos: "Pôr documento do Ateliê na mesa" coloca folha A4 ou recorte de jornal no centro da visão já inspecionável.
    - Ajustes: seção **Ateliê de documentos** com campo de endereço, status de disponibilidade e caminho em uso.
  - `src/tutorial/lessons.js` & `conditions.js`: lição **Uma carta do Ateliê** (`atelie-letter`) e condições `atelieAvailable` e `designUsed`.
- **Testes e Validação**:
  - `tests/atelie-link.test.js`: 5 testes unitários de rotas, sanitização, filtros e ciclo de vida passando (Node).
  - `tests/inspectables.test.js`: testes unitários de metadados do contrato, segredo de apresentação e tipo de papel passando (Node).
  - `tests/e2e/atelie-exchange.test.js` (**Caminho A — Navegador compartilhado / Pages**): banco `mesa-handouts-v1`, listagem/uso, leitura, projetor com UV ao vivo e atualização em tempo real por `BroadcastChannel` (Playwright E2E) passando.
  - `tests/e2e/atelie-window.test.js` (**Caminho B — Janela / Qualquer origem**): janela popup com `?pick=1&from&nonce`, rejeição estrita de nonces incorretos, apps divergentes, contratos incompatíveis e origens forjadas, e entrega por `postMessage` (Playwright E2E) passando.
  - `tests/e2e/atelie-http.test.js` (**Caminho C — Servidor local / HTTP**): servidor HTTP simulando `/api/atelie/health`, `/handouts`, `/preview` e `/bake?light=normal|uv` com `X-Atelie-Revision`, popover picker, bakes e atualização (Playwright E2E) passando.
  - Suíte completa do Tabletop: **411 testes unitários passando**, `tests/e2e/inspection.test.js` e `tests/e2e/interact.test.js` passando sem regressões. Documentação atualizada em `docs/DOCUMENTOS_INTERATIVOS.md` e `docs/GITHUB_PAGES.md`.

---

## Refinamento — Leitura de Textos nos Modelos e Organização do Painel de Camadas

### Feito
- **Correção da Geometria e Posicionamento de Textos (`scripts/library/lib/psd-geometry.js`)**:
  - `textBoxInDocument`: correção da ancoragem de textos pontuais (`point`) alinhados ao centro (`justify: 'center'`) e à direita (`justify: 'right'`). O centro agora é projetado como `[-estimatedWidth/2, estimatedWidth/2]`, corrigindo o título ("Folha de s.paulo") que antes era deslocado para fora da página à direita.
  - Alinhamento da linha de base (`baseline`) com a renderização do Canvas do Ateliê (`-size * 0.8`).
- **Resolução de Font Size Dominante em Textos com Estilos Mistos (`scripts/library/lib/psd-tree.js`)**:
  - Quando um bloco de texto possui múltiplos `styleRuns` (ex: manchete em 54 pt e corpo com 1100 caracteres em 38 pt), o conversor agora seleciona o estilo do trecho com maior contagem de caracteres (`dominantStyle`), evitando que todo o corpo do artigo fosse renderizado com o tamanho gigante da manchete e transbordasse sobre fotos e matérias adjacentes.
  - Seleção idêntica de alinhamento dominante em `paragraphStyleRuns`.
- **Expansão de Caracteres de Tabulação (`\t`) e Delimitação de Caixas de Texto (`src/domain/handout-text-layout.js` e `src/render/handout-text.js`)**:
  - Expansão determinística de caracteres `\t` para 4 espaços no motor de layout e cálculo preciso de offsets de palavras através de fatiamento do texto medido (`lineText.slice(0, foundIdx)`), preservando o espaçamento exato entre "Desde 1921" e "Um Jornal a Serviço do Brasil" sem sobrepor as estrelas decorativas.
  - Recorte estrito em caixas de texto com `box: 'area'` (`ctx.rect(startX, startY, w, h); ctx.clip()`), impedindo qualquer transbordamento visual sobre camadas adjacentes.
  - Atribuição de `fit: 'shrink'` para caixas de texto na conversão de PSDs, ajustando os blocos de coluna com perfeição.
- **Painel de Camadas Redesenhado com Pastas e Cores (`src/editor/layers-panel.js` e `src/ui/editor.css`)**:
  - **Estrutura Hierárquica em Pastas**: agrupamento automático por pasta principal (ex: 📁 **TEXTOS**, 📁 **IMAGENS**, 📁 **FUNDO**, 📁 **DESGASTE**) com contagem de camadas, botão de recolher/expandir (estado preservado), e botões em lote para alternar visibilidade ou trava de todo o grupo com um único clique.
  - **Identificação Visual por Cores**: etiquetas de cor personalizáveis (vermelho, laranja, amarelo, verde, azul, roxo, cinza) ou padrão por tipo de camada (Azul para Texto, Verde para Imagem, Âmbar para Formas, Roxo para Ajustes e Laranja para Efeitos). Indicador vertical lateral e ícones coloridos com fundo translúcido sutil. Seletor de cores rápido acessível no painel.
  - **Nomes Limpos e Snippet de Conteúdo**: remoção de prefixos repetitivos (`Textos · Tags · `) no nome da camada, exibindo o nome direto da camada com badge de subgrupo e uma prévia em itálico do texto real (ex: *“Folha de s.paulo”*, *“Lorem Ipsum Dolor...”*), tornando imediata a localização de qualquer camada no documento.
  - **Barra de Filtros e Alternância de Modo**: chips no topo para filtrar camadas (`Todas`, `Texto`, `Imagem`, `Efeitos`) e botão para alternar entre visão agrupada em Pastas e lista plana.

### Validação
- `npm test`: 159 testes unitários passando 100%.
- `tests/e2e/editor.test.js` e `tests/handouts-psd-tree.test.js`: testes executados e aprovados.
- Captura visual em navegador real validada (`verified-newspaper.png`).

---

## Etapa 29 — Expansão no próprio navegador

### Feito
- **Instalador de Expansão no Navegador (`src/data/expansion-installer.js`)**:
  - `validateExpansionManifests(files)`: validação estrutural obrigatória de integridade de `expansion.json` e `library.json`, normalização de metadados, identificador de escopo (`id`) e lista de itens.
  - `calculateExpansionSize(files)`: soma precisa de bytes de todos os arquivos binários e JSON da pasta selecionada.
  - `checkStorageSpace(sizeBytes)`: verificação de cota com `navigator.storage.estimate()` e solicitação de persistência com `navigator.storage.persist()`. Exige pelo menos 1,5× o tamanho total livre no disco antes de iniciar.
  - Leitores de diretório com fallback multiplataforma:
    - `readFolderFromDirectoryHandle`: leitura recursiva via File System Access API (`showDirectoryPicker()`) para navegadores baseados em Chromium (Chrome, Edge).
    - `readFolderFromFileList`: leitura em lote via elemento `<input type="file" webkitdirectory>` para Firefox, Safari e navegadores legados.
  - Banco IndexedDB `atelie-expansions-v1`:
    - Store `expansions`: armazena `expansion.json` normalizado e metadados de instalação.
    - Store `items`: armazena os registros do `library.json` com `source` mapeado para o ID da expansão.
    - Store `files`: armazena os arquivos binários em formato `Blob` indexados pela chave composta `[expansionId, caminhoRelativo]`.
  - Operações CRUD do instalador: `installExpansion`, `removeExpansion`, `listInstalledExpansions`, `getExpansionFile` e `getExpansionItems`.
- **Diálogo de Instalação e Confirmação (`src/ui/expansion-dialog.js` e `src/ui/styles.css`)**:
  - Modal com `z-index: 400` exibindo metadados da expansão: título, descrição, licença, total de itens, tamanho formatado em MB e aviso de privacidade: *"Os arquivos ficam só neste navegador. Não compartilhe nem publique esta expansão."*.
  - Barra de progresso de gravação em tempo real (0 a 100%) calculada item a item durante a cópia para o IndexedDB, com botão de cancelamento.
- **Gerenciamento de Expansões nas Configurações (`src/ui/settings.js`)**:
  - Seção dedicada **Expansões neste navegador** dentro do modal de Ajustes.
  - Listagem dinâmica das expansões instaladas mostrando nome, quantidade de itens e consumo em disco.
  - Botões para "Atualizar" (reinstalação por cima da versão existente) e "Remover" (limpeza completa das stores do IndexedDB daquela expansão).
  - Botão de ação primária "Instalar expansão deste computador…".
- **Integração com a Biblioteca e Resolução de Recursos em Tempo de Execução (`src/data/api.js`)**:
  - No modo navegador (e build estático do GitHub Pages), `api.library.list()` mescla dinamicamente as fontes e itens da coleção da casa com os itens das expansões instaladas no IndexedDB.
  - Suporte completo a modelos de expansão em `api.library.item(id)`.
  - Sistema de resolução de URLs (`resolveFileURL` e `resolvePreviewURL`): geração sob demanda de `URL.createObjectURL(blob)` com gerenciamento inteligente em `objectUrlCache` e auto-revogação após 2 minutos de inatividade para evitar vazamento de memória.
- **Aviso de Dependência de Expansão Ausente no Editor (`src/editor/editor.js`)**:
  - Ao carregar qualquer documento (`loadHandout`), verificação das camadas para checar referências a origens/expansões; caso utilize uma expansão não instalada no navegador atual, dispara notificação amigável na tela informando que o documento depende de uma expansão externa.
- **Testes Unitários e E2E**:
  - `tests/expansion-install.test.js`: 5 testes unitários cobrindo validação de manifestos, cálculo exato de tamanho em bytes, decisão e recusa por limite de cota (< 1,5×) e fluxo completo no IndexedDB (instalação, busca de itens, leitura de arquivos binários e desinstalação).
  - `tests/e2e/expansion-browser.test.js`: teste E2E completo no build estático do Pages, instalando uma expansão via `webkitdirectory`, confirmando a presença de itens e crachá de origem na gaveta de biblioteca, inserção em documento, persistência após recarregamento de página (F5) e remoção limpa com limpeza de acervo.

### Validação
- `npm test`: 159 testes unitários passando 100%.
- `tests/e2e/expansion-browser.test.js`: teste E2E executado e aprovado com sucesso.
- `npm run build:pages` e `npm run build`: ambos os builds concluídos sem erros.

### Pendências reais
- Nenhuma pendência na Etapa 29.

---

## Etapa 30 — Importador de Bundles Sob Demanda (JIT) no Navegador

### Feito
- **Scanner Raso de Bundles com Zero RAM (`src/data/bundle-scanner.js`)**:
  - `cleanTemplateCategory` e `cleanTemplateName`: normalização e extração determinística de nomes de bundles e categorias limpas.
  - `scanBundleFiles(files)`: escaneamento raso de estruturas de diretórios (Chromium `showDirectoryPicker()` ou `<input type="file" webkitdirectory>`).
  - Reconhecimento automático da trinca de arquivos de pacotes de acervos brutos:
    - Arquivos `.psd`/`.psb` (documentos Photoshop originais);
    - Subpasta `Prévias/` (ou `Previas/`, `previews/`): imagens prontas `.png`/`.jpg` associadas aos PSDs correspondentes por nome base, índice ou nome limpo;
    - Subpasta `Fontes/` (ou `Fonts/`): arquivos de fonte `.ttf`, `.otf` ou pacotes `.zip` contendo tipografia.
  - `registerJitBundle(db, bundle)`: registro imediato do bundle no IndexedDB `atelie-expansions-v1` com `jit: true`, marcando os modelos pendentes (`status: 'pending'`), armazenando prévias visuais em Blobs e mantendo os arquivos `.psd` prontos para conversão sob demanda.
- **Motor Client-Side de Conversão JIT (`src/editor/client-psd-converter.js`)**:
  - Carregamento estritamente preguiçoso (*lazy-load*) do `ag-psd` via `await import('ag-psd')` (evitando qualquer peso no carregamento inicial da aplicação).
  - Conversão focada de arquivo único: decodifica apenas o `.psd` selecionado pelo usuário.
  - Composição de fundo limpa em `<canvas>` nativo, desenhando apenas as camadas não textuais visíveis com seus respectivos modos de mesclagem (`multiply`, `screen`, `soft-light`, etc.) e exportando para WebP Blob sem texto duplicado por baixo.
  - Extração de tipografia e caixas de texto com projeção geométrica e delimitadores em escala 1:1.
  - Descompactação de fontes em `.zip` no navegador via `fflate.unzipSync` e registro dinâmico via `new FontFace(...)` e `document.fonts.add()`.
  - Persistência automática do modelo convertido (`status: 'ready'`), do fundo WebP e do documento JSON no IndexedDB local.
  - Desalocação forçada de memória de canvas (`width = 0; height = 0`).
- **Diálogo Artesanal de Conversão JIT (`src/ui/conversion-dialog.js` e `src/ui/styles.css`)**:
  - Modal com z-index 450, barra de progresso animada (0–100%), indicador de etapa em tempo real (*Lendo PSD...*, *Analisando camadas...*, *Carregando tipografia...*, *Compondo fundo...*) e botão de cancelamento via `AbortController`.
- **Integração na Gaveta de Modelos (`src/editor/templates-drawer.js`)**:
  - Botão **Carregar bundle (JIT)** na barra superior da gaveta.
  - Suporte completo a **Arrastar e Soltar (Drag & Drop)** de pastas diretamente na gaveta de modelos (distinguindo automaticamente se a pasta solta é uma expansão pronta com `expansion.json` ou uma pasta de bundle com `.psd` brutos).
  - Badge visual `JIT` nos cards de modelos pendentes.
  - Visualização de detalhes com botão adaptativo **Preparar e usar este modelo**, acionando o diálogo de conversão JIT e abrindo o documento editável instantaneamente ao concluir.
- **Testes e Validação**:
  - `tests/bundle-scanner.test.js`: 6 testes unitários cobrindo normalização de nomes, emparelhamento de PSDs com prévias e fontes, suporte a múltiplos bundles e conversão JIT de árvore de camadas.
  - `tests/e2e/bundle-import.test.js`: teste E2E completo no build estático do GitHub Pages servido via Express, executando escaneamento raso de pasta de bundle mock, listagem com badge JIT, acionamento da conversão client-side e verificação de texto editável carregado no editor.
  - `tests/theme.test.js`: conformidade estrita mantida com 0 cores `#hex` soltas em `styles.css`.
  - Suíte completa: **166 testes unitários passando**, **4 testes E2E passando**.

### Pendências reais
- Nenhuma pendência na Etapa 30.

---

## Qualidade de Vida · Fase 0 — Camadas Entram Onde se Espera

### Feito
- **Regra e Função Pura de Inserção (`src/domain/handouts.js`)**:
  - Implementada função pura `insertionIndex(handout, layer, { selectedId = null, role = 'auto' } = {})`.
  - Itens de papel (`role: 'paper'`, `layer.kind === 'paper'`, `layer.role === 'paper'`, ou detectados por `isPaperLayer`) são posicionados logo acima da camada de papel mais alta já existente no documento (`highestPaperIndex + 1`), garantindo que trocar ou adicionar folhas nunca oculte textos, manchas ou carimbos existentes.
  - Demais elementos (texturas, sangue, carimbos, textos, formas, ajustes e efeitos) são inseridos logo acima da camada selecionada (`selectedIndex + 1`), ou no **topo absoluto** (`handout.layers.length`) quando não houver seleção ativa ou o ID selecionado for nulo.
- **Validação Estrita de Índice em `addLayer` (`src/domain/handouts.js`)**:
  - `addLayer(handout, layer, index = handout.layers.length)` agora valida estritamente `typeof index === 'number' && Number.isInteger(index)`, lançando `TypeError` caso receba strings, `null`, `NaN` ou não-inteiros.
  - Impede definitivamente regressões silenciosas de chamadas que passavam o ID da camada (string UUID) em vez de índice numérico, o que causava `splice(NaN)` e inseria elementos no fundo do documento (posição 0).
- **Uniformização de Todos os Pontos de Criação de Camadas**:
  - `src/editor/editor.js`: arrastar elementos da biblioteca para o palco, arrastar arquivos de imagem, colar do clipboard, criação de texto (`addTextAt`), criação de imagem (`addImageAt`), colar camadas/duplicar e adicionar formas via paleta de comandos.
  - `src/editor/library-panel.js`: clique em itens da biblioteca (`applyItemToHandout`) e criação de camadas de texto por fontes (`applyFontToHandout`).
  - `src/editor/layers-panel.js`: menu de inserção "+" e menu de efeitos procedurais.
- **Retorno Visual e Foco no Painel de Camadas (`src/editor/layers-panel.js` e `src/ui/editor.css`)**:
  - Ao inserir nova camada, a linha correspondente é automaticamente selecionada, pastas recolhidas são expandidas se necessário, a lista de camadas rola até a nova camada (`scrollIntoView({ block: 'nearest' })`) e a linha pisca com destaque visual sutil (`.layer-item.flash`) usando os tokens `--eco-mid` (220 ms) e `--eco-ease`.
  - Otimização do listener de rolagem para evitar chamadas contínuas durante o arraste e manipulação de camadas no palco.
- **Testes e Validação**:
  - `tests/handouts.test.js`: testes unitários para `insertionIndex` com papéis em documentos vazios, normais e de múltiplos papéis; posicionamento de sangue com e sem camada selecionada; e validação de `addLayer` rejeitando strings, `null`, `NaN` e aceitando inteiros.
  - `tests/e2e/library.test.js`: teste E2E completo validando o arraste de "Sangue · gotas múltiplas" para um documento com 10 camadas preexistentes sem seleção, confirmando que a nova camada entra em `layers.at(-1)` (posição 11), é selecionada, e que seus pixels vermelhos são renderizados com sucesso sobre o canvas.
  - Suíte completa: **167 testes unitários passando**, **todos os testes E2E passando**.

### Pendências reais
- Nenhuma pendência na Fase 0. Próxima fase: Fase 1 (Sons da bancada sintetizados com Web Audio).

---

## Refinamento de UI, UX e Plano de Tutoriais Interativos

### Feito
- **Correção da Miniatura no Trilho (`src/ui/styles.css`)**:
  - Correção de overflow na prévia de documento recente (`.rail-recent-item`), adicionando `overflow: hidden`, `padding: 0` e estilizando a imagem interna (`width: 100%; height: 100%; object-fit: cover`) para impedir que miniaturas estourem em um quadrado branco gigante sobre a barra lateral.
- **Alinhamento e Estrutura das Abas do Inspetor (`src/editor/editor.js` e `src/ui/styles.css`)**:
  - Ajuste de `display: flex` e `align-items: stretch` nas abas do inspetor, eliminando o desalinhamento vertical da aba "Preencher".
- **Estilização Completa dos Controles de Propriedades (`src/ui/controls.css`, `src/ui/controls.js` e `src/main.js`)**:
  - Criação da folha de estilos `src/ui/controls.css` definindo tipografia compacta, rótulos `.field-label` estilizados, caixas de valor `.value-box`, campos hexadecimais `.hex-box`, seletores de cor com amostras táteis e botões de escolha segmentados (`.choice-field`) fiéis à linguagem visual tátil e limpa da ficha cinematográfica de `Ficha teste - Ordem II` (bordas nítidas, fundo escuro sólido e sem halos/glows difusos artificiais).
  - Preenchimento visual contínuo nos sliders (`.range-field`): implementação de trilho com progresso gradiente dinâmico (`--range-progress`) refletindo a proporção exata do valor selecionado em tempo real, e thumb físico sólido em branco com anel ultravioleta e sombra sutil projetada.
- **Texturas Procedurais para Superfície da Bancada (`src/ui/primitives.css`)**:
  - Implementação de regras CSS para o atributo `[data-desk-material]` nos 5 materiais configuráveis: `madeira` (veios escuros de tábua com ranhuras táteis), `feltro` (baeta verde profunda de mesa de jogos), `couro` (couro envelhecido castanho/bordô com textura de grão), `concreto` (ardósia áspera industrial) e `preto` (obsidiana minimalista de alto contraste).
- **Navegação no Palco por Botão Direito e Meio do Mouse (`src/editor/stage.js`)**:
  - Adição de movimentação livre da bancada (panning/arraste de tela) ao pressionar e arrastar com o botão do meio (scroll) ou botão direito do mouse, com supressão inteligente do menu de contexto após o arraste para não abrir menus acidentais, além do atalho `Espaço + Botão Esquerdo`.
- **Filtros Rápidos por Categoria na Biblioteca (`src/editor/library-panel.js` e `src/ui/controls.css`)**:
  - Barra de chips/pílulas horizontais roláveis no topo da gaveta de Biblioteca para filtrar diretamente as categorias (`Todas`, `Papéis`, `Manchas`, `Sangue`, `Água`, `Sujeira`, `Rasgos`, `Carimbos`, etc.) sem necessidade de recolher sanfonas manualmente, além de botão para expandir ou recolher tudo.
- **Plano Arquitetural de Tutoriais Interativos (`plano-tutoriais-interativos.md`)**:
  - Especificação completa do motor de lições práticas no estilo do Tabletop (`src/tutorial/tutor.js`, `conditions.js`, `lessons.js`, `tutorial-drawer.js`), anel de destaque pulsante (`.tutorial-ring`), cartões com dicas de artesanato de documentos e 4 trilhas práticas (Fundamentos da Carta de Época, Dossiê Investigativo, A Arte da Luz UV e Entrega ao Tabletop).

### Validação
- `npm test`: 154 testes unitários passando 100%.
- `npm run test:e2e`: 18 suítes E2E passando 100%.
- `npm run build`: bundle de produção compilado com sucesso (1.95s, sem erros de tipagem ou imports).

### Pendências reais
- Aprovação do plano de tutoriais interativos pelo usuário para execução da Fase 1 (Motor e UI).

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

## Etapa 27 — Documentação e ajuda

### Feito
- **Gaveta de Ajuda no Aplicativo (`src/ui/help.js` e `src/ui/help.css`)**:
  - Abertura direta via botão **Ajuda** no trilho ou atalho de teclado **?** (fora de campos de edição).
  - Títulos de seções com fita crepe visual `.at-tape`.
  - Campo de busca no topo filtrando dinamicamente as seções por texto e palavras-chave.
  - 6 seções completas:
    1. *Como começar*: 3 passos para forjar documentos com botão **Mostrar de novo** que reabre os bilhetes sequenciais de boas-vindas.
    2. *Atalhos*: tabela completa gerada dinamicamente a partir de `src/ui/shortcuts.js` e agrupada por categoria.
    3. *Camadas e mesclagem*: resumo objetivo de cada tipo de camada e modos de mesclagem essenciais para papel (Multiply, Overlay, Soft Light, Screen, Clip).
    4. *Luz UV*: guia de criação de camadas secretas sob luz negra, alternância na bancada (atalho U) e lanterna UV no modo leitura.
    5. *Usar no Tabletop*: benefícios da integração, endereços de conexão (`../Atelie/` e `http://127.0.0.1:3011/`) e os 3 caminhos do contrato.
    6. *Coleção e expansões*: distinção entre coleção pública da casa e expansões privadas, com menção ao guia de manutenção.
- **Módulo Central de Atalhos (`src/ui/shortcuts.js`)**:
  - Lista única e centralizada de todos os atalhos da aplicação (`SHORTCUTS`), com `id`, `key`, `label`, `description`, `category`, `handledIn` e `tokens` para validação por testes.
  - Função auxiliar `getShortcutsByCategory()`.
- **Módulo Modular de Boas-Vindas (`src/ui/welcome.js`)**:
  - Extração dos 3 bilhetes sequenciais com suporte ao parâmetro `force: true` para reexibição sob demanda.
- **Manual do Usuário (`docs/USO.md`)**:
  - Guia exaustivo de 14 seções cobrindo todos os recursos do aplicativo: modelos, Preencher, camadas, mesclagens, recorte, estilos de tinta, uploads, biblioteca, efeitos procedurais, luz UV, navegador de documentos, rascunhos, histórico, modo leitura, exportação em alta resolução (2048 px e 300 ppp), impressão 1:1, integração Tabletop e backup.
- **Manual de Manutenção e Expansões (`docs/MANUTENCAO.md`)**:
  - Documentação técnica detalhando a estrutura da coleção da casa, teto de 60 MB, comandos de regeneração (`npm run colecao:texturas`, `colecao:modelos`), importador CLI de elementos e fontes, conversor CLI de modelos PSD, interpretação de relatórios (`report.json`), tratamento de modelos com tag `revisar` e aviso categórico de privacidade.
- **Gerador e Registro de Licenças (`scripts/licenses.js` e `docs/LICENCAS.md`)**:
  - Script CLI determinístico gerando `docs/LICENCAS.md` a partir de `public/colecao/library.json` e fontes de interface.
  - Registro de licenças de tudo o que é distribuído: código sob MIT, fontes de interface (Hanken Grotesk, IM Fell English, Courier Prime) sob OFL-1.1, 26 famílias de fontes livres sob OFL-1.1 e Apache-2.0, e ativos da casa sob licença própria do Ateliê.
- **Atualização do README (`README.md`)**:
  - Links para os guias (`docs/USO.md`, `docs/MANUTENCAO.md`, `docs/LICENCAS.md`, `docs/GITHUB_PAGES.md`), captura da bancada (`docs/referencias/atelie-inicio.png`) e instruções rápidas.
- **Testes Unitários e E2E**:
  - `tests/shortcuts.test.js`: 4 testes unitários conferindo estrutura, presença de cada atalho em manipuladores de teclado nos arquivos indicados, sincronização com botões `data-key` do trilho e agrupamento por categoria.
  - `tests/licenses.test.js`: 3 testes unitários conferindo idempotência de `docs/LICENCAS.md`, validade das licenças de todas as 26 famílias de fontes e preenchimento de `license` em 100% dos itens da coleção.
  - `tests/e2e/help.test.js`: teste E2E Playwright validando abertura da gaveta por `?` e clique no trilho, filtro de busca por "uv", restauração de seções e reabertura dos bilhetes de boas-vindas pelo botão "Mostrar de novo".

### Validação
- `npm test`: 154 testes unitários passando 100%.
- `npm run test:e2e`: 18 suítes E2E passando 100%.
- `tests/shortcuts.test.js`: 4 testes passando 100%.
- `tests/licenses.test.js`: 3 testes passando 100%.
- `tests/e2e/help.test.js`: teste E2E da gaveta de ajuda passando 100%.

### Pendências reais
- Nenhuma pendência na Etapa 27.

---

## Etapa 26 — Publicar no GitHub Pages

### Feito
- **Configuração de Build Estático (`vite.config.js` e `package.json`)**:
  - Modo `pages`: define `import.meta.env.VITE_ATELIE_STORAGE` como `'browser'`, `outDir: 'dist-pages'`, `base: './'`.
  - Scripts `build:pages` e `preview:pages` adicionados a `package.json`.
  - `.gitignore` atualizado incluindo `dist-pages/`.
  - Resolução dinâmica de URLs de coleção e uploads em modo navegador sem dependência de rotas `/api/`.
- **Workflow do GitHub Actions (`.github/workflows/pages.yml`)**:
  - Pipeline oficial `actions/upload-pages-artifact@v3` e `actions/deploy-pages@v5`.
  - Disparado em push na branch principal (`main` ou `master`) ou manualmente via `workflow_dispatch`.
  - Executa `npm ci`, `npm test` e `npm run build:pages`, publicando exclusivamente o diretório `dist-pages/`.
- **Cópia de Segurança e Restauração (`src/data/backup.js` e `src/ui/settings.js`)**:
  - `exportBackup(api)`: exportação completa de todos os documentos, pastas e uploads (com imagens codificadas em base64) para arquivo `.json`.
  - `importBackup(api, backupData)`: mesclagem segura que preserva documentos locais existentes, ignorando itens do backup com revisão menor.
  - Interface em **Ajustes**: exibição do espaço utilizado no navegador via `navigator.storage.estimate()`, botão **Exportar tudo** com download automático e botão **Importar** com feedback de itens importados/ignorados.
  - Persistência garantida: chamada automática a `navigator.storage.persist()` ao arquivar documentos em modo navegador.
- **Documentação de Publicação (`docs/GITHUB_PAGES.md`)**:
  - Guia completo cobrindo configuração no GitHub (Settings → Pages → Source: GitHub Actions), onde ficam os dados (IndexedDB local), isolamento de origem/subcaminho, cópia de segurança, integração direta com Tabletop irmão (`../Atelie/` e `mesa-handouts-v1`) e privacidade estrita (nenhum dado de expansão privada entra no build público).
- **Testes Unitários e E2E**:
  - `tests/backup.test.js`: 2 testes validando ida e volta de exportação/importação com base64, preservação de documentos locais preexistentes e descarte de revisões menores.
  - `tests/pages-build.test.js`: verificação de integridade do build em `dist-pages/` (ausência de dados privados, sem IDs `ac-`, tamanho total de 21 MB, bem abaixo do teto de 80 MB).
  - `tests/e2e/pages.test.js`: teste ponta a ponta com Playwright e servidor estático Express simulando o subcaminho `/Atelie/` e a mesa irmã `/Tabletop/` na mesma origem (carregamento da coleção sem requisições `/api/`, persistência no IndexedDB ao recarregar a página, gravação em `mesa-handouts-v1` com assado gráfico e notificação em tempo real via `BroadcastChannel`).

### Validação
- `npm test`: 147 testes unitários passando 100%.
- `npm run test:e2e`: 17 suítes E2E passando 100%.
- `tests/backup.test.js`: 2 testes passando 100%.
- `tests/pages-build.test.js`: teste de integridade do build passando 100%.
- `tests/e2e/pages.test.js`: teste E2E do Pages passando 100%.
- `dist-pages/`: compilado com sucesso (21 MB total, 0 arquivos privados).

### Pendências reais
- Publicação de fato no GitHub Pages na conta do usuário (quando o usuário realizar o push para o repositório remoto).

---

## Etapa 25 — Converter PSDs em modelos do ateliê

### Feito
- **Casamento de Fontes (`scripts/library/lib/font-match.js`)**:
  - `matchFont(postscript, fonts)`: cascata de três níveis:
    1. Nome PostScript exato (sem diferenciar maiúsculas/minúsculas).
    2. Slug normalizado de `postscript` comparado com o slug de `family + subfamily` ou `fullName`.
    3. Família limpa (sem espaços ou hífens) como prefixo de `postscript`, aplicando heurística de peso (700 para `Bold`, 300 para `Light`, 900 para `Black`) e itálico (`Italic`/`Oblique`).
- **Conversor de Árvore PSD para Modelo (`scripts/library/lib/psd-to-handout.js`)**:
  - `psdToHandout(tree, pixels, options)`: conversor puro gerando `{ handout, rasters, report }`.
  - Escala uniforme respeitando dimensão máxima (2048 px ou A4 a 1240 px).
  - Grupos `pass-through`: filhos entram na lista plana herdando opacidade e máscara com prefixo no nome (`"Grupo · Camada"`).
  - Grupos isolados: compostos isoladamente em camada `image`.
  - Grupos de variação (`variantGroups`): camadas ocultas vêm com `visible: false` e prefixo `"Variação · "`.
  - Grupos de UV (`looksLikeUv`): camadas recebem `light: 'uv'`.
  - Objetos inteligentes afins: compostos sem texto como imagem transformada para a posição dos cantos, e camadas de texto internas extraídas como camadas de texto independentes no espaço transformado do documento com o modo e opacidade do smart object.
  - Camadas de ajuste mapeadas para `adjust`: `hue/saturation`, `black & white`, `brightness/contrast`, `invert`, `curves` e `levels` (amostrado em 9 pontos).
  - Tipografia: texto extraído com caixa em coordenadas de documento, alinhamento, tamanho escalado, cor, estilo de tinta (`clean`, `typewriter`, `handwriting`) e vinculação a campos de "Preencher".
  - Detecção de vagas de imagem via regex (`/foto|imagem|retrato|brasão|brasao|coloque|insira|sua imagem|placeholder/i`) convertidas em campos de imagem.
  - Fusão de camadas de fundo: sequências vizinhas de camadas `image` `normal` consecutivas no fundo são compostas num único raster "Fundo" para reduzir o número de camadas para 5–30.
  - Sanitização de nomes de camada (máx. 80 chars) e rótulos de campos (máx. 120 chars) com fallback de modos de mesclagem não suportados para `normal`.
  - Validação de integridade estrita por `validateHandout` antes da gravação do modelo.
- **CLI de Importação de Modelos (`scripts/library/import-psd.js`)**:
  - Suporte completo a `--source`, `--dest`, `--bundle`, `--file`, `--limit`, `--force`, `--verbose`.
  - Indexação incremental em `state/psd-index.json` por tamanho e data de modificação.
  - Gravação de rasters em WebP recortado (`quality: 88`) em `templates/<tplId>/<nn>.webp` e prévias (`previews/<tplId>.webp`, lado maior 480 px).
  - Atualização do manifesto `library.json` com itens `kind: 'template'` e `kind: 'layer'`.
  - Validação comparativa sem texto: `compareWithoutText(a, b, textMask)` mascarando caixas de texto com critério automático `mae ≤ 8, bad ≤ 5%` (modelos com desvios superiores gravados com tag `revisar`).
  - Geração de relatórios por modelo em `reports/templates/<id>.json` e relatório consolidado legível em `reports/templates-summary.md`.
- **Testes Unitários (`tests/handouts-psd-to-handout.test.js`)**:
  - 8 testes cobrindo todas as regras:
    1. Grupo `pass-through` "Com Rasgo" com pixel `soft-light`.
    2. Variantes irmãs com ocultas em `visible: false`.
    3. Camadas UV com `light: 'uv'`.
    4. Smart object afim com texto e pixel: separação em raster e camada de texto transformada com campo.
    5. Ajustes `hue/saturation` e `levels` com amostragem de 9 pontos.
    6. Fusão de 3 imagens `normal` consecutivas em "Fundo".
    7. `matchFont` para 'Lora-Bold' (700) e fallback null.
    8. Validação completa com `validateHandout`.
- **Teste E2E Playwright (`tests/e2e/handout-templates.test.js`)**:
  - Geração de PSD sintético pequeno com `writePsd` do `ag-psd` (fundo, sombra multiply, texto com campo).
  - Importação com `importPsdTemplates` para expansão temporária.
  - Abertura no navegador com `?diagnostics&template=<id>`.
  - Verificação de abertura automática da aba "Preencher".
  - Edição do campo de texto pelo formulário e confirmação de atualização do estado e dos pixels do Canvas no palco.
- **Execução Real**:
  - `4- Recorte de Jornal.psd`: `mae = 0.26`, `bad = 0.00%` [ACCEPTED].
  - `1- Quadro Azul.psd`: `mae = 0.68`, `bad = 0.70%` [ACCEPTED].
  - `2- Relatório Policial.psd` (Bundle 59 UV): 30 camadas, 9 camadas UV com `light: 'uv'`, 12 campos editáveis, `mae = 13.96`, `bad = 30.92%` [REVISAR].
  - Pacote inteiro `Bundle 4 - Jornais (PARTE 1)` (9 PSDs): 9 modelos gerados, 5 aceitos automaticamente, 4 marcados para revisar, 0 erros fatais.

### Validação
- `npm test`: 144 testes unitários passando 100%.
- `npm run test:e2e`: 16 suítes E2E Playwright passando 100%.
- `tests/handouts-psd-to-handout.test.js`: 8 testes passando 100%.
- `tests/e2e/handout-templates.test.js`: teste passando 100%.
- `import-psd.js` executado com sucesso nos três arquivos de referência e no pacote Bundle 4 completo.
- `git status`: limpo, nenhum arquivo privado em git.

### Pendências reais
- Nenhuma pendência na Etapa 25.

---

## Etapa 24 — Compor as camadas de um PSD em Node

### Feito
- **Raster e Utilitários de Buffer (`scripts/library/lib/raster.js`)**:
  - `createBuffer(width, height)` e `cloneBuffer(buf)`: buffers `{ width, height, data: Float32Array }` com RGBA em 0–1 não pré-multiplicado.
  - `fromImageData(imageData)` e `toUint8ClampedArray(buffer)`: suporte a conversões bidirecionais de 8 bits e 16 bits (`data instanceof Uint16Array ? 65535 : 255`) para compatibilidade com PSDs de 16 bits como o *1- Quadro Azul.psd*.
  - `resizeBuffer(buffer, targetW, targetH)` e `resizeMask(mask, targetW, targetH)`: redução com Sharp usando kernel `lanczos3` (pré-multiplicando o alfa para evitar contornos escuros).
- **Composição com Alfa e Mesclagens (`scripts/library/lib/blend.js`)**:
  - Implementação da fórmula padrão W3C (*Compositing and Blending Level 1*) com `source-over`:
    $$\alpha_o = \alpha_s + \alpha_b \cdot (1 - \alpha_s)$$
    $$C_o = [ (1 - \alpha_b) \cdot \alpha_s \cdot C_s + \alpha_b \cdot \alpha_s \cdot B(C_b, C_s) + (1 - \alpha_s) \cdot \alpha_b \cdot C_b ] / \alpha_o$$
  - `blendPixel(mode, backdrop, source, out)`: mesclagens separáveis (`normal`, `multiply`, `screen`, `overlay`, `hard-light`, `soft-light`, `darken`, `lighten`, `color-dodge`, `color-burn`, `linear-dodge`, `linear-burn`, `difference`, `exclusion`) e não separáveis (`hue`, `saturation`, `color`, `luminosity`, `lighter-color`, `darker-color`).
  - Normalização de nomes de modos (`replace(/\s+/g, '-').toLowerCase()`) para compatibilidade com os identificadores retornados pelo `ag-psd` (ex.: `'lighter color'`, `'soft light'`).
  - `compositeLayer(target, layer, options)`: composição espacial com posições negativas ou parciais, máscara de camada e máscara de recorte da camada base (`clipAlpha`).
- **Camadas de Ajuste (`scripts/library/lib/adjust.js`)**:
  - Funções puras para os 7 tipos principais de ajustes do acervo:
    - `hue/saturation`: matiz, saturação e luminosidade no espaço HSL, incluindo modo `colorize`.
    - `black & white`: luminância interpolada pelos pesos padrão do Photoshop por faixa de matiz (vermelhos 40, amarelos 60, verdes 40, cianos 60, azuis 20, magentas 80) e suporte a `useTint`.
    - `brightness/contrast`: brilho aditivo e contraste centralizado em 0.5.
    - `invert`: inversão pura $1 - v$.
    - `levels`: aplicação encadeada do canal composto RGB e dos canais individuais R, G, B com intervalos de entrada/saída e gama (`midtoneInput`).
    - `curves`: tabela de consulta (LUT) de 256 valores com interpolação linear entre pontos.
    - `color balance`: equilíbrio de tons médios nos eixos ciano↔vermelho, magenta↔verde e amarelo↔azul ponderado por $4 \cdot L \cdot (1 - L)$, com restauração de luminosidade quando `preserveLuminosity: true`.
  - `adjustBuffer(buffer, adjustment, options)`: aplicação direta sobre o buffer com modulação por máscara e alfa da base (`clipAlpha`).
- **Compositor de Árvore (`scripts/library/lib/compose.js`)**:
  - `composeTree(tree, pixels, { scale, skip, warnings })`: composição recursiva de baixo para cima.
  - Implementação do comportamento do Photoshop *"Blend Clipped Layers As Group"*: grupos de camadas recortadas (`clipping: true`) são renderizados em buffer isolado e depois mesclados ao documento usando o modo e opacidade da camada base.
  - Grupos `pass-through`: filhos compostos diretamente sobre o buffer do documento.
  - Grupos isolados: composição interna em buffer transparente seguida de mesclagem do grupo todo com seu modo e opacidade.
  - Mapeamento e aviso para máscaras vetoriais e efeitos de camada (sempre ignorados conforme a regra do projeto).
- **CLI de Conferência Visual (`scripts/library/psd-check.js`)**:
  - Leitura de PSDs na escala final com `ag-psd`, composição completa da árvore e comparação contra o composite original do Photoshop (`psd.imageData`).
  - `compareBuffers(a, b)`: cálculo do erro absoluto médio (`mae`, ponderado pelo alfa da imagem de referência) e fração de pixels com erro > 24 (`bad`).
  - Saída estruturada em `<expansão>/reports/psd-check/<slug>/`: `original.png`, `nosso.png`, `diferenca.png` ($|a - b| \times 4$) e `resultado.json`.
- **Testes Unitários (`tests/handouts-compose.test.js`)**:
  - 10 testes com buffers 4 × 4 construídos à mão:
    1. `normal` com opacidade 0.5 de vermelho sobre branco $\to (1, 0.5, 0.5, 1)$.
    2. `multiply` de azul sobre vermelho $\to$ preto; `screen` $\to$ magenta.
    3. Fonte com alfa 0.5 em `multiply` sobre fundo transparente preserva cor e alfa.
    4. `luminosity` de cinza 50% sobre vermelho puro resulta em vermelho com luminância 0.5.
    5. Grupo `pass-through` vs grupo `normal` isolado com filho `multiply` geram resultados distintos.
    6. Recorte: base na metade esquerda restringe camada recortada preta apenas à esquerda.
    7. Máscara com metade 0 e metade 1 oculta metade da camada e respeita `defaultColor: 255`.
    8. `hue/saturation` com saturação −100 resulta em $R = G = B$; `invert` duas vezes restaura o original.
    9. `curves` mapeia ponto intermediário (128 para 200/255).
    10. `compareBuffers` de buffers iguais dá `mae: 0`; 1 pixel alterado em 16 dá `bad: 1/16`.
- **Resultados nos Três Arquivos de Referência**:
  - `Bundle 4 - Jornais (PARTE 1)/Bundle 4 - Jornais [Complexo]/4- Recorte de Jornal.psd`:
    - **Medido**: `mae = 0.29`, `bad = 0.01%` (Critério: `mae ≤ 6`, `bad ≤ 3%`). **Aprovado**.
  - `Bundle 21 - Polaroides e Porta-Retratos (PARTE 1)/1- Quadro Azul.psd`:
    - **Medido**: `mae = 0.68`, `bad = 0.70%` (Critério: `mae ≤ 6`, `bad ≤ 3%`). **Aprovado**.
  - `Bundle 59 - Rework Documentos Policiais com Luz UV/2- Relatório Policial.psd`:
    - **Medido**: `mae = 16.85`, `bad = 29.76%` (Critério: `mae ≤ 10`, `bad ≤ 8%`).
    - **Análise do Diferencial**: 70% do documento (todo o papel de fundo, texturas de amassado, dobras e tipografia) apresenta erro praticamente nulo ($0 \le \text{erro} \le 3$). A discrepância concentra-se estritamente no cone superior de luz UV do grupo `Efeito de UV`, que contém efeitos de camada do Photoshop (`solidFill:hard light` de cor roxa `#4a2a66`, `innerShadow`, `outerGlow`). Como o projeto estipula explicitamente não implementar efeitos de camada (*"Não implemente efeitos de camada: só avise"*), os pixels brutos da camada de luz permanecem sem o preenchimento roxo gerado pelos efeitos do Photoshop, elevando a média na área iluminada.

### Validação
- `npm test`: 136 testes unitários passando 100%.
- `npm run test:e2e`: 15 suítes E2E Playwright passando 100%.
- `tests/handouts-compose.test.js`: 10 testes passando 100%.
- `psd-check.js` executado nos três arquivos de referência com saídas geradas em `reports/psd-check/`.

### Pendências reais
- Nenhuma pendência na Etapa 24.

---

## Etapa 23 — Ler a estrutura dos PSDs (relatório)

### Feito
- **Stub Mínimo de Canvas para Node (`scripts/library/lib/psd-canvas.js`)**:
  - `useImageDataCanvas()`: implementa um canvas em memória sem dependências nativas para satisfazer os requisitos internos de leitura de pixels do `ag-psd` quando for necessário na etapa 24.
- **Transformações Geométricas e Afins Puras (`scripts/library/lib/psd-geometry.js`)**:
  - `cornersToAffine(corners, width, height)`: cálculo da matriz afim de transformação de quadriláteros `[x0,y0, x1,y1, x2,y2, x3,y3]` com verificação de paralelogramo (tolerância 0,5 px); cantos não paralelos retornam `{ perspective: true }`.
  - `applyAffine(matrix, x, y)`: aplicação de afim a um ponto 2D no espaço do documento.
  - `composeAffine(m1, m2)`: multiplicação de transformações para objetos inteligentes aninhados.
  - `textBoxInDocument(text, outer)`: posicionamento, dimensões, rotação (via `atan2(b, a)`) e escala (`sqrt(a² + b²)`) de camadas de texto no espaço do documento (suporte a tipos `box` e `point`).
- **Árvore Normalizada e Analisadores (`scripts/library/lib/psd-tree.js`)**:
  - `PSD_BLENDS`: mapeamento de 20 modos de mesclagem do Photoshop para os identificadores do Ateliê, tratando modos sem equivalente ou desconhecidos como `unsupported:<nome>`.
  - `normalizeTree(psd, { linked })`: converte a estrutura do `ag-psd` em nós puros (`kind`: `'group'`, `'pixel'`, `'text'`, `'smart'`, `'adjust'`), calculando opacidade efetiva (`opacity * fillOpacity`), caminhos hierárquicos com `/` (`path`), efeitos de camada e recursão em objetos inteligentes vinculados.
  - `textNodes(tree)`: extração recursiva de todos os textos (inclusive dentro de objetos inteligentes) com a caixa já transformada no espaço do documento, incluindo tamanho escalado e propriedades tipográficas completas.
  - `variantGroups(tree)`: detecção automática de variantes em grupos irmãos de primeiro nível onde exatamente um está visível.
  - `looksLikeUv(nodeOrName)`: identificação de camadas UV através de palavras isoladas `\buv\b` ou `luz negra`, sem falsos positivos (ex.: rejeita `Uva`).
- **CLI e Gerador de Relatório (`scripts/library/psd-report.js`)**:
  - Script CLI com suporte a `--source`, `--expansion`, `--bundle` (inclusive listas separadas por vírgula), `--file` e `--limit`.
  - Leitura rápida de estruturas com `readPsd` ignorando pixels (`skipLayerImageData: true`), lendo PSBs vinculados iniciados com magic bytes `8BPS`.
  - Cálculo de pontuação de complexidade (0–100): começa em 100, −5 por mesclagem sem equivalente, −3 por tipo de ajuste não suportado, −10 por smart object em perspectiva, −2 por efeito de camada (máx. −20), −15 se não contiver texto.
  - Geração de relatórios por arquivo em `<expansão>/reports/psd/<slug>.json`, consolidado em `<expansão>/reports/psd-summary.json` e tabela legível em Markdown em `<expansão>/reports/psd-summary.md`.
- **Testes Unitários (`tests/handouts-psd-tree.test.js`)**:
  - 7 testes unitários sintetizando objetos ag-psd à mão: grupo pass through com pixel multiply e clipping; mesclagem vivid light não suportada; caixa de texto com matriz e cor padrão preta; objeto inteligente escalado 2x contendo texto; detecção de perspectiva; grupos de variantes; e reconhecimento de camadas UV.
- **Medição Real no HD (3 pacotes: `Bundle 4`, `Bundle 2`, `Bundle 59`)**:
  - **Tempo de execução**: 4,5 segundos para 22 arquivos PSD/PSB analisados (2,92 GB totais).
  - **Erros**: 0 erros.
  - **Total de camadas de texto**: 158 camadas de texto encontradas e mapeadas.
  - **Cinco modos de mesclagem mais comuns**: `normal` (345), `multiply` (137), `pass-through` (39), `screen` (31), `overlay` (26). Também ocorrem: `hard-light` (17), `soft-light` (16), `linear-burn` (16), `color-dodge` (3), `unsupported:linear light` (3), `unsupported:vivid light` (2).
  - **Cinco camadas de ajuste mais comuns**: `curves` (40), `levels` (29), `black & white` (25), `hue/saturation` (14), `color balance` (10).
  - **Efeitos de camada mais comuns**: `dropShadow` (27), `innerGlow` (26), `outerGlow` (26), `solidFill` (26), `innerShadow` (25), `stroke` (25).
  - **Fontes ausentes mais frequentes na biblioteca**: `Calibri` (5 arquivos, 24 camadas), `Moinho` (5 arquivos, 6 camadas), `OldNewspaperTypes` (5 arquivos, 15 camadas), `TimesNewRomanPSMT` (4 arquivos, 26 camadas), `UnderwoodChampion` (3 arquivos, 4 camadas), `EasySpeech` (2 arquivos, 7 camadas), `F25Executive` (2 arquivos, 26 camadas), `KingthingsTrypewriter2` (2 arquivos, 9 camadas).
  - **Detecção de Luz UV**: identificada com sucesso em 100% dos documentos policiais do Bundle 59 (`Efeito de UV`, `Fibras e Manchas em UV`, `Textos em UV (Sobrepor)`) e no `5- Jornal com UV.psd` do Bundle 4.
  - **Mapeamento do Acervo Completo**: 614 arquivos PSD/PSB totalizando 93,45 GB.

### Validação
- `npm test`: 126 testes unitários passando 100%.
- `tests/handouts-psd-tree.test.js`: 7 testes passando 100%.
- `npm run library:psd-report -- --bundle "Bundle 4, Bundle 2, Bundle 59"` executado com sucesso em 4,5s.
- `git status`: limpo, nenhum arquivo privado em git.

### Pendências reais
- Nenhuma pendência na Etapa 23.

---

## Etapa 22 — Importar elementos, símbolos e fontes

### Feito
- **Módulo de Catálogo e Nomenclatura (`scripts/library/lib/catalog.js`)**:
  - `stripCount(name)`: remoção de contagens e sufixos de pastas e arquivos (`Sangue (14)` → `Sangue`, `06-2024 (2º) [Fontes! (100+)]` → `06-2024`).
  - `isMonthFolder(name)`: identificação de pastas no formato `MM-AAAA` ou `AAAA`.
  - `categoryOf(relativePath)`: extração da categoria mais profunda sem pastas de ano/mês; quando solto na pasta do mês, utiliza o nome do arquivo sem contagem; para símbolos, prefixa com `Símbolos`.
  - `displayName(relativePath)`: nomes amigáveis (`Sangue (7).png` → `Sangue 7`).
  - `slug(text)`: normalização sem acentos, minúsculas, limite de 40 caracteres, com substituição de ordinais `º/ª` por `o/a`.
  - `tagsOf(relativePath)`: extração de até 12 tags únicas, minúsculas, sem dígitos e sem palavras curtas (1–2 letras).
  - `elementId(relativePath)` e `fontId(postscriptName)`: geração estável e determinística de IDs com prefixo privado `ac-el-` e `ac-font-`.
- **Gerenciador de Manifesto (`scripts/library/lib/manifest.js`)**:
  - `readManifest(libraryDir)`: leitura assíncrona com fallback para manifesto vazio.
  - `mergeItems(manifest, items, { replaceKinds })`: atualização por ID com preservação estrita de itens de tipo `template` e `layer`.
  - `writeManifest(libraryDir, manifest)`: ordenação determinística por tipo, categoria e nome, com gravação atômica (`atomicWrite`).
- **CLI e Motor de Importação (`scripts/library/import-elements.js`)**:
  - Script CLI com suporte aos parâmetros `--source`, `--dest`, `--only assets|symbols|fonts`, `--limit N`, `--dry-run` e `--verbose`.
  - Criação automática do descritor de expansão `expansion.json`.
  - Processamento otimizado de imagens com Sharp: exportação em WebP até 2048 px (qualidade 86) e miniaturas de 320 px (qualidade 78), limitando concorrência a 4 tarefas simultâneas para poupar o disco rígido.
  - Deduplicação inteligente de imagens por hash SHA-1 do arquivo original: arquivos repetidos em múltiplos pacotes não geram arquivos duplicados no disco, tendo suas tags somadas ao item existente.
  - Descarte seguro de imagens corrompidas ou minúsculas (< 1 KB) e proteção de memória contra imagens gigantes (> 80 MP).
  - Extração de fontes TrueType/OpenType avulsas e embutidas em arquivos `.zip` (via `fflate`), ignorando fontes pré-existentes na coleção da casa e desduplicando múltiplos pacotes com o mesmo `postscript`.
  - Captura automática de notas de `Atribuição*.txt` (até 2000 caracteres) vinculadas ao pacote de origem.
  - Execução incremental através do índice `state/elements-index.json` (tamanho e data de modificação) e geração de relatórios detalhados em `reports/elements-<timestamp>.json`.
  - Resumo de cinco linhas impresso no terminal ao término da execução.
- **Medição Real no HD (`--limit 200`)**:
  - **Tempo de execução**: 303.7s (~5.0 minutos para 200 arquivos processados).
  - **Itens gerados**: 200 elementos em WebP + 200 miniaturas + `library.json` com 200 itens.
  - **Espaço em disco ocupado**: 102 MB (`data-private/expansoes/arquivos-confidenciais/`).
  - **Estimativa para o acervo total**: para os ~2.500 arquivos de imagens do acervo, estima-se ~60 minutos de processamento e ~1,2 GB de armazenamento final.
  - **Integração com o Servidor**: endpoint `/api/atelie/library` carregou com sucesso a coleção da casa (319 itens) e a expansão privada (200 itens), totalizando 519 itens disponíveis para a mesa.
  - **Isolamento de Privacidade**: `git status` permanece 100% limpo, confirmando que `data-private/` está estritamente excluído do repositório.

### Validação
- `npm test`: 119 testes unitários passando 100%.
- `tests/handouts-import-elements.test.js`: 5 testes passando 100% (catálogo, slug, desduplicação contra a casa, mergeItems sem tocar em templates, e teste E2E com imagens e zip de fontes com reexecução incremental).
- `tests/privacy.test.js`: limites entre dados públicos e privados validados com sucesso.

### Pendências reais
- Nenhuma pendência na Etapa 22.

---

## Etapa 21 — Exportar e imprimir

### Feito
- **Motor de Exportação e Impressão (`src/editor/export.js`)**:
  - `fitsCanvas(width, height)`: validação determinística de limites de canvas 2D no navegador (dimensões <= 16.384 px e área <= 268.435.456 px).
  - `exportScale(handout, target)`:
    - `'screen'`: escala calculada para que o lado maior do documento atinja exatamente 2048 px (`2048 / Math.max(w, h)`).
    - `'print'`: escala de 300 ppp sobre a resolução base de 150 ppp (`300 / 150 = 2`), com redução proporcional automática caso exceda os limites do canvas.
  - `printLayout(handout)`:
    - Conversão exata de pixels (150 DPI) para milímetros: `px / 150 * 25.4`.
    - Orientação automática (`portrait` | `landscape`) conforme a proporção.
    - Reconhecimento de tamanho A4 padrão (210 × 297 mm, tolerância de 1,5 mm): folhas A4 não recebem marcas de corte (`cropMarks: false`); documentos em outros formatos (recorte, polaroid, telegrama) recebem `cropMarks: true`.
  - `generatePrintHtml(handout, dataUrl)`: geração de página HTML autocontida com CSS `@page { size: A4 ${orientation}; margin: 0; }`, centralização e linhas de corte pontilhadas finas (`1px dashed #999`) para formatos menores.
  - Funções assíncronas `downloadHandoutPng` e `printHandout` para orquestração da renderização e acionamento nativo de download e janela de impressão.
- **Gaveta de Exportação (`src/editor/export-drawer.js`, `src/ui/export.css`)**:
  - Resumo do documento aberto com miniatura, resolução em pixels e dimensões em milímetros.
  - Caixa de seleção condicional para **Luz Ultravioleta (UV)**, exibida apenas em documentos com camadas secretas (`hasUvLayers`).
  - Card **PNG · Tela**: atalho para baixar imagem de 2048 px para Discord, Foundry e celular.
  - Card **PNG · Impressão**: atalho para baixar imagem em 300 ppp reais (escala 2×).
  - Card **Imprimir folha**: abertura da caixa de diálogo de impressão em tamanho real A4.
- **Integração na Casca e no Editor**:
  - Botão **Exportar** no trilho principal (`data-action="export"`, ícone `download`, atalho `E`).
  - Atalho global de teclado **E** no editor para abrir/fechar a gaveta de exportação.
  - Opção **Exportar… (E)** no menu de contexto de documentos do navegador lateral.
  - Ícone `printer` adicionado ao acervo de ícones vetoriais em `src/ui/icons.js`.
- **Testes e Validação**:
  - `tests/export.test.js`: testes unitários de cálculo de escala (`exportScale` para tela e impressão), layout físico em milímetros (recorte 1200 × 700 para 203,2 × 118,5 mm com marcas de corte), limites de canvas (`fitsCanvas(20000, 100) = false`) e HTML de impressão.
  - `tests/e2e/editor.test.js`: teste E2E ampliado validando a abertura da gaveta Exportar e download do PNG de tela com validação binária de IHDR (lado maior = 2048 px).
  - `tests/e2e/export.test.js`: suíte E2E cobrindo atalho E, download em 300 ppp (2480 × 3508 px), opção de luz UV gerando arquivo com tag `-uv.png`, menu de contexto e acionamento de impressão com HTML 1:1.

### Validação
- `npm test`: 114 testes unitários passando 100%.
- `npm run test:e2e`: 15 suítes E2E passando 100%.
- `npm run build`: bundle de produção gerado com sucesso.

### Pendências reais
- Nenhuma pendência na Etapa 21 (frente e verso lado a lado documentado como pendência para etapas posteriores).

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
