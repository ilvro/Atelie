# Etapa 13 — Assar e entregar

Leia antes: `00-LEIA-PRIMEIRO.md`, **`CONTRATO-TABLETOP.md` (inteiro)**, `src/editor/editor.js`, `src/render/handout-render.js`, `src/data/api.js`, `server/app.js`, `server/routes/handouts.js`, `server/paths.js` (`defaultAllowedOrigins`).

## Objetivo

Tudo o que o Tabletop (ou qualquer outro programa) precisa para usar um documento do ateliê, exatamente como está no contrato:

1. ao salvar, o editor **assa** o documento em PNG (e em UV, se tiver camadas UV) e envia ao servidor;
2. o servidor oferece a lista, a prévia e os assados por HTTP com CORS para as origens permitidas;
3. a página abre direto um documento por link (`?handout=`, `?new=`) e, quando foi aberta por outra janela autorizada, avisa que salvou.

Nesta etapa o assado UV usa as camadas `light: 'uv'` como já são desenhadas (regra da etapa 3); o visual completo da luz UV vem na etapa 14.

## Assar (`src/editor/bake.js`)

```js
/** The PNGs of a handout for other programs: normal light always, UV only when a visible layer is 'uv'. Long side 2048. */
export async function bakeHandout(handout, { images, fonts })
// → { normal: Blob, uv: Blob | null }
export const hasUvLayers = handout => handout.layers.some(layer => layer.visible && layer.light === 'uv')
```

Depois de `save`/`create` e da prévia, o editor envia: `PUT /api/atelie/handouts/:id/bake?light=normal&revision=<revisão salva>` (e `?light=uv&revision=…` quando houver; quando não houver, `DELETE /api/atelie/handouts/:id/bake?light=uv` para não sobrar um assado velho). Corpo cru `image/png`, até 30 MB. O servidor grava `<dataDir>/handouts/<id>.bake-normal.png` / `<id>.bake-uv.png` e a revisão em que foi assado em `<id>.bake.json` (`{ normal: revisão, uv: revisão | null }`). Assado com revisão diferente da revisão atual do documento → `409`.

Mostre "Salvando…" e depois "Salvo" no cabeçalho; um erro no assado não perde o documento salvo (avise "Salvo, mas o assado falhou: <motivo>").

## Rotas do contrato (em `server/routes/handouts.js`)

Siga a seção 2 do contrato, com estes detalhes:

- `GET /api/atelie/handouts` passa a incluir `hasUv` (verdadeiro se existe assado UV da revisão atual).
- `GET /api/atelie/handouts/:id/bake?light=normal|uv` → o PNG, `X-Atelie-Revision`, `Cache-Control: no-cache`; `404` se não houver.
- `PUT` e `DELETE` de assado: **sem** CORS (só a própria página do ateliê grava).

### CORS (`server/cors.js`)

```js
/** Lets the allowed origins read (GET and HEAD only); everything else is same-origin. */
export function readOnlyCors(allowedOrigins) // → middleware Express
// Se req.headers.origin estiver na lista: Access-Control-Allow-Origin = essa origem, Vary: Origin,
// Access-Control-Expose-Headers: X-Atelie-Revision. Para OPTIONS de uma origem permitida pedindo GET: 204 com
// Access-Control-Allow-Methods: GET, HEAD. Origem fora da lista: não acrescenta nada.
```

Aplique em `/api/atelie/health`, `/api/atelie/handouts` (lista), `…/:id/preview` e `…/:id/bake` (GET).

## Link direto e aviso de "salvo"

O servidor injeta na página a lista de origens permitidas, para o navegador saber a quem pode responder: ao servir o `index.html`, troque o marcador `<!-- ATELIE_CONFIG -->` (coloque-o no `<head>` do `index.html`) por `<script>window.__ATELIE_CONFIG__ = { allowedOrigins: [...] };</script>` (escape com `JSON.stringify` e troque `<` por `<`). No Vite em desenvolvimento, use a lista padrão de `server/paths.js` (um `define` no `vite.config.js`).

`src/editor/handoff.js`:

```js
/** Where to tell about saves: the `from` origin of the URL if allowed and there is an opener, else null. */
export function handoffTarget(location, opener, allowedOrigins)
/** The message of the contract (section 4). */
export const savedMessage = (handout, hasUv) => ({ app: 'atelie', contract: 1, type: 'handout-saved', id: handout.id, revision: handout.revision, name: handout.name, hasUv })
```

Depois de salvar **e** assar, se `handoffTarget(...)` não for nulo: `window.opener.postMessage(savedMessage(...), target)`. Mostre no cabeçalho um selo "Ligado ao Tabletop" enquanto houver destino.

`?handout=<id>` e `?new=<preset>` já funcionam desde a etapa 6; confira que continuam funcionando com `&from=…` junto.

## Testes

`tests/contract.test.js` (servidor real):

1. `GET /api/atelie/health` → `{ status: 'ok', app: 'atelie', contract: 1 }`, com `Access-Control-Allow-Origin: http://127.0.0.1:3001` quando o pedido vem com essa origem, e **sem** o cabeçalho para `http://evil.example`.
2. `OPTIONS` de origem permitida → `204` com `GET, HEAD`; `PUT` de assado com `Origin: http://127.0.0.1:3001` não ganha cabeçalhos de CORS.
3. Criar documento, `PUT` assado normal (PNG pequeno) → `GET …/bake?light=normal` devolve o PNG e `X-Atelie-Revision: 1`; `…?light=uv` → `404`; a lista mostra `hasUv: false`.
4. Salvar a revisão 2 sem assar → `GET …/bake` ainda devolve o assado da revisão 1 com `X-Atelie-Revision: 1` (o Tabletop compara); `PUT` de assado dizendo revisão 1 depois da 2 → `409`.
5. O `index.html` servido contém `window.__ATELIE_CONFIG__` com as origens, sem `<` cru dentro do JSON.

`tests/handoff.test.js` (Node): `handoffTarget` com `from` permitido e opener → a origem; sem opener → null; `from` fora da lista → null; `from` mal formado → null. `savedMessage` tem exatamente os campos do contrato.

`tests/e2e/handoff.test.js`: uma página "falsa do Tabletop" servida num segundo servidor Express em outra porta, que faz `window.open('<ateliê>/?new=a4&from=<origem dela>')` e registra as mensagens recebidas; no ateliê, desenhar um retângulo e salvar → a página falsa recebe `handout-saved` com `contract: 1`; um `fetch` dela a `…/bake?light=normal` funciona (CORS) e devolve um PNG. A segunda porta precisa estar em `allowedOrigins` (passe a lista ao `createApp` do teste).

## Pronto quando

- [ ] Testes passam; `npm test` e os E2E passam.
- [ ] Cada linha das seções 2, 3 e 4 do `CONTRATO-TABLETOP.md` tem um teste que a confere (anote, no fim do contrato, qual teste cobre qual linha).

## Não faça

- Nada no Tabletop (etapa 18). Não mude o contrato: se algo nele estiver errado ou impossível, pare e avise.
