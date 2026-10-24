# Contrato entre o Ateliê e o Tabletop

Versão 1, 24 de outubro de 2026. O Ateliê **oferece**, o Tabletop **consome**. Mudar qualquer coisa aqui exige mudar os dois lados e subir a versão.

São dois aplicativos em origens diferentes (`http://127.0.0.1:3011` e `http://127.0.0.1:3001`). Por isso a comunicação é por **HTTP com CORS** e por **`window.postMessage`** entre janelas; `BroadcastChannel` não serve (só funciona na mesma origem).

## 1. O que o Tabletop guarda de um documento do ateliê

Num lado de página de um objeto inspecionável (`entity.inspectable.pages[i]` ou `.back`):

```js
{
  imageRef: { id, revision },        // asset de imagem do Tabletop: o PNG assado em luz normal
  uvImageRef: null | { id, revision },   // o PNG assado sob luz UV, se o documento tem camadas UV
  text: null,
  design: { app: 'atelie', id: '<uuid do documento>', revision: 7 },   // qual documento e qual revisão geraram as imagens
}
```

O Tabletop **nunca** guarda o documento em camadas nem desenha camadas: só as imagens assadas, que entram no fluxo de imagens que ele já tem (textura da página, leitura, projetor, segredo até revelar).

## 2. HTTP oferecido pelo Ateliê

Todas as rotas abaixo respondem a `GET` com CORS para as origens de `ATELIE_ALLOWED_ORIGINS` (padrão: `http://127.0.0.1:3001,http://localhost:3001,http://127.0.0.1:5173,http://localhost:5173`): `Access-Control-Allow-Origin: <origem do pedido, se permitida>`, `Vary: Origin`, `Access-Control-Expose-Headers: X-Atelie-Revision`. Origem não permitida: a resposta sai sem os cabeçalhos de CORS (o navegador bloqueia). Nenhuma rota que grava aceita CORS.

| Rota | Resposta |
|---|---|
| `GET /api/atelie/health` | `{ status: 'ok', app: 'atelie', contract: 1 }` |
| `GET /api/atelie/handouts` | `[{ id, name, category, tags, revision, updatedAt, hasUv, preview: '/api/atelie/handouts/<id>/preview' \| null }]`, mais recente primeiro |
| `GET /api/atelie/handouts/:id/preview` | WebP ou PNG pequeno (lado maior 480) |
| `GET /api/atelie/handouts/:id/bake?light=normal` | PNG assado da **última** revisão, lado maior 2048; cabeçalho `X-Atelie-Revision: <n>`; `Cache-Control: no-cache`. `404` se ainda não foi assado |
| `GET /api/atelie/handouts/:id/bake?light=uv` | o mesmo, sob luz UV; `404` se o documento não tem camadas UV |

O assado é feito **no navegador do ateliê ao salvar** (o servidor não desenha): ver etapa 13.

## 3. Abrir o ateliê a partir do Tabletop

O Tabletop abre uma janela (`window.open(url, 'atelie')`) com:

| Endereço | Efeito |
|---|---|
| `<ateliê>/?handout=<id>&from=<origem do Tabletop>` | abre esse documento para editar |
| `<ateliê>/?new=a4&from=<origem>` | abre um documento novo (qualquer `PAGE_PRESETS`) |

`from` é a origem exata do Tabletop (`location.origin`), codificada com `encodeURIComponent`. O ateliê só aceita `from` presente em `ATELIE_ALLOWED_ORIGINS` (o servidor injeta a lista na página, ver etapa 13); fora dela, ignora o parâmetro.

## 4. Mensagens do Ateliê para o Tabletop

Depois de **salvar e assar**, se a janela foi aberta com um `from` válido e `window.opener` existe:

```js
window.opener.postMessage({ app: 'atelie', contract: 1, type: 'handout-saved', id, revision, name, hasUv }, from);
```

O Tabletop aceita a mensagem só se `event.origin` for igual à origem do endereço do ateliê configurado, `data.app === 'atelie'` e `data.contract === 1`; ignora o resto.

## 5. Sem mensagem (janela fechada, outra aba)

O Tabletop não depende só da mensagem: ao mostrar um lado com `design`, compara `design.revision` com a `revision` da lista `GET /api/atelie/handouts` (pedida no máximo uma vez a cada 10 s) e oferece **Atualizar a partir do ateliê** quando a do ateliê for maior.

## 6. Configuração no Tabletop

Em **Ajustes**, "Ateliê de documentos · endereço", padrão `http://127.0.0.1:3011`, guardado em `localStorage` (`tabletop-atelie-url`). Um indicador mostra se `GET /api/atelie/health` responde. Sem ateliê (ou no GitHub Pages), os botões do ateliê ficam ocultos e nada mais muda.

## 7. Versões

- `contract: 1` em `health` e nas mensagens. Um lado que receber outra versão ignora e mostra no console uma vez: "Ateliê com contrato N; este Tabletop entende 1".
- O formato do documento (`schema` da etapa 2) é interno do ateliê: o Tabletop não lê camadas.

## Testes de contrato

- No Ateliê (etapa 13): `tests/contract.test.js` sobe o servidor e confere cada rota da seção 2, os cabeçalhos de CORS para uma origem permitida e a falta deles para outra, e o formato da mensagem (função pura `savedMessage(handout)`).
- No Tabletop (etapa 18): um servidor falso do ateliê no próprio teste (Express com as rotas da seção 2 servindo um PNG fixo) e a janela do ateliê simulada mandando a mensagem da seção 4.
