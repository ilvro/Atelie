# Etapa 18 — Integração no Tabletop

**Esta etapa acontece no Tabletop** (`/home/ilvro/Documents/Projects/Tabletop`), não no Ateliê. Siga o `AGENTS.md` do **Tabletop** (inclusive manter o `progress.md` dele).

Leia antes: `../Tabletop/AGENTS.md`, `00-LEIA-PRIMEIRO.md`, **`CONTRATO-TABLETOP.md` (inteiro)**, e no Tabletop: `docs/DOCUMENTOS_INTERATIVOS.md`, `src/domain/inspectables.js`, `src/render/page-textures.js` (`drawPageSide`, `createPageRuntime`), `src/ui/inspectable-panel.js`, `src/ui/inspection-overlay.js`, `src/data/api.js` (`importAsset`), `src/ui/ui-theme.js` (`uiThemeMarkup`, como os Ajustes são montados) e, em `src/app/application.js`, só: onde o painel do inspecionável grava (`inspectableFieldPatch`), a montagem dos Ajustes (procure `settings-dialog`) e as mensagens `inspect` do projetor (procure `type === 'inspect'`).

## Objetivo

Um documento do Ateliê vira a página de um objeto inspecionável: aparece na mesa, na inspeção e no projetor; pode ser editado no Ateliê e atualizado na cena; e, se tiver camadas UV, o mestre liga a luz UV na inspeção. O Tabletop só lida com **imagens assadas**: nunca desenha camadas.

## 1. Endereço do Ateliê (Ajustes)

- `src/data/atelie.js`:

```js
export const ATELIE_URL_KEY = 'tabletop-atelie-url';
export const DEFAULT_ATELIE_URL = 'http://127.0.0.1:3011';
export function atelieUrl()                       // localStorage (try/catch) ou o padrão; sem barra no fim
export function setAtelieUrl(url)                 // valida com new URL(); só http/https
export function createAtelieClient({ base = atelieUrl, fetch = globalThis.fetch } = {})
// → { health(): Promise<boolean>, list(): Promise<[...]>, bake(id, light): Promise<{ blob, revision }>, openUrl(params), origin }
// list() faz cache por 10 s (contrato, seção 5). bake lê o cabeçalho X-Atelie-Revision. Erros de rede viram null/false, nunca exceções soltas.
```

- Nos Ajustes, uma seção **Ateliê de documentos**: campo "Endereço" e um indicador (● disponível / ○ não encontrado) que chama `health()` ao abrir os Ajustes e ao mudar o campo.
- No GitHub Pages (`browserMode` de `src/data/api.js`), a seção diz "Disponível só com o servidor local" e o resto da integração fica oculto.

## 2. Formato (a única mudança de domínio)

Em `src/domain/inspectables.js`, um lado de página ganha dois campos opcionais, exatamente como na seção 1 do contrato:

```js
side = { imageRef, text, design: null | { app: 'atelie', id, revision }, uvImageRef: null | { id, revision } }
```

- `validateInspectable`: aceita os dois (ausentes = `null`); `design.app === 'atelie'`, `id` uuid, `revision` inteiro ≥ 0.
- `pageImages` inclui `uvImageRef`; `sideKey` inclui `design`.
- Papel novo em `PAPERS`: `['design', 'Documento do ateliê']`: `drawPageSide` desenha só a imagem, cobrindo a página (`cover`), sem grão, manchas, dobras nem texto.
- `publicInspectable`: pista secreta não revelada continua em branco; `design` e `uvImageRef` nunca saem para o projetor antes de revelar.

Não mude `documents.js`, `validation.js` nem `commands.js`: tudo passa pelo `entity.update` que o painel já usa.

## 3. No painel do inspecionável

Em cada lado de cada página (com o Ateliê disponível):

- **Do ateliê…**: lista (popover) com prévia, nome e data de `list()`; escolher: `bake(id, 'normal')` (e `'uv'` se `hasUv`) → `importAsset(new File([blob], 'Documento · <nome>.png', { type: 'image/png' }))` → grava `{ imageRef, uvImageRef, design: { app: 'atelie', id, revision }, text: null }` naquele lado; se for a página 1, frente, muda o papel para `design`.
- Com `design`: a prévia, o nome e os botões **Editar no Ateliê** (abre `openUrl({ handout: id, from: location.origin })` com `window.open(…, 'atelie')`) e **Desvincular**.
- **Atualizar a partir do Ateliê** aparece quando a revisão da lista é maior que a do lado (contrato, seção 5); faz o mesmo que escolher de novo.
- **Novo no Ateliê** (no topo da seção): abre `openUrl({ new: 'a4', from })`.

## 4. Mensagem de "salvo"

`application.js` escuta `message` de `window`: aceita só `event.origin === createAtelieClient().origin`, `data.app === 'atelie'`, `data.contract === 1`, `data.type === 'handout-saved'`. Ao receber:

- se algum lado da cena aberta tem `design.id === data.id` com revisão menor: um aviso com o botão **Atualizar na cena (N objetos)** que assa uma vez e grava em todos (um `entity.update` por objeto; se o app tiver como agrupar passos de desfazer, agrupe; senão, anote como pendência);
- se o painel do inspecionável estiver mostrando um lado esperando um documento novo (abriu "Novo no Ateliê"), ele vira o documento recebido.

