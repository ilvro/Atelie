# Etapa 6 — Armazenamento

Leia antes: `00-LEIA-PRIMEIRO.md`, `etapa-03-modelo-de-dados.md` (formato), `server/app.js`, `server/paths.js` (`collectionDir`, `defaultExpansionsDir`), `server/storage.js` (`atomicWrite`, `readJSON`, `HttpError`, `checkRevision`), `tests/server.test.js`. Para comparar o estilo (só leitura): `../Tabletop/server/app.js` (rotas de `scenes`), `../Tabletop/server/assets.js` (validação de imagens) e `../Tabletop/src/data/browser-repository.js` (o modo navegador do Tabletop).

## Objetivo

1. Guardar os documentos da pessoa (JSON) com revisão, **versões anteriores** e **lixeira**.
2. Receber imagens enviadas (fotos de personagens, mapas, brasões).
3. Servir a **biblioteca**, que junta duas origens: a **coleção da casa** (`public/colecao/`, do próprio Ateliê) e as **expansões** (`data-private/expansoes/<id>/`, privadas).
4. Um cliente único em `src/data/api.js`, com **modo servidor** e **modo navegador** (sem servidor, como site estático).

As rotas de assado e o CORS para o Tabletop ficam para a etapa 18.

## Onde fica cada coisa

| O quê | Modo servidor | Modo navegador | No git? |
|---|---|---|---|
| Documentos | `<dataDir>/handouts/<id>.json`, `<id>.preview.webp` | IndexedDB `atelie-v1`, store `handouts` | os do servidor, sim |
| Versões | `<dataDir>/handouts/versions/<id>/<revisão>.json` (as últimas 30) | store `versions` (as últimas 10) | sim |
| Lixeira | `<dataDir>/handouts/trash/<id>.json` (30 dias) | store `trash` | sim |
| Imagens enviadas | `<dataDir>/uploads/<id>.<ext>`, `index.json` | store `uploads` (Blob) | sim |
| Coleção da casa | `public/colecao/` (servida como arquivo estático) | a mesma, estática | **sim** |
| Expansões | `data-private/expansoes/<id>/` | indisponíveis | **não** |

## Formato da biblioteca

Cada origem tem um `library.json` igual (a coleção em `public/colecao/library.json`, cada expansão em `<expansão>/library.json`) e, nas expansões, um `expansion.json` (`{ id, name, description, license }`):

```js
{
  schema: 1,
  generatedAt: '2026-10-24T12:00:00Z',
  items: [
    { id: 'casa-papel-oficio-creme', kind: 'element', name: 'Ofício creme', category: 'Papéis', tags: ['papel', 'creme'],
      file: 'papeis/oficio-creme.webp', preview: 'previews/casa-papel-oficio-creme.webp', width: 2048, height: 2896, license: 'própria' },
    { id: 'casa-font-courier-prime', kind: 'font', name: 'Courier Prime', category: 'Máquina de escrever', tags: [],
      file: 'fontes/CourierPrime-Regular.ttf', family: 'Courier Prime', postscript: 'CourierPrime-Regular', weight: 400, style: 'normal', license: 'OFL-1.1' },
    { id: 'casa-tpl-carta-envelhecida', kind: 'template', name: 'Carta envelhecida', category: 'Cartas', tags: [],
      file: 'modelos/carta-envelhecida.json', preview: 'previews/casa-tpl-carta-envelhecida.webp', width: 1240, height: 1754, fields: 3 },
    { id: 'ac-tpl-policial-relatorio--03', kind: 'layer', name: 'Amassado', file: 'templates/ac-tpl-policial-relatorio/03.webp', width: 1240, height: 1754 }
  ]
}
```

- `file` e `preview` são relativos à pasta da origem.
- `kind: 'layer'` (imagens das camadas de um modelo importado) não aparece na listagem normal.
- Ao juntar, cada item ganha `source: 'casa'` ou `source: '<id da expansão>'`. **Id repetido** entre origens: fica o primeiro (casa antes das expansões, expansões em ordem alfabética) e o servidor registra um aviso.

## Rotas (em `server/routes/`, registradas por `createApp`)

`server/routes/library.js`, `server/routes/handouts.js`, `server/routes/uploads.js`, cada um exportando `register(app, { dataDir, expansionsDir, collection })`.

### Biblioteca

| Rota | Resposta |
|---|---|
| `GET /api/atelie/library` | `{ sources: [{ id: 'casa', name: 'Coleção do Ateliê' }, { id, name, description, license }…], items: [...] }` sem os `kind: 'layer'` |
| `GET /api/atelie/library/:itemId` | o item; para `template`, o item mais `handout` (o JSON do arquivo) |
| `GET /api/atelie/library/:itemId/file` | o arquivo, com `Content-Type` pela extensão (`.webp`, `.png`, `.jpg`, `.svg` `image/svg+xml`, `.ttf` `font/ttf`, `.otf` `font/otf`, `.woff2` `font/woff2`) e `Cache-Control: public, max-age=31536000, immutable` |
| `GET /api/atelie/library/:itemId/preview` | a prévia |

Crie nesta etapa `public/colecao/library.json` com `{ "schema": 1, "generatedAt": null, "items": [] }` e um `public/colecao/README.md` dizendo que a coleção é gerada pelos scripts das etapas 12 a 16 e é do próprio Ateliê.

Cada `library.json` é lido uma vez e guardado em cache pela data de modificação (`stat`). Uma expansão sem `library.json` válido é ignorada com aviso; a coleção da casa sem `library.json` é um erro de instalação (o servidor não sobe e diz por quê).

