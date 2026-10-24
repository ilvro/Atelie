# Etapa 18 — Assar e entregar ao Tabletop

Leia antes: `00-LEIA-PRIMEIRO.md` (seção "Onde os apps rodam"), **`CONTRATO-TABLETOP.md` (inteiro)**, `src/editor/editor.js`, `src/editor/navigator.js`, `src/render/handout-render.js`, `src/data/api.js`, `server/app.js`, `server/routes/handouts.js`, `server/paths.js` (`defaultAllowedOrigins`).

## Objetivo

O Ateliê entrega documentos prontos (imagens assadas) ao Tabletop pelos **três caminhos** do contrato, com a mesma interface para a pessoa:

- **A — navegador compartilhado** (os dois publicados no GitHub Pages da mesma conta): ao arquivar, grava no banco de troca `mesa-handouts-v1` e avisa por `BroadcastChannel('mesa:handout')`;
- **B — janela** (qualquer origem): atende o Tabletop que o abriu com `?pick=1`, `?handout=` ou `?new=`, e devolve o documento por `postMessage`;
- **C — HTTP** (servidores locais): rotas de leitura com CORS.

Nesta etapa o assado UV usa as camadas `light: 'uv'` como já são desenhadas (regra da etapa 4); o visual completo vem na etapa 19.

## 1. Assar (`src/editor/bake.js`)

```js
/** The PNGs of a handout for other programs: normal light always, UV only when a visible layer is 'uv'. Long side 2048. */
export async function bakeHandout(handout, { images, fonts })     // → { normal: Blob, uv: Blob | null, width, height }
export const hasUvLayers = handout => handout.layers.some(layer => layer.visible && layer.light === 'uv')
/** What travels (contract, section 2). */
export function deliveryOf(handout, { preview, bakes, source })   // → Delivery
export const summaryOf = (handout, source) => ({ id, name, category, tags, revision, updatedAt, hasUv, source })
```

Ao **arquivar** (depois de gravar e gerar a prévia), o editor assa uma vez e usa o resultado nos caminhos ativos. Mostre "Arquivando…" e o carimbo ao fim; um erro no assado não perde o documento arquivado ("Arquivado, mas a entrega ao Tabletop falhou: <motivo>").

`source` = o endereço base do Ateliê (`new URL('.', document.baseURI).href`).

## 2. Caminho A — banco de troca (`src/data/exchange.js`)

```js
export const EXCHANGE_DB = 'mesa-handouts-v1';
export function openExchange(indexedDB = globalThis.indexedDB)      // versão 1; cria as stores 'handouts' (keyPath 'id') e 'bakes' (keyPath ['id', 'light'])
export async function publish(db, summary, preview, bakes)          // uma transação: grava o resumo (com preview Blob) e os assados; remove o 'uv' antigo se bakes.uv for null
export async function unpublish(db, id)                             // remove o resumo e os assados
export const channel = () => new BroadcastChannel('mesa:handout')
export const savedMessage = (summary) => ({ app: 'atelie', contract: 1, type: 'handout-saved', id: summary.id, revision: summary.revision, source: summary.source })
```

- Arquivar → `publish` e `channel().postMessage(savedMessage(...))`. Mover para a lixeira → `unpublish` + `handout-removed`. Restaurar → `publish`.
- Ajustes → **Compartilhar com o Tabletop neste navegador** (ligado por padrão; em `atelie-settings`). Ao desligar, `unpublish` de todos os documentos deste Ateliê (os de `source` igual). Ao ligar, publica todos (assando os que ainda não têm assado: mostre progresso).
- Funciona nos **dois** modos (navegador e servidor), sempre que houver IndexedDB.

## 3. Caminho B — janela (`src/editor/handoff.js`)

```js
/** The Tabletop that opened this window: { from, nonce, mode: 'pick' | 'edit' | 'new' } or null. */
export function handoffRequest(location, opener)
export const validFrom = origin => /^https:\/\/[^/]+$/.test(origin) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)
export const deliveredMessage = (nonce, delivery) => ({ app: 'atelie', contract: 1, type: 'delivered', nonce, delivery })
```

