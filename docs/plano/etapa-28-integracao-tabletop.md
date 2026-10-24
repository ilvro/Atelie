# Etapa 28 — Integração no Tabletop

**Esta etapa acontece no Tabletop** (`/home/ilvro/Documents/Projects/Tabletop`), não no Ateliê. Siga o `AGENTS.md` do **Tabletop** (inclusive manter o `progress.md` dele).

Leia antes: `../Tabletop/AGENTS.md`, `00-LEIA-PRIMEIRO.md` (seção "Onde os apps rodam"), **`CONTRATO-TABLETOP.md` (inteiro)**, e no Tabletop: `docs/GITHUB_PAGES.md`, `docs/DOCUMENTOS_INTERATIVOS.md`, `src/data/paths.js` (`applicationBaseURL`, `storageScope`), `src/data/api.js` (`browserMode`, `importAsset`), `src/data/browser-repository.js` (`importAsset` no modo navegador), `src/domain/inspectables.js`, `src/render/page-textures.js` (`drawPageSide`, `createPageRuntime`), `src/ui/inspectable-panel.js`, `src/ui/inspection-overlay.js`, `src/ui/ui-theme.js` (como os Ajustes são montados) e, em `src/app/application.js`, só: onde o painel do inspecionável grava (`inspectableFieldPatch`), a montagem dos Ajustes (procure `settings-dialog`) e as mensagens `inspect` do projetor (procure `type === 'inspect'`).

## Objetivo

Um documento do Ateliê vira a página de um objeto inspecionável: aparece na mesa, na inspeção e no projetor; pode ser editado no Ateliê e atualizado na cena; e, se tiver camadas UV, o mestre liga a luz UV na inspeção. Funciona com os dois apps no **GitHub Pages da mesma conta** (o uso principal), em domínios diferentes e com os servidores locais. O Tabletop só lida com **imagens assadas**: nunca desenha camadas.

## 1. Endereço do Ateliê e escolha do caminho (`src/data/atelie.js`)

```js
export const ATELIE_URL_KEY = 'tabletop-atelie-url';
/** The sibling repository on GitHub Pages, or the local development server. */
export function defaultAtelieUrl(base = applicationBaseURL(), browser = browserMode)
// browser → new URL('../Atelie/', base).href ; servidor → 'http://127.0.0.1:3011/'
export function atelieUrl()                         // localStorage (try/catch) ou o padrão; sempre terminando em '/'
export function setAtelieUrl(url)                   // valida com new URL(); só https:, ou http: para 127.0.0.1/localhost
/** Contract, section 6: which way to talk. Pure. */
export function chooseRoute({ atelieOrigin, ownOrigin, healthOk })   // → { list: 'exchange' | 'http' | 'window', open: 'window' }
export function createAtelieLink({ url = atelieUrl, indexedDB, fetch, open = window.open.bind(window) } = {})
// → {
//   route,                          // o resultado de chooseRoute, recalculado ao mudar o endereço
//   available(): Promise<boolean>,  // exchange: o banco existe (ou o Ateliê responde por HTTP); window: sempre true
//   list(): Promise<Summary[]>,     // exchange: lê 'handouts' de mesa-handouts-v1 (só os de source igual ao endereço); http: GET /api/atelie/handouts (cache de 10 s); window: []
//   delivery(id): Promise<Delivery | null>,   // exchange: resumo + assados do banco; http: GET …/bake; window: null
//   pick(): Promise<Delivery | null>,          // abre ?pick=1&from=&nonce= e espera 'delivered' (resolve null se a janela fechar sem enviar)
//   edit(id), create(preset),                  // abrem ?handout= / ?new= com from e nonce
//   onSaved(listener)                          // exchange: BroadcastChannel('mesa:handout'); window e http: 'delivered' das janelas abertas; listener({ id, revision, delivery? })
// }
```