### Documentos

| Rota | Resposta |
|---|---|
| `GET /api/atelie/handouts` | `[{ id, name, category, tags, folder, favorite, revision, updatedAt, preview }]`, mais recente primeiro (fora da lixeira) |
| `GET /api/atelie/handouts/:id` | o documento |
| `POST /api/atelie/handouts` `{ handout }` | `201`, `revision: 1` |
| `PUT /api/atelie/handouts/:id` `{ handout, expectedRevision }` | `409` se a revisão não bate; grava com `revision + 1` e guarda a anterior em `versions/` (apaga além das 30 últimas) |
| `GET /api/atelie/handouts/:id/versions` | `[{ revision, updatedAt, name }]` |
| `GET /api/atelie/handouts/:id/versions/:revision` | aquela versão |
| `DELETE /api/atelie/handouts/:id?expectedRevision=n` | `204`; move para `trash/` com `deletedAt` |
| `GET /api/atelie/trash` · `POST /api/atelie/trash/:id/restore` · `DELETE /api/atelie/trash/:id` | listar, restaurar, apagar de vez. Itens com mais de 30 dias são apagados ao listar |
| `PUT` / `GET /api/atelie/handouts/:id/preview` | prévia WebP ou PNG até 2 MB |

`folder` e `favorite` são campos novos e opcionais do documento (`folder`: id de pasta ou `null`; `favorite`: booleano): acrescente-os ao formato da etapa 3 (validação e teste). As pastas em si são da etapa 10.

### Imagens enviadas

| Rota | Resposta |
|---|---|
| `POST /api/atelie/uploads?name=<nome>` (corpo cru `image/png`, `image/jpeg` ou `image/webp`, até 25 MB) | `201` `{ id: 'up-' + 12 hex, name, mime, size, width, height, createdAt }` |
| `GET /api/atelie/uploads` · `GET …/:id/file` · `DELETE …/:id` | listar · arquivo (imutável) · apagar |

Confira a assinatura do arquivo (PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF….WEBP`) e leia largura e altura do cabeçalho; não confie no `Content-Type`.

### Segurança (teste cada uma)

- `id` de documento: uuid; `itemId`: `/^[a-z0-9][a-z0-9-]{0,119}$/`; `uploadId`: `/^up-[0-9a-f]{12}$/`; `revision`: inteiro ≥ 1.
- Todo caminho de arquivo é resolvido dentro da pasta da sua origem e recusado (`404`) se sair dela (proteção contra `../`, mesmo vindo de um manifesto).
- Nenhuma rota escreve em `collection` nem em `expansionsDir`.

## Cliente (`src/data/api.js`)

```js
export const api = {
  mode,                                       // 'server' | 'browser'
  handouts: { list(), read(id), create(h), save(h), remove(h), versions(id), version(id, rev), savePreview(h, dataUrl) },
  trash: { list(), restore(id), purge(id) },
  library: { list(), item(id), fileURL(item), previewURL(item) },
  uploads: { list(), send(file), remove(id), fileURL(id) },
};
```

- **Modo**: `browser` quando `import.meta.env.VITE_ATELIE_STORAGE === 'browser'` ou quando `GET /api/atelie/health` falha na abertura (página servida como arquivo estático); senão `server`.
- **Modo navegador**: documentos, versões, lixeira e envios em IndexedDB (`atelie-v1`), com a mesma semântica de revisão (conflito → `ApiError` 409). A biblioteca lê `colecao/library.json` direto como arquivo estático (`fetch`), com `sources: [{ id: 'casa', … }]`; `fileURL(item)` é `colecao/<file>`. Uma faixa discreta no rodapé diz "Salvando neste navegador" (etapa 2 cria o lugar).
- URLs relativas à página: `new URL(caminho, document.baseURI)`.

## Testes

`tests/library-server.test.js`, `tests/handouts-server.test.js`, `tests/uploads-server.test.js` (servidor real com pastas temporárias para `dataDir`, `expansionsDir`, `collection` e `distDir`):

1. Coleção com um elemento e um modelo; sem expansões → `sources` só com `casa`; os itens trazem `source: 'casa'`.
2. Com uma expansão (`expansion.json` + `library.json` com um elemento, uma fonte, um modelo e uma camada) → `sources` com as duas; a camada não aparece mas o arquivo dela é servido; o modelo vem com `handout`.
3. Id repetido entre casa e expansão → fica o da casa.
4. `file: '../../segredo.txt'` num manifesto → `404`; `itemId` com `..` → `404`.
5. Documentos: criar, salvar (revisão 2), `versions` lista a 1, ler a versão 1; conflito `409`; inválido `422`; apagar → some da lista e aparece na lixeira; restaurar volta; `purge` apaga de vez; item da lixeira com `deletedAt` de 31 dias atrás some ao listar.
6. Envios: PNG 3 × 2 → `width: 3, height: 2`; texto com `Content-Type: image/png` → `422`; apagar.

`tests/e2e/storage-browser.test.js`: build com `VITE_ATELIE_STORAGE=browser` servido como estático (sem o servidor do Ateliê) → criar e salvar um documento, recarregar, ele continua lá; a biblioteca lista a coleção da casa (use uma coleção de teste mínima).

## Pronto quando

- [ ] Testes passam; `npm test` passa.
- [ ] `curl http://127.0.0.1:3011/api/atelie/library` responde com `sources` (só `casa` num checkout limpo).

## Não faça

- Não escreva na coleção nem nas expansões pelo servidor. Não liste arquivos do HD. Nada de CORS ainda (etapa 18).