- `?pick=1&from=…&nonce=…`: a página abre com a gaveta Documentos aberta e um cabeçalho "**O Tabletop pediu um documento**"; cada documento ganha o botão **Enviar ao Tabletop**. Escolher assa (se o assado da revisão atual não estiver no banco de troca), envia `delivered` para `window.opener` com `targetOrigin = from`, mostra "Enviado" e fecha a janela em 1 s.
- `?handout=<id>&from=…&nonce=…` e `?new=<preset>&from=…&nonce=…`: o editor abre normalmente, com um carimbo "**Ligado ao Tabletop**" na barra do documento; **a cada arquivar**, envia `delivered`.
- Só responde se `validFrom(from)` e `window.opener` existir; sem isso, ignora os parâmetros (a página funciona normalmente).
- Não defina `Cross-Origin-Opener-Policy` em lugar nenhum (nem por cabeçalho no servidor de desenvolvimento): ele cortaria a ligação com o Tabletop.

## 4. Caminho C — HTTP (servidor de desenvolvimento)

Siga a seção 5 do contrato:

- Ao arquivar no modo servidor, o editor envia os assados: `PUT /api/atelie/handouts/:id/bake?light=normal&revision=<n>` (e `uv`, ou `DELETE …?light=uv` quando não houver), corpo `image/png` até 30 MB. O servidor grava `<dataDir>/handouts/<id>.bake-normal.png`, `<id>.bake-uv.png` e `<id>.bake.json` (`{ normal: revisão, uv: revisão | null }`); revisão diferente da atual → `409`.
- `GET /api/atelie/handouts` inclui `hasUv`; `GET …/:id/bake?light=…` devolve o PNG com `X-Atelie-Revision` e `Cache-Control: no-cache`.
- `server/cors.js`: `readOnlyCors(allowedOrigins)` — para origens da lista: `Access-Control-Allow-Origin` = a origem, `Vary: Origin`, `Access-Control-Expose-Headers: X-Atelie-Revision`; `OPTIONS` de origem permitida pedindo `GET` → `204` com `GET, HEAD`; outras origens, nada. Aplique em `health`, lista, prévia e `bake` (GET). `PUT`/`DELETE` nunca têm CORS.

## Testes

Node:

- `tests/handoff.test.js`: `handoffRequest` lê os três modos e devolve `null` sem `opener`, sem `nonce` ou com `from` inválido; `validFrom` aceita `https://conta.github.io` e `http://127.0.0.1:3001`, recusa `http://exemplo.com`, `javascript:`, e origens com caminho; `deliveredMessage` e `savedMessage` têm exatamente os campos do contrato.
- `tests/bake.test.js`: `summaryOf`/`deliveryOf` (campos do contrato), `hasUvLayers`.
- `tests/contract-http.test.js` (servidor real): `health` com e sem origem permitida; `OPTIONS`; `PUT` de assado sem CORS; ciclo `PUT` → `GET bake` com `X-Atelie-Revision`; `409` de revisão velha; `hasUv` na lista.

E2E:

- `tests/e2e/exchange.test.js` (**caminho A**): numa mesma origem de teste, arquivar um documento com camada UV → numa segunda página da mesma origem, `mesa-handouts-v1` tem o resumo e os dois assados da mesma revisão, e um `BroadcastChannel('mesa:handout')` aberto nela recebeu `handout-saved`; mover para a lixeira remove e avisa `handout-removed`; desligar "Compartilhar com o Tabletop" esvazia.
- `tests/e2e/handoff.test.js` (**caminho B**): uma página "falsa do Tabletop" servida em outra porta abre `<ateliê>/?pick=1&from=<origem dela>&nonce=abc`; no Ateliê, **Enviar ao Tabletop** num documento → a página falsa recebe `delivered` com `nonce: 'abc'`, um `Blob` PNG em `delivery.bakes.normal` (confira a assinatura `89 50 4E 47`) e a janela fecha; o modo `?handout=` envia a cada arquivar.
- Rode o caminho A também com o build do modo navegador (`VITE_ATELIE_STORAGE=browser`), servido como estático.

## Pronto quando

- [ ] Testes passam; `npm test` e os E2E passam.
- [ ] No fim do `CONTRATO-TABLETOP.md`, a lista "qual teste cobre qual seção" (2, 3, 4 e 5).

## Não faça

- Nada no Tabletop (etapa 28). Não mude o contrato: se algo nele estiver errado ou impossível, pare e avise.
