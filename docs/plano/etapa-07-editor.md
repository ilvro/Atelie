# Etapa 7 — O editor

Leia antes: `00-LEIA-PRIMEIRO.md`, `PLANO-INTERFACE.md`, `src/ui/shell.js`, `src/ui/primitives.js`, `src/ui/notify.js`, `src/main.js`, `src/ui/styles.css`, `src/domain/handouts.js`, `src/render/handout-render.js`, `src/data/api.js`, `src/data/handout-images.js`, `src/data/handout-fonts.js`, `src/ui/controls.js` (`numberField`, `colorField`, `checkField`, `choiceField`, `bindControls`), `src/ui/icons.js`.

## Objetivo

A página do app vira o editor: abrir um documento, ver a página, escolher e mudar camadas pelo painel, desfazer, salvar e abrir de novo. **Sem** arrastar no palco (etapa 8) e **sem** biblioteca (etapa 15): imagens vêm só das imagens enviadas (etapa 6).

## Como fica

Siga **`PLANO-INTERFACE.md`** (seções 3 a 5). O editor mora na casca da etapa 2:

- **Barra do documento** no topo da mesa: nome do documento num campo na fonte `--at-font-display` (sem maiúsculas forçadas), o tamanho da página em `.at-stamp` pequeno, desfazer/refazer, Luz UV (desabilitado até a etapa 19) e **Arquivar** (`.at-btn.is-primary`).
- **Mesa**: a página com sombra de papel, centralizada; barra de zoom flutuante no canto inferior direito (− 60 % + e "caber").
- **Inspetor**: aba **Propriedades** (da camada selecionada) e aba **Camadas** (a lista, de cima para baixo, como no Photoshop, com miniatura de 40 px de cada camada renderizada à parte e guardada até a camada mudar).
- **Gaveta Documentos**: nesta etapa, uma lista simples dos documentos salvos (prévia em `.at-card`, nome, data) e o botão **Novo** (com os `PAGE_PRESETS`); a etapa 10 a transforma no navegador completo.
- **Trilho**: os recentes (`shell.rail.setRecent`) passam a mostrar os últimos 5 documentos abertos.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `src/editor/state.js` | Estado e histórico, **puro** (testável no Node) |
| `src/editor/editor.js` | `createEditor(shell, deps)`: monta o editor na casca, liga tudo; `src/main.js` o chama |
| `src/editor/stage.js` | Palco: render, zoom, centralizar |
| `src/editor/layers-panel.js` | HTML da lista de camadas e do menu "+" |
| `src/editor/properties-panel.js` | HTML das propriedades da camada selecionada |
| `src/ui/editor.css` | Estilos do editor (só tokens `--at-*` e `--eco-*`); importado em `src/main.js` |
| `tests/editor-state.test.js`, `tests/e2e/editor.test.js` | Testes |

## `src/editor/state.js`

```js
/**
 * The open handout, the selection and the undo history of the ateliê. Every edit replaces the handout (functions of
 * src/domain/handouts.js never mutate). Edits with the same `coalesce` key within 600 ms make one undo step, so a
 * slider dragged or a word typed is undone at once.
 */
export function createEditorState(handout, { now = () => Date.now(), limit = 100 } = {})
// → {
//   get handout(), get selection() /* layer id or null */, get dirty(), get canUndo(), get canRedo(),
//   edit(nextHandout, { label, coalesce = null }),  // pushes history (or merges with the last step when coalesce matches and < 600 ms)
//   undo(), redo(), select(layerId | null),
//   markSaved(savedHandout),                         // dirty = false; keeps history
//   subscribe(listener) → unsubscribe                // listener(change) with change = { type: 'edit'|'undo'|'redo'|'select'|'saved' }
// }
```

- Depois de `undo`/`redo`, se a camada selecionada não existe mais, a seleção vira `null`.
- `edit` com um documento idêntico (mesma referência) não faz nada.
- O histórico guarda no máximo `limit` passos (descarta os mais antigos).

## Campos de propriedade

