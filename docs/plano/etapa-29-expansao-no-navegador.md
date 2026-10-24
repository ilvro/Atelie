# Etapa 29 — Expansão no próprio navegador (opcional)

Leia antes: `00-LEIA-PRIMEIRO.md` (seção "A coleção da casa e as expansões"), `etapa-06-armazenamento.md` (formato da biblioteca, `sources`, modo navegador), `etapa-22-importar-elementos.md` (como uma expansão fica no disco), `src/data/api.js`, `src/editor/library-defaults.js`.

## Objetivo

Permitir que **a própria pessoa** use uma expansão (como o *Arquivos Confidenciais*) no site publicado, **sem publicá-la**: ela escolhe, no computador dela, a pasta da expansão gerada pelos importadores (etapas 22 a 25), e o Ateliê copia os arquivos para o IndexedDB **daquele navegador**. Nada sai da máquina; o site continua sem expansão para qualquer outra pessoa.

Esta etapa é opcional: o Ateliê é completo sem ela.

## Instalar

Ajustes → **Expansões** → **Instalar expansão deste computador…**:

- Escolha da pasta: `showDirectoryPicker()` quando existir (Chrome, Edge); senão, `<input type="file" webkitdirectory>` (funciona em todos os navegadores principais).
- Confira `expansion.json` e `library.json` antes de copiar; mostre nome, descrição, licença, número de itens e tamanho total, e o aviso: "Os arquivos ficam só neste navegador. Não compartilhe nem publique esta expansão." Botão **Instalar**.
- Copie para o IndexedDB `atelie-expansions-v1:<caminho base>`: store `expansions` (o `expansion.json`), `items` (os itens do manifesto com `source` = id da expansão) e `files` (chave `[expansionId, caminho]`, valor `Blob`). Mostre progresso (os arquivos podem somar centenas de MB) e permita cancelar.
- Antes de instalar, peça `navigator.storage.persist()` e confira `navigator.storage.estimate()`: se o espaço livre for menor que 1,5 × o tamanho, avise e não instale.
- Uma expansão já instalada pode ser **atualizada** (substitui) ou **removida** (apaga tudo dela).

## Usar

- `api.library.list()` no modo navegador passa a juntar a coleção da casa com as expansões instaladas (mesmas regras de `sources` e ids da etapa 6).
- `fileURL(item)` de item de expansão: `URL.createObjectURL(blob)` sob demanda, com cache e `revokeObjectURL` quando o item sai da tela ou após 2 minutos sem uso.
- Modelos de expansão abrem igual aos da casa. Documentos que usam itens de uma expansão que **não está instalada** abrem com o xadrez de "imagem que falta" e um aviso: "Este documento usa a expansão <nome>, que não está instalada neste navegador."

## Testes

- `tests/expansion-install.test.js` (Node, com um IndexedDB falso ou testando só as funções puras): validação de `expansion.json`/`library.json`; cálculo do tamanho; decisão de espaço; montagem dos registros.
- `tests/e2e/expansion-browser.test.js`: com o build do Pages, instalar uma expansão de teste pequena (via `setInputFiles` num `input webkitdirectory`), ver os itens com o selo de origem na biblioteca, usar um elemento num documento, recarregar e continuar vendo; remover a expansão e ver o aviso de "expansão não instalada" no documento.

## Pronto quando

- [ ] Testes passam; `npm test` e os E2E passam.
- [ ] Com a expansão real gerada pelas etapas 22 a 25, instalar no Chrome no site publicado e anotar no `progress.md` o tempo e o espaço usado.

## Não faça

- Não envie nada da expansão para servidor nenhum, nem para o banco de troca do Tabletop (o Tabletop só recebe os PNGs assados dos documentos, como sempre).
