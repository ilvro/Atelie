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
| 7 — Editor | pendente | | Palco, camadas, desfazer/refazer, propriedades |
| 8 — Manipulação | pendente | | Mover, redimensionar, girar camadas |
| 9 — Ferramentas do editor | pendente | | Guias, réguas, conta-gotas, colar imagens |
| 10 — Documentos e rascunho | pendente | | Gestão de documentos, rascunho automático |
| 11 — Efeitos procedurais | pendente | | Desgaste, manchas, dobras, queimado, sangue |
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