Use os controles de `src/ui/controls.js`. O `data-field` de cada campo é `h:` + caminho na camada:

| Para | `data-field` | Controle |
|---|---|---|
| todas | `h:name`, `h:x`, `h:y`, `h:width`, `h:height`, `h:rotation` | texto / `numberField` |
| todas | `h:opacity` (mostrar 0–100 %, gravar 0–1), `h:blend` (select com `BLEND_MODES`), `h:clip` (`checkField` "Recortar na camada de baixo"), `h:light` (`choiceField`: Sempre / Só luz normal / Só luz UV) | |
| text | `h:text.content` (`<textarea>` com 8 linhas), `h:text.font.family` (select: fontes do sistema `Georgia`, `Times New Roman`, `Courier New`, `Arial`, `Special Elite` se existir, mais as da biblioteca depois), `h:text.size`, `h:text.color`, `h:text.align` (choice: ⟸ ≡ ⟹ ☰), `h:text.valign`, `h:text.lineHeight`, `h:text.letterSpacing`, `h:text.box` (choice Caixa / Ponto), `h:text.fit` (check "Encolher para caber"), `h:text.ink.style` (choice Limpa / Máquina / À mão / Carimbo), `h:text.ink.wear` (0–100 %), `h:text.ink.seed`, `h:text.font.italic`, `h:text.font.weight` (choice 400 / 700) | |
| image | `h:image.src` (a imagem atual em miniatura e o botão **Escolher imagem…**, que abre uma lista das imagens enviadas — `api.uploads.list()` — com **Enviar imagem…** no topo, um `<input type="file" accept="image/png,image/jpeg,image/webp">`), `h:image.fit`, `h:image.flipX`, `h:image.flipY`, `h:image.filter.grayscale` … `h:image.filter.blur`, `h:image.filter.invert`, `h:image.tint.color` + `h:image.tint.amount` | |
| shape | `h:shape.type`, `h:shape.fill` (com check "Sem preenchimento"), `h:shape.stroke`, `h:shape.strokeWidth`, `h:shape.radius` | |
| adjust | `h:adjust.grayscale` … `h:adjust.invert` | |

Um único manipulador de `change` na página lê `data-field`, converte o valor (número, booleano, `#rrggbb`), monta o patch com o caminho (`text.ink.wear` → `{ text: { ink: { …ink, wear } } }`) e chama `state.edit(updateLayer(...), { label, coalesce: layerId + field })`. Campos de texto (`input` em `h:text.content` e `h:name`) também editam no `input`, com `coalesce`, para o palco acompanhar a digitação.

## Palco (`src/editor/stage.js`)

```js
export function createStage(container, { images, fonts })
// → { show(handout, { light }), zoom(factor | 'fit'), get zoom(), destroy() }
```

- Um `<canvas>` dentro de um contêiner com rolagem; fundo xadrez (CSS `conic-gradient`) e sombra na página.
- Renderiza com `renderHandout(canvas, handout, { scale: zoom × devicePixelRatio, loadImage: images.load, loadFont: fonts.load })` e define `canvas.style.width = page.width × zoom` px.
- Agrupe pedidos: no máximo um render por quadro (`requestAnimationFrame`); se chegar um novo pedido durante um render assíncrono, renderize de novo no fim só com o último.
- Zoom: botões − / + (×0,8 / ×1,25), `fit` (cabe no palco), limites 10 %–400 %; Ctrl + roda do mouse sobre o palco também.
- Camada selecionada: um retângulo tracejado em `--at-uv` desenhado num `<div>` sobreposto (posição e tamanho × zoom, `transform: rotate(...)`), não no canvas. (Os puxadores vêm na etapa 8.)
- Clique no palco seleciona a camada mais alta cuja caixa (girada) contém o ponto; clique fora de tudo limpa a seleção.

## Menu "+" de camadas

Texto (cria `textLayer` com "Escreva aqui", caixa 600 × 200 no centro), Imagem (caixa 600 × 400, `src` vazio), Retângulo, Elipse, Linha, Ajuste de cor (cobrindo a página). A camada nova entra **acima da selecionada** (ou no topo) e fica selecionada.