## 5. Usar na cena sem selecionar nada

No Ateliê aberto pelo Tabletop não há botão "usar na cena" (o Ateliê não conhece a cena). No Tabletop, a ação da paleta **Pôr documento do Ateliê na mesa** abre a mesma lista do item 3 e coloca uma **Folha · A4** (`builtin-document-sheet`; **Recorte · de jornal** para página larga) no ponto da mesa no centro da tela (use o mesmo caminho que `beginAssetPlacement` usa para colocar um modelo), já inspecionável com o documento.

## 6. Luz UV na inspeção

- Se o lado à frente tem `uvImageRef`, a barra da inspeção mostra **Luz UV** e a tecla **U** funciona.
- Ligada: a página usa a imagem `uvImageRef` (peça ao `createPageRuntime` o lado com `imageRef = uvImageRef`) e uma vinheta roxa (`radial-gradient` com `#7a3cff`, opacidade .35) aparece sobre a cena desfocada.
- `uv: boolean` entra no estado da inspeção enviado ao projetor (`inspect`); o projetor faz o mesmo. Pista não revelada não mostra UV no projetor.
- Trocar de página ou lado desliga a luz UV.

## 7. Tutorial

Uma lição em `src/tutorial/lessons.js`, **Uma carta do Ateliê** (`kind: 'lesson'`, pasta `light`, `task: 'clues'`, `heavy: true`, `needs: { example: 'casa-de-bairro' }`), seguindo as regras de `docs/PLANO_TUTORIAIS.md` (resultado desenhado antes, um passo por ação, condição que confere tudo):

1. Ler: o que é o Ateliê.
2. Ajustes → conferir o endereço (`atelieAvailable`).
3. Assets → **Envelope · com carta** → pôr na mesa de investigação (ponto marcado, como na lição "Pistas e documentos").
4. Marcar **Pista inspecionável**.
5. **Do ateliê…** → escolher o exemplo "Carta envelhecida" (`designUsed`).
6. Inspecionar com **E** (`inspecting`); 7. Ler e fechar.

Condições novas em `src/tutorial/conditions.js`: `atelieAvailable` (estado `atelie: { available }` em `tutorialState`) e `designUsed` (algum inspecionável da cena com `design`). Teste as duas em `tests/tutorials.test.js`.

O E2E de tutoriais roda sem o Ateliê: para esta lição, o teste sobe um **Ateliê falso** (Express com as rotas da seção 2 do contrato servindo uma lista com um documento "Carta envelhecida" e um PNG fixo) e grava o endereço dele em `localStorage` antes de começar. Marque a lição com `requires: 'atelie'` e faça o teste genérico de tutoriais subir o falso para lições com esse campo.

## Testes

- `tests/atelie-client.test.js`: `createAtelieClient` com `fetch` falso: `health` falso em erro de rede; `list` em cache por 10 s; `bake` lê `X-Atelie-Revision`; `setAtelieUrl` recusa `javascript:`.
- `tests/inspectables.test.js` (acrescente): `design` e `uvImageRef` válidos e inválidos; `pageImages`; `sideKey`; `publicInspectable` de pista secreta não leva `design` nem `uvImageRef`.
- `tests/e2e/atelie-integration.test.js`, com o Ateliê falso:
  1. Ajustes mostra "disponível".
  2. Envelope inspecionável → **Do ateliê…** → o lado tem `design` e um `imageRef` que existe em `/api/tabletop/assets`; a leitura mostra a imagem do PNG falso.
  3. O falso passa a responder revisão 2 → aparece **Atualizar a partir do Ateliê** → atualizar troca o `imageRef`.
  4. Mensagem `handout-saved` vinda de uma janela com a origem do falso → aviso "Atualizar na cena (1 objeto)"; a mesma mensagem de outra origem é ignorada.
  5. Documento com `hasUv`: na inspeção, U troca a imagem; com o projetor aberto e a pista revelada, o projetor recebe `uv: true`.

## Pronto quando

- [ ] Testes passam; `npm test` do Tabletop passa; `tests/e2e/inspection.test.js`, `tests/e2e/interact.test.js` e a lição "Pistas e documentos" continuam passando.
- [ ] Com o Ateliê de verdade rodando (`npm run dev` nele): fazer uma carta no Ateliê, pôr na mesa pelo Tabletop, editar no Ateliê, salvar, ver o aviso e atualizar na cena.
- [ ] `docs/DOCUMENTOS_INTERATIVOS.md` do Tabletop ganhou a seção "Documentos do Ateliê"; `progress.md`, `PROGRESSO.md` e `docs/PROGRESSO.md` do Tabletop atualizados (o `AGENTS.md` dele pede).

## Não faça

- Não faça o Tabletop desenhar camadas nem ler o formato interno do Ateliê. Não copie código do Ateliê para o Tabletop.
- Não mude o contrato: se algo nele estiver errado ou impossível, pare e avise.
