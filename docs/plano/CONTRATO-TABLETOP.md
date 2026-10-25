# Contrato entre o Ateliê e o Tabletop

Versão 1, 24 de outubro de 2026. O Ateliê **oferece**, o Tabletop **consome**. Mudar qualquer coisa aqui exige mudar os dois lados e subir a versão.

## 0. Onde os dois rodam

| Situação | Endereços | Mesma origem? | Caminho usado |
|---|---|---|---|
| **Publicados no GitHub Pages da mesma conta** (o uso principal) | `https://<conta>.github.io/Tabletop/` e `https://<conta>.github.io/Atelie/` | **sim** (origem = protocolo + domínio + porta; o caminho não conta) | **A — navegador compartilhado** |
| Um deles com domínio próprio, ou contas diferentes | domínios diferentes | não | **B — janela** |
| Desenvolvimento local com os dois servidores | `http://127.0.0.1:3001` e `http://127.0.0.1:3011` | não (portas diferentes) | **C — HTTP** (e B) |

Não há contas nem servidor público: no Pages, os documentos de cada pessoa vivem **no navegador dela** (IndexedDB), e a integração é para a mesma pessoa, no mesmo navegador. Para entregar um documento a outra pessoa, exporta-se o PNG.

**Fora do contrato**: o Tabletop publicado chamando um Ateliê em `127.0.0.1` (ou o contrário). Uma página pública que chama um endereço da rede local esbarra na política *Private Network Access* do Chrome, que exige cabeçalhos especiais e muda entre versões; não é apoiado.

O Tabletop **nunca** desenha camadas nem lê o formato interno do Ateliê: recebe só imagens assadas (PNG) e a identificação do documento.

## 1. O que o Tabletop guarda

Num lado de página de um objeto inspecionável (`entity.inspectable.pages[i]` ou `.back`):

```js
{
  imageRef: { id, revision },            // asset de imagem do Tabletop: o PNG assado em luz normal
  uvImageRef: null | { id, revision },   // o PNG assado sob luz UV, se o documento tem camadas UV
  text: null,
  design: { app: 'atelie', id: '<uuid do documento>', revision: 7, source: '<endereço base do Ateliê>' },
}
```

`source` é o endereço base do Ateliê que gerou (ex.: `https://conta.github.io/Atelie/`), para o Tabletop saber onde procurar atualizações.

## 2. O que circula: um "documento entregue"

Os três caminhos entregam a mesma coisa:

```js
Delivery = {
  id, name, category, tags, revision, updatedAt,
  hasUv: boolean,
  source: '<endereço base do Ateliê>',
  preview: Blob,                       // WebP ou PNG, lado maior 480
  bakes: { normal: Blob, uv: Blob | null },   // PNG, lado maior 2048, da MESMA revisão
}
```

Um resumo (`Summary`) é o mesmo sem `bakes` (e com `preview` opcional).

## 3. Caminho A — navegador compartilhado (mesma origem)

### Banco de troca `mesa-handouts-v1`

Um banco IndexedDB **sem** escopo de caminho (é o ponto de encontro dos dois apps na mesma origem), versão 1, com duas *stores*:

| Store | Chave | Valor |
|---|---|---|
| `handouts` | `id` | `Summary` com `preview` (Blob) |
| `bakes` | `[id, light]` (`light`: `'normal'` ou `'uv'`) | `{ id, light, revision, blob: Blob, width, height }` |

- **Só o Ateliê escreve.** O Tabletop só lê.
- O Ateliê grava, numa **mesma transação**, o resumo e os assados da mesma revisão; ao excluir um documento (lixeira), remove os registros dele; ao restaurar, grava de novo.
- Nos Ajustes do Ateliê, "**Compartilhar com o Tabletop neste navegador**" (ligado por padrão) controla se ele publica nesse banco; desligar apaga os registros dele.
- Os bancos **internos** de cada app continuam com escopo de caminho (`atelie-v1:<caminho>`, como o Tabletop já faz com `tabletop-library-v1:<caminho>`), para nunca se misturarem.

### Aviso em tempo real

Depois de gravar no banco de troca, o Ateliê publica em `BroadcastChannel('mesa:handout')`:

```js
{ app: 'atelie', contract: 1, type: 'handout-saved' | 'handout-removed', id, revision, source }
```

O Tabletop escuta enquanto estiver aberto (em qualquer aba da mesma origem) e lê o banco quando precisa.

## 4. Caminho B — janela (qualquer origem)

O Tabletop abre o Ateliê numa janela (`window.open(url, 'atelie')`) e conversa com ela por `postMessage`. Nenhum dos dois precisa de servidor.

| Endereço que o Tabletop abre | O Ateliê faz |
|---|---|
| `<ateliê>/?pick=1&from=<origem do Tabletop>&nonce=<aleatório>` | mostra a lista de documentos com o botão **Enviar ao Tabletop**; ao escolher, envia `delivered` e fecha |
| `<ateliê>/?handout=<id>&from=<origem>&nonce=…` | abre o documento para editar; **a cada arquivar**, envia `delivered` |
| `<ateliê>/?new=a4&from=<origem>&nonce=…` | documento novo; a cada arquivar, envia `delivered` |

Mensagem do Ateliê para `window.opener`, com `targetOrigin = from`:

```js
{ app: 'atelie', contract: 1, type: 'delivered', nonce, delivery: Delivery }
```

- O `postMessage` transporta `Blob` entre origens (clonagem estruturada).
- O Tabletop aceita só mensagens cuja `event.origin` seja a origem do Ateliê configurado e cujo `nonce` seja o que ele gerou ao abrir a janela.
- O Ateliê só responde se `from` for uma origem válida (`https:` ou `http://127.0.0.1`/`localhost`); ele não confia em nada mais da mensagem. No Pages não há como restringir mais que isso, e não é preciso: só a janela que o usuário abriu recebe, e o conteúdo é do próprio usuário.
- Nenhum dos dois define o cabeçalho `Cross-Origin-Opener-Policy: same-origin` (ele cortaria a ligação entre as janelas). O GitHub Pages não o envia.

**Limite do caminho B**: o Tabletop só fica sabendo de uma revisão nova quando a janela do Ateliê aberta por ele envia `delivered`. Com a janela fechada, não há como consultar.

## 5. Caminho C — HTTP (servidores locais)

Para desenvolvimento, com os dois servidores rodando:

| Rota | Resposta |
|---|---|
| `GET /api/atelie/health` | `{ status: 'ok', app: 'atelie', contract: 1 }` |
| `GET /api/atelie/handouts` | `[Summary sem o Blob, com preview: '/api/atelie/handouts/<id>/preview']` |
| `GET /api/atelie/handouts/:id/preview` | a prévia |
| `GET /api/atelie/handouts/:id/bake?light=normal\|uv` | o PNG, cabeçalho `X-Atelie-Revision`, `Cache-Control: no-cache`; `404` se não houver |

CORS só de leitura (`GET`, `HEAD`) para as origens de `ATELIE_ALLOWED_ORIGINS` (padrão: `http://127.0.0.1:3001,http://localhost:3001,http://127.0.0.1:5173,http://localhost:5173`), com `Vary: Origin` e `Access-Control-Expose-Headers: X-Atelie-Revision`. O caminho B também funciona entre os servidores locais.

## 6. Como o Tabletop escolhe o caminho

O endereço do Ateliê fica nos Ajustes do Tabletop (`tabletop-atelie-url` em `localStorage`). Padrão: no Pages, o repositório irmão (`new URL('../Atelie/', <endereço base do Tabletop>)`); com servidor local, `http://127.0.0.1:3011/`.

```
mesma origem do Tabletop?  → A (banco de troca) + B para "Editar" e "Novo"
senão, GET <ateliê>/api/atelie/health responde?  → C para listar e buscar + B para "Editar" e "Novo"
senão  → B para tudo
```

A interface é a mesma nos três; só o "Atualizar a partir do Ateliê" automático depende de A ou C (no B, a atualização chega quando a janela envia).

## 7. Versões

`contract: 1` nas mensagens e em `health`. Quem receber outra versão ignora e avisa uma vez no console: "Ateliê com contrato N; este Tabletop entende 1". O banco de troca tem versão de esquema 1 (`indexedDB.open('mesa-handouts-v1', 1)`); mudar as stores é contrato 2.

## Testes de contrato

- **Ateliê** (etapa 18): o caminho A grava resumo e assados na mesma transação e publica no canal (E2E numa página); o B responde `delivered` com `nonce` e Blobs para uma página "falsa do Tabletop" em outra origem; o C confere rotas e CORS. Funções puras testadas no Node: `summaryOf(handout)`, `deliveredMessage(...)`, `validFrom(origin)`.
- **Tabletop** (etapa 28): a escolha do caminho (função pura com as três situações); A com um banco de troca preenchido pelo próprio teste na mesma origem; B com uma página "falsa do Ateliê" em outra porta; C com um servidor falso.

### Cobertura de testes do contrato (Etapa 18)

| Seção | O que define | Testes que cobrem |
|---|---|---|
| **2. O que circula (`Delivery` e `Summary`)** | Formato de entrega com Blobs e dimensões | `tests/bake.test.js` (`summaryOf`, `deliveryOf`), `tests/handoff.test.js` (`deliveredMessage`, `savedMessage`), `tests/e2e/handoff.test.js` (entrega com PNG válido) |
| **3. Caminho A — navegador compartilhado** | Banco `mesa-handouts-v1`, stores `handouts` e `bakes`, `BroadcastChannel('mesa:handout')`, ajuste de compartilhamento | `tests/e2e/exchange.test.js` (gravação numa mesma transação, `handout-saved`, `handout-removed` na lixeira, esvaziamento nos Ajustes e modo navegador) |
| **4. Caminho B — janela** | `handoffRequest`, `validFrom`, modos `?pick=1`, `?handout=`, `?new=`, `postMessage(delivered)` e targetOrigin | `tests/handoff.test.js` (regras e segurança de origem), `tests/e2e/handoff.test.js` (fluxo completo pick com fechamento e edit com envio no arquivar) |
| **5. Caminho C — HTTP** | Rotas de leitura com CORS (`health`, lista, prévia, `bake`), `PUT`/`DELETE` de assado sem CORS, `409 Conflict`, cabeçalhos `X-Atelie-Revision` e `Cache-Control` | `tests/contract-http.test.js` (servidor real cobrindo health, CORS, preflight OPTIONS, ciclo PUT->GET bake, 409 e `hasUv`) |
