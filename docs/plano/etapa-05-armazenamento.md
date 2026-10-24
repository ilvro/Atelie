# Etapa 5 — Armazenamento

Leia antes: `00-LEIA-PRIMEIRO.md`, `etapa-02-modelo-de-dados.md` (formato), `server/app.js`, `server/paths.js`, `server/storage.js` (`atomicWrite`, `readJSON`, `HttpError`, `checkRevision`), `tests/server.test.js`. Para comparar o estilo (só leitura): `../Tabletop/server/app.js` (rotas de `scenes`) e `../Tabletop/server/assets.js` (validação de PNG/JPEG/WebP).

## Objetivo

1. Guardar os documentos que a pessoa cria (JSON) com revisão.
2. Receber imagens enviadas pela pessoa (fotos de personagens, mapas, brasões) para usar nas camadas.
3. Servir a **biblioteca privada** (modelos, elementos, fontes) de `libraryDir`, só para leitura, sem nunca sair dessa pasta.
4. Um cliente em `src/data/api.js` para o editor.

As rotas de assado e o CORS para o Tabletop ficam para a etapa 13.

## Onde fica cada coisa

| O quê | Onde | No git? |
|---|---|---|
| Documentos | `<dataDir>/handouts/<id>.json` e `<dataDir>/handouts/<id>.preview.webp` | sim (é o trabalho da pessoa) |
| Imagens enviadas | `<dataDir>/uploads/<id>.<ext>` e `<dataDir>/uploads/index.json` | sim |
| Biblioteca | `libraryDir` = `data-private/library/` | **não** |

## Formato da biblioteca (escrito pelas etapas 8 e 12; aqui só lido)

`<biblioteca>/library.json`:

```js
{
  schema: 1,
  generatedAt: '2026-10-24T12:00:00Z',
  items: [
    { id: 'el-sangue-respingo-07', kind: 'element', name: 'Respingo de sangue 7', category: 'Sangue', tags: ['sangue', 'respingo'],
      file: 'elements/el-sangue-respingo-07.webp', preview: 'previews/el-sangue-respingo-07.webp', width: 1600, height: 1210,
      source: { bundle: 'Assets 01-2023', path: 'Assets/2023/01-2023/Sangue/Sangue (7).png' } },
    { id: 'font-kingthings-trypewriter-2', kind: 'font', name: 'Kingthings Trypewriter 2', category: 'Fontes', tags: [],
      file: 'fonts/font-kingthings-trypewriter-2.ttf', family: 'KingthingsTrypewriter2', postscript: 'KingthingsTrypewriter2', weight: 400, style: 'normal', source: { … } },
    { id: 'tpl-policial-relatorio', kind: 'template', name: 'Relatório policial', category: 'Policial', tags: ['uv'],
      file: 'templates/tpl-policial-relatorio.json', preview: 'previews/tpl-policial-relatorio.webp', width: 1240, height: 1754, source: { … } },
    { id: 'tpl-policial-relatorio--03', kind: 'layer', name: 'Amassado', file: 'templates/tpl-policial-relatorio/03.webp', width: 1240, height: 1754 }
  ]
}
```

`kind: 'layer'` são as imagens das camadas de um modelo: servidas como qualquer arquivo, mas **não** aparecem na listagem normal.

## Rotas (em `server/routes/`, registradas por `createApp`)

`server/routes/library.js`, `server/routes/handouts.js`, `server/routes/uploads.js`, cada um exportando `register(app, { dataDir, libraryDir })`.

### Biblioteca

| Rota | Resposta |
|---|---|
| `GET /api/atelie/library` | `{ available: true, generatedAt, items: [...] }` sem os `kind: 'layer'`; `{ available: false, items: [] }` se `library.json` não existe |
| `GET /api/atelie/library/:itemId` | o item; para `template`, o item mais `handout` (o JSON do arquivo `file`) |
| `GET /api/atelie/library/:itemId/file` | o arquivo `file` (para `template`, a prévia) com `Content-Type` pela extensão (`.webp`, `.png`, `.jpg`, `.ttf` `font/ttf`, `.otf` `font/otf`, `.woff2` `font/woff2`) e `Cache-Control: public, max-age=31536000, immutable` |
| `GET /api/atelie/library/:itemId/preview` | o arquivo `preview` |

`library.json` é lido uma vez e guardado em cache pela data de modificação (`stat`).