- Nos Ajustes, seção **Ateliê de documentos**: campo "Endereço" (com o padrão como *placeholder*), o caminho em uso em palavras ("No mesmo site · pelo navegador", "Por janela", "Pelo servidor local") e um indicador de disponível.
- Só aceite mensagens (`message` de `window`) com `event.origin` igual à origem do endereço do Ateliê, `data.app === 'atelie'`, `data.contract === 1` e um `nonce` emitido por este Tabletop.

## 2. Formato (a única mudança de domínio)

Em `src/domain/inspectables.js`, um lado de página ganha dois campos opcionais, como na seção 1 do contrato:

```js
side = { imageRef, text, design: null | { app: 'atelie', id, revision, source }, uvImageRef: null | { id, revision } }
```

- `validateInspectable`: aceita os dois (ausentes = `null`); `design.app === 'atelie'`, `id` uuid, `revision` inteiro ≥ 0, `source` URL `https:`/`http:`.
- `pageImages` inclui `uvImageRef`; `sideKey` inclui `design`.
- Papel novo em `PAPERS`: `['design', 'Documento do ateliê']`: `drawPageSide` desenha só a imagem, cobrindo a página (`cover`), sem grão, manchas, dobras nem texto.
- `publicInspectable`: pista secreta não revelada continua em branco; `design` e `uvImageRef` nunca saem para o projetor antes de revelar.

Não mude `documents.js`, `validation.js` nem `commands.js`: tudo passa pelo `entity.update` que o painel já usa.

## 3. Trazer um documento

`useDelivery(delivery)`: `importAsset(new File([delivery.bakes.normal], 'Documento · <nome>.png', { type: 'image/png' }))` (e o UV, se houver) → `{ imageRef, uvImageRef, design: { app: 'atelie', id, revision, source }, text: null }`. Funciona nos dois modos do Tabletop (no modo navegador, `importAsset` grava no IndexedDB dele).

No painel do inspecionável, em cada lado de cada página:

- **Do ateliê…**:
  - caminho `exchange` ou `http`: um popover com prévia, nome e data de `list()`; escolher → `delivery(id)` → `useDelivery`;
  - caminho `window`: chama `pick()` (a janela do Ateliê abre com a lista dele) e usa o que vier;
  - se for a página 1, frente, o papel muda para `design`.
- Com `design`: a prévia, o nome e **Editar no Ateliê** (`edit(id)`), **Desvincular**.
- **Atualizar a partir do Ateliê**: aparece quando `list()` mostra revisão maior que a do lado (caminhos `exchange` e `http`); no caminho `window`, a atualização chega por `onSaved` (abaixo).
- **Novo no Ateliê** (no topo da seção): `create('a4')`; o primeiro documento que chegar por `onSaved` dessa janela vai para o lado que pediu.

## 4. Atualizações

`onSaved` (qualquer caminho): se algum lado da cena aberta tem `design.id === id` com revisão menor, um aviso com **Atualizar na cena (N objetos)**: obtém a entrega (`delivery` que veio na mensagem, ou `delivery(id)`), importa uma vez e grava em todos (um `entity.update` por objeto; se o app tiver como agrupar passos de desfazer, agrupe; senão, anote como pendência).

## 5. Pôr na mesa sem selecionar nada

Ação da paleta **Pôr documento do Ateliê na mesa**: o mesmo "Do ateliê…", e coloca uma **Folha · A4** (`builtin-document-sheet`; **Recorte · de jornal** para página larga) no ponto da mesa no centro da tela (o mesmo caminho que `beginAssetPlacement` usa), já inspecionável com o documento.

## 6. Luz UV na inspeção

- Se o lado à frente tem `uvImageRef`, a barra da inspeção mostra **Luz UV** e a tecla **U** funciona.
- Ligada: a página usa a imagem `uvImageRef` (peça ao `createPageRuntime` o lado com `imageRef = uvImageRef`) e uma vinheta violeta (`radial-gradient`, opacidade .35) aparece sobre a cena desfocada.
- `uv: boolean` entra no estado da inspeção enviado ao projetor (`inspect`); o projetor faz o mesmo. Pista não revelada não mostra UV no projetor.
- Trocar de página ou lado desliga a luz UV.