Botões na linha de cada camada: olho (`visible`), cadeado (`locked`; camada travada não é editada pelo painel nem selecionada pelo clique no palco), nome (clique duplo renomeia), e no fim ↑ ↓ ⧉ (duplicar) 🗑 (excluir). Arrastar uma linha sobre outra também reordena (HTML5 drag and drop).

## Abrir, novo, salvar

- **Arquivar** (Ctrl+S): `create` na primeira vez e `save` depois, usando `api.handouts`; em seguida gera a prévia (render com largura 480 px → `canvas.toDataURL('image/webp', .82)`) e `savePreview`. Sucesso: o carimbo **ARQUIVADO** desce sobre o canto da página (seção 4 do plano de interface). Erro: `notify(…, { tone: 'error' })` da casca.
- **Abrir**: pela gaveta Documentos; clicar num documento abre com a animação de troca (seção 4 do plano). Se houver alterações não arquivadas, um diálogo próprio (não `confirm`) com **Arquivar e abrir**, **Descartar** e **Cancelar**.
- **Novo**: escolher um `PAGE_PRESETS` numa lista simples; cria com `createHandout`.
- Sair da página com alterações não arquivadas: `beforeunload` pede confirmação (a etapa 10 troca isso pelo rascunho automático).
- O endereço acompanha o documento: `history.replaceState` com `?handout=<id>` depois de salvar ou abrir; abrir a página com `?handout=<id>` carrega esse documento; `?new=a4` (ou outro preset) começa um novo. Sem parâmetro: o último documento aberto (`localStorage`, `atelie-last`), ou um A4 novo.

## Teclado

Ctrl+Z / Ctrl+Shift+Z (ou Ctrl+Y) desfazem e refazem, Ctrl+S arquiva, Delete exclui a camada selecionada, Esc tira a seleção. Nada disso dispara com o foco num campo de texto (`input`, `textarea`, `select`, `[contenteditable]`), exceto Ctrl+S.

## Testes

`tests/editor-state.test.js`:

1. `edit` torna `dirty` e `canUndo`; `undo` volta o documento anterior (mesma referência) e `redo` reaplica.
2. Duas edições com o mesmo `coalesce` em 300 ms viram um passo; com 700 ms, dois.
3. `undo` depois de adicionar e selecionar uma camada: seleção vira `null`.
4. `limit: 3` com 5 edições: só 3 desfazeres possíveis.
5. `markSaved` zera `dirty`; nova edição liga de novo.

`tests/e2e/editor.test.js`:

1. A página abre com uma folha A4 e a camada "Papel"; `?new=polaroid` abre 880 × 1070.
2. "+" → Texto; em Propriedades, escrever "Querida Lia" e tamanho 80 → o pixel no centro da caixa de texto escurece (leia com `canvas.getContext('2d').getImageData` pelo `page.evaluate`).
3. Ctrl+Z volta o tamanho; Ctrl+Z de novo volta o texto inteiro (a digitação foi um passo).
4. Mesclagem "Multiplicação" e opacidade 50 % gravam no documento (o estado exposto em `window.__atelie.editor` só com `?diagnostics`).
5. Arquivar → o carimbo aparece; recarregar com `?handout=<id>` recupera as camadas; a gaveta Documentos mostra o documento com prévia; o trilho mostra-o nos recentes.
8. Enviar uma imagem PNG gerada no teste (`setInputFiles`) e escolhê-la numa camada de imagem → o canvas mostra a cor dela.
6. Ocultar a camada (olho) → o texto some do canvas; travar → o painel fica desabilitado.
7. Reordenar com ↑ muda a ordem no documento.

## Pronto quando

- [ ] Testes passam; `npm test` e `npm run test:e2e` passam.
- [ ] Nenhum texto menor que 11 px; tudo em português; `prefers-reduced-motion` respeitado.

## Não faça

- Nada de puxadores ou arrastar no palco (etapa 8), biblioteca (etapa 15), assado (etapa 18).