### Documentos

| Rota | Resposta |
|---|---|
| `GET /api/atelie/handouts` | `[{ id, name, category, tags, revision, updatedAt, preview: '/api/atelie/handouts/<id>/preview' \| null }]`, mais recente primeiro |
| `GET /api/atelie/handouts/:id` | o documento |
| `POST /api/atelie/handouts` `{ handout }` | `201`, grava com `revision: 1` |
| `PUT /api/atelie/handouts/:id` `{ handout, expectedRevision }` | `409` se a revisão não bate (`checkRevision`); grava com `revision + 1` |
| `DELETE /api/atelie/handouts/:id?expectedRevision=n` | `204`; apaga JSON e prévia |
| `PUT /api/atelie/handouts/:id/preview` `{ image: 'data:image/webp;base64,…' }` | WebP ou PNG até 2 MB |
| `GET /api/atelie/handouts/:id/preview` | a prévia |

Valide com `validateHandout` antes de gravar (`422`).

### Imagens enviadas

| Rota | Resposta |
|---|---|
| `POST /api/atelie/uploads?name=<nome do arquivo>` (corpo cru, `Content-Type` `image/png`, `image/jpeg` ou `image/webp`, até 25 MB) | `201` `{ id: 'up-' + 12 hex aleatórios, name, mime, size, width, height, createdAt }` |
| `GET /api/atelie/uploads` | a lista (de `index.json`), mais recente primeiro |
| `GET /api/atelie/uploads/:id/file` | o arquivo, `Cache-Control` imutável |
| `DELETE /api/atelie/uploads/:id` | `204` |

Confira a assinatura do arquivo (PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF….WEBP`) e leia largura e altura do cabeçalho (PNG: IHDR; JPEG: primeiro SOF0/SOF2; WebP: VP8/VP8L/VP8X). Não confie no `Content-Type`.

### Segurança (teste cada uma)

- `id` de documento: uuid (`documentId` de `server/storage.js`); `itemId`: `/^[a-z0-9][a-z0-9-]{0,119}$/`; `uploadId`: `/^up-[0-9a-f]{12}$/`.
- O caminho final de qualquer arquivo da biblioteca é `path.resolve(libraryDir, item.file)`; recuse com `404` se ele não começar com `libraryDir + path.sep` (proteção contra `../`, mesmo vindo do manifesto). O mesmo para envios dentro de `<dataDir>/uploads`.
- Nenhuma rota escreve em `libraryDir`.

## Cliente (`src/data/api.js`)

```js
export const api = {
  handouts: { list(), read(id), create(handout), save(handout), remove(handout), savePreview(handout, dataUrl) },
  library: { list(), item(id), fileURL(id), previewURL(id) },
  uploads: { list(), send(file), remove(id), fileURL(id) },
};
// Erros viram ApiError(message, status) (crie em src/data/errors.js). URLs relativas: new URL('api/atelie/…', document.baseURI).
```

## Testes

`tests/handouts-server.test.js`, `tests/library-server.test.js`, `tests/uploads-server.test.js` (servidor real com `createApp({ dataDir: tmp, libraryDir: tmpLib, distDir: tmpDist })`):

1. Sem `library.json`: `{ available: false, items: [] }`.
2. Com um `library.json` de teste (um elemento, uma fonte, um modelo e uma camada, com arquivos pequenos): a listagem tem 3 itens; `…/library/<camada>/file` funciona; o modelo vem com `handout`; `Content-Type` e `Cache-Control` certos.
3. Item com `file: '../../segredo.txt'` → `404`; `itemId` com `..` → `404`.
4. Documentos: criar → revisão 1; salvar com revisão errada → `409`; certo → 2; listar; apagar → `204`; inválido → `422`; prévia PNG ida e volta.
5. Envio de um PNG 3 × 2 gerado no teste → `width: 3, height: 2`; um arquivo de texto com `Content-Type: image/png` → `422`; `GET …/file` devolve os mesmos bytes; `DELETE` some da lista.

## Pronto quando

- [ ] Testes passam; `npm test` passa.
- [ ] `curl http://127.0.0.1:3011/api/atelie/library` responde `available: false` num checkout limpo.

## Não faça

- Não escreva em `libraryDir`. Não liste arquivos do HD pelo servidor. Nada de CORS ainda (etapa 13).