## 7. Tutorial

Uma lição em `src/tutorial/lessons.js`, **Uma carta do Ateliê** (`kind: 'lesson'`, pasta `light`, `task: 'clues'`, `heavy: true`, `needs: { example: 'casa-de-bairro' }`, `requires: 'atelie'`), seguindo `docs/PLANO_TUTORIAIS.md` (resultado desenhado antes, um passo por ação, condição que confere tudo):

1. Ler: o que é o Ateliê.
2. Ajustes → ver o caminho em uso (`atelieAvailable`).
3. Assets → **Envelope · com carta** → pôr na mesa de investigação (ponto marcado).
4. Marcar **Pista inspecionável**.
5. **Do ateliê…** → escolher "Carta envelhecida" (`designUsed`).
6. Inspecionar com **E** (`inspecting`); 7. Ler e fechar.

Condições novas: `atelieAvailable` (estado `atelie: { available, route }` em `tutorialState`) e `designUsed` (algum inspecionável com `design`). O E2E de tutoriais, para lições com `requires: 'atelie'`, preenche antes o banco `mesa-handouts-v1` na origem do teste com um documento "Carta envelhecida" e um PNG fixo (caminho `exchange`), sem precisar do Ateliê.

## Testes

- `tests/atelie-link.test.js` (Node): `defaultAtelieUrl` (Pages → irmão `../Atelie/`; servidor → `127.0.0.1:3011`); `chooseRoute` nas três situações do contrato; `setAtelieUrl` recusa `javascript:` e `http://exemplo.com`; o filtro de mensagens (origem, `app`, `contract`, `nonce`).
- `tests/inspectables.test.js` (acrescente): `design` (com `source`) e `uvImageRef` válidos e inválidos; `pageImages`; `sideKey`; `publicInspectable` de pista secreta.
- `tests/e2e/atelie-exchange.test.js` (**caminho A**): o teste grava no `mesa-handouts-v1` da origem do Tabletop um documento (resumo, prévia, PNG normal e UV); **Do ateliê…** lista e usa; o lado ganha `design` e `imageRef`; a leitura mostra a imagem; o teste grava revisão 2 e publica `handout-saved` num `BroadcastChannel('mesa:handout')` → aviso "Atualizar na cena (1 objeto)" → atualizar troca o `imageRef`; U na inspeção troca para o UV; com o projetor aberto e a pista revelada, o projetor recebe `uv: true`.
- `tests/e2e/atelie-window.test.js` (**caminho B**): uma página "falsa do Ateliê" em outra porta que, aberta com `?pick=1&from&nonce`, responde `delivered` com PNGs; **Do ateliê…** abre a janela e usa o que veio; mensagem com `nonce` errado ou de outra origem é ignorada.
- `tests/e2e/atelie-http.test.js` (**caminho C**): um servidor falso com as rotas da seção 5 do contrato; listar, usar, atualizar por revisão.

## Pronto quando

- [ ] Testes passam; `npm test` do Tabletop passa; `tests/e2e/inspection.test.js`, `tests/e2e/interact.test.js` e a lição "Pistas e documentos" continuam passando.
- [ ] **No GitHub Pages de verdade**, com os dois publicados na mesma conta: fazer uma carta no Ateliê, pôr na mesa pelo Tabletop, editar no Ateliê, arquivar, ver o aviso no Tabletop e atualizar na cena.
- [ ] `docs/DOCUMENTOS_INTERATIVOS.md` e `docs/GITHUB_PAGES.md` do Tabletop ganharam a seção "Documentos do Ateliê"; `progress.md`, `PROGRESSO.md` e `docs/PROGRESSO.md` do Tabletop atualizados.

## Não faça

- Não faça o Tabletop desenhar camadas nem ler o formato interno do Ateliê (só o banco de troca, que é do contrato). Não escreva no banco de troca. Não copie código do Ateliê.
- Não mude o contrato: se algo nele estiver errado ou impossível, pare e avise.
