# Etapa 10 — Documentos: navegador, pastas, rascunho e versões

Leia antes: `00-LEIA-PRIMEIRO.md`, `PLANO-INTERFACE.md`, `src/ui/shell.js`, `src/ui/palette.js`, `src/ui/context-menu.js`, `src/editor/editor.js`, `src/editor/state.js`, `src/data/api.js`. Da Ficha, só leitura, para comportamento: `../Ficha teste - Ordem II/src/workspace/folders.js` e `workspace-sidebar.js` (`renderWorkspaceNavigator`, pastas, fixados, recentes, busca).

## Objetivo

Organizar dezenas de documentos de várias campanhas sem se perder, e nunca perder trabalho: navegador com pastas, fixados, favoritos e recentes; rascunho automático com recuperação; versões anteriores; lixeira; Ctrl+K encontrando documentos.

## 1. Pastas (`src/domain/folders.js` + servidor)

- Pastas aninhadas: `{ id, name, parentId: null | id, color: null | '#rrggbb', order }`. Guardadas em `<dataDir>/folders.json` (modo servidor) ou na store `folders` (navegador). Rotas: `GET /api/atelie/folders`, `PUT /api/atelie/folders` (a lista inteira, com `expectedRevision` do arquivo).
- Funções puras: `createFolder`, `renameFolder`, `moveFolder` (não deixa uma pasta dentro dela mesma ou de uma filha), `removeFolder` (os documentos vão para a pasta-mãe), `folderPath(folders, id)` → nomes até a raiz.
- O documento guarda a pasta em `handout.folder` (etapa 6).

## 2. Gaveta Documentos (`src/editor/navigator.js`)

- Topo: busca (sem acento, por nome, categoria, tags e nome da pasta) e os filtros em chips: **Todos · Favoritos · Recentes · Lixeira**.
- Seções: **Fixados** (no máximo 8, arrastáveis para reordenar), **Recentes** (os 10 últimos abertos), **Pastas** (árvore recolhível, com contagem; ícone colorido pela cor da pasta), **Sem pasta**.
- Cada documento é uma linha com miniatura em papel (`.at-card` pequeno, inclinação de `tiltOf`), nome, pasta e data relativa ("há 3 dias"); o aberto tem um clipe.
- **Arrastar** um documento para uma pasta move (com destaque da pasta de destino); arrastar uma pasta para outra aninha.
- **Menu de contexto** do documento: Abrir · Abrir em nova aba · Duplicar · Renomear · Mover para… · Fixar/Desafixar · Favoritar · Exportar PNG (quando existir, etapa 21) · Excluir. Da pasta: Nova subpasta · Renomear · Cor · Excluir.
- **Lixeira** (filtro): documentos excluídos com "excluído há N dias", **Restaurar** e **Apagar de vez** (confirmação).
- Teclado: ↑ ↓ andam, Enter abre, F2 renomeia, Delete exclui.

## 3. Rascunho automático (`src/editor/draft.js`)

- A cada edição (com espera de 800 ms sem novas edições), o documento aberto é gravado em IndexedDB (`atelie-drafts`, chave = id do documento, valor `{ handout, baseRevision, savedAt }`), **também no modo servidor**. Isso é o rascunho, não o arquivo.
- Barra "**Não arquivado** · há 2 min · Arquivar · Descartar" (um `.at-stamp` RASCUNHO e dois botões) aparece abaixo da barra do documento quando há rascunho diferente do arquivado. Substitui o `beforeunload` da etapa 7 (que passa a só agir se o rascunho não pôde ser gravado).
- Ao abrir um documento com rascunho mais novo que o arquivado: aviso "Há alterações não arquivadas de <data>. **Recuperar** · Descartar". Se a revisão do servidor mudou desde o rascunho (outra aba arquivou), avise "o documento mudou desde o seu rascunho" e ofereça abrir o rascunho como **cópia**.
- Arquivar apaga o rascunho.

## 4. Versões (aba "Versões" dentro da aba Histórico)

- Lista de `api.handouts.versions(id)` com data e revisão; clicar mostra a prévia daquela versão (renderizada na hora num canvas pequeno); **Restaurar esta versão** cria uma nova revisão com o conteúdo antigo (não apaga as mais novas).

## 5. Ctrl+K com documentos

Provedor de documentos e pastas: título, pasta como subtítulo, miniatura; os recentes primeiro quando a busca está vazia. Ações: "Ir para pasta…", "Nova pasta", "Abrir lixeira".

## 6. Várias abas

Se o mesmo documento estiver aberto em duas abas, a segunda mostra um aviso "Aberto em outra aba" (use `BroadcastChannel('atelie')`, mesma origem) e fica só leitura até a pessoa escolher **Editar aqui** (a outra aba recebe o aviso e passa a só leitura).

## Testes

- `tests/folders.test.js`: criar, renomear, mover (inclusive proibido), remover (documentos sobem), `folderPath`.
- `tests/folders-server.test.js`: rotas de pastas, com revisão.
- `tests/draft.test.js` (com um IndexedDB falso, ou testando só a lógica de decisão `draftDecision({ draft, server })` → `'none' | 'offer' | 'conflict'`).
- `tests/e2e/navigator.test.js`: criar duas pastas, arrastar documento para uma, buscar sem acento, fixar e reordenar, favoritar e filtrar, excluir e restaurar da lixeira; editar, recarregar a página sem arquivar → aviso de recuperação → Recuperar devolve a edição; restaurar uma versão anterior; Ctrl+K encontra o documento pelo nome da pasta.
- `tests/e2e/tabs.test.js`: o mesmo documento em duas abas → a segunda fica só leitura.

## Pronto quando

- [ ] Testes passam; `npm test` e os E2E passam.
- [ ] Captura `docs/referencias/atelie-documentos.png` com a gaveta aberta, pastas, fixados e um documento com rascunho.
