# Etapa 1 — O projeto

Leia antes: `00-LEIA-PRIMEIRO.md`, `CONTRATO-TABLETOP.md` (só para saber que ele existe; nada dele é feito agora). Do Tabletop, **só para copiar**: `../Tabletop/package.json`, `../Tabletop/vite.config.js`, `../Tabletop/scripts/dev.js`, `../Tabletop/server/index.js`, `../Tabletop/server/storage.js`, `../Tabletop/src/ui/theme.css`, `../Tabletop/src/ui/fonts/`, `../Tabletop/src/ui/icons.js`, `../Tabletop/src/ui/controls.js`, `../Tabletop/tests/controls.test.js`, `../Tabletop/tests/theme.test.js`.

## Objetivo

Criar o projeto do Ateliê em `/home/ilvro/Documents/Projects/Atelie` (a pasta já tem `docs/plano/`): servidor Express, Vite, a mesma linguagem visual do Tabletop, testes funcionando, uma página que abre com o título do app. Nenhuma funcionalidade de documento ainda.

## Estrutura

```
Atelie/
  AGENTS.md
  progress.md
  README.md
  package.json
  vite.config.js
  index.html
  .gitignore
  scripts/
    dev.js                    # servidor + Vite juntos (cópia adaptada do Tabletop)
    library/                  # scripts de importação (etapas 22, 23, 25); por enquanto só um README.md
  server/
    index.js                  # escuta ATELIE_PORT (padrão 3011)
    app.js                    # createApp({ dataDir, libraryDir, allowedOrigins })
    paths.js                  # projectDir, dataDir, libraryDir
    storage.js                # cópia das partes usadas de ../Tabletop/server/storage.js
  src/
    main.js                   # monta a página
    ui/
      theme.css               # cópia de ../Tabletop/src/ui/theme.css
      fonts/                  # cópia de ../Tabletop/src/ui/fonts/ (Hanken Grotesk, OFL; mantenha o README)
      icons.js                # cópia (acrescente o ícone `doc` abaixo)
      controls.js             # cópia
      styles.css              # estilos do app; primeira linha: @import './theme.css';
  tests/
    controls.test.js          # cópia
    theme.test.js             # cópia dos testes de fonte mínima, contraste e "cores no tema" (sem o de paletas, que depende de ui-theme.js)
    privacy.test.js
    server.test.js
    e2e/shell.test.js
  data/                       # documentos e envios do usuário (criados em execução)
  public/colecao/             # coleção da casa: papéis, elementos, fontes e modelos próprios (VAI para o git e para o build)
  data-private/expansoes/     # expansões importadas, como o Arquivos Confidenciais (NÃO vai para o git)
```

## Arquivos, um por um

### `.gitignore`

```
node_modules/
dist/
test-results/
data-private/
.DS_Store
*.log
```

### `package.json`

```json
{
  "name": "atelie",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "node scripts/dev.js",
    "build": "vite build",
    "start": "node server/index.js",
    "test": "node --test tests/*.test.js",
    "test:e2e": "node --test --test-concurrency=1 tests/e2e/*.test.js",
    "library:elements": "node scripts/library/import-elements.js",
    "library:psd-report": "node --max-old-space-size=8192 scripts/library/psd-report.js",
    "library:psd-import": "node --max-old-space-size=8192 scripts/library/import-psd.js"
  },
  "dependencies": { "express": "4.22.1" },
  "devDependencies": { "vite": "7.3.6", "playwright": "1.58.2", "ag-psd": "30.2.0", "sharp": "0.35.5", "fflate": "0.8.3" }
}
```

As versões de `express`, `vite` e `playwright` são as do Tabletop (o navegador do Playwright já está no cache da máquina). Rode `npm install`.

### `server/paths.js`

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** The person's documents and uploads. */
export const defaultDataDir = (env = process.env) => path.resolve(env.ATELIE_DATA_DIR || path.join(projectDir, 'data'));
/** The house collection: papers, elements, fonts and templates of the Ateliê itself, tracked and published with the app. */
export const collectionDir = path.join(projectDir, 'public', 'colecao');
/** Expansions (private libraries such as the Arquivos Confidenciais): never tracked, never public. One folder per expansion. */
export const defaultExpansionsDir = (env = process.env) => path.resolve(env.ATELIE_EXPANSIONS_DIR || path.join(projectDir, 'data-private', 'expansoes'));
export const expansionDir = (id, env = process.env) => path.join(defaultExpansionsDir(env), id);
/** Origins allowed to read documents across origins (the Tabletop). */
export const defaultAllowedOrigins = (env = process.env) => (env.ATELIE_ALLOWED_ORIGINS || 'http://127.0.0.1:3001,http://localhost:3001,http://127.0.0.1:5173,http://localhost:5173').split(',').map(origin => origin.trim()).filter(Boolean);
```

### `server/app.js`

`export async function createApp({ dataDir = defaultDataDir(), expansionsDir = defaultExpansionsDir(), collection = collectionDir, allowedOrigins = defaultAllowedOrigins(), distDir = path.join(projectDir, 'dist') } = {})` que:

- cria `dataDir` se não existir;
- `GET /api/atelie/health` → `{ status: 'ok', app: 'atelie', contract: 1 }`;
- serve `dist/` como estático e devolve `dist/index.html` para rotas que não começam com `/api/` (como o Tabletop faz);
- trata erros como o Tabletop (`HttpError` → status e `{ error: { message } }`).

Guarde `dataDir`, `expansionsDir`, `collection` e `allowedOrigins` em `app.locals` para as próximas etapas.

### `server/index.js`

Igual ao do Tabletop, com `ATELIE_PORT` (padrão 3011) e mensagem `Ateliê em http://127.0.0.1:3011`.

### `vite.config.js`

`base: './'`, `server: { port: Number(process.env.ATELIE_UI_PORT ?? 5174), strictPort: false, proxy: { '/api': 'http://127.0.0.1:' + (process.env.ATELIE_PORT || 3011) } }`, `build: { outDir: 'dist' }`.

### `scripts/dev.js`

Cópia adaptada do `../Tabletop/scripts/dev.js`: troque `TABLETOP_*` por `ATELIE_*`, a porta 3001 por 3011, 5173 por 5174 e a rota de saúde por `/api/atelie/health`.

### `index.html` e `src/main.js`

Página com `<html lang="pt-BR">`, título "Ateliê de documentos", `<div id="app"></div>` e `src/main.js` que importa `./ui/styles.css` e mostra um título "Ateliê" e um parágrafo "Em construção" (a identidade visual chega na etapa 2). Fundo e cores pelos tokens do tema.

### `src/ui/icons.js`

Depois de copiar, acrescente ao objeto `paths`: `doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'`.

### `AGENTS.md`

```markdown
# Ateliê

- Plano e regras: docs/plano/00-LEIA-PRIMEIRO.md. Implemente uma etapa por vez.
- Mantenha progress.md atualizado: concluído, validação, pendências reais.
- A coleção da casa (public/colecao/) é do próprio Ateliê e vai para o git. Expansões, como o Arquivos Confidenciais, são privadas: nunca no git, em public/ ou em dist/; só em data-private/expansoes/.
- O app tem de ser completo sem expansão nenhuma.
- O contrato com o Tabletop está em docs/plano/CONTRATO-TABLETOP.md; não o mude sem mudar os dois lados.
```

### `README.md`

Três parágrafos: o que é; `npm install`, `npm run dev` e os endereços; onde ficam os dados, a coleção da casa e as expansões (e que o app funciona completo sem nenhuma expansão).

### git

`git init`, primeiro commit **só se o usuário pedir** (deixe tudo pronto e diga que falta o commit).

## Testes

`tests/privacy.test.js`:

- `.gitignore` contém `data-private/`;
- `defaultExpansionsDir({})` termina em `data-private/expansoes`; com `ATELIE_EXPANSIONS_DIR` usa o valor; `expansionDir('x', {})` termina em `data-private/expansoes/x`;
- `collectionDir` termina em `public/colecao` (a coleção da casa é pública de propósito);
- nenhum arquivo em `src/` contém `from 'ag-psd'`, `from 'sharp'` ou `from 'fflate'`;
- `vite.config.js` não menciona `data-private`.

`tests/server.test.js`: sobe `createApp` com pastas temporárias, `GET /api/atelie/health` responde `{ status: 'ok', app: 'atelie', contract: 1 }`; uma rota qualquer fora de `/api` devolve o `index.html`. Para isso `createApp` aceita também `distDir` (padrão `<projeto>/dist`), como no Tabletop; o teste passa uma pasta temporária com um `index.html` de teste.

`tests/e2e/shell.test.js` (Playwright com `--use-angle=swiftshader`, como os do Tabletop): a página abre, o título é "Ateliê de documentos", aparece a etiqueta "Ateliê", sem erros no console.

`tests/controls.test.js` e `tests/theme.test.js` copiados passam.

## Pronto quando

- [ ] `npm test` e `npm run test:e2e` passam.
- [ ] `npm run dev` abre a página em `http://127.0.0.1:5174` e `curl http://127.0.0.1:3011/api/atelie/health` responde.
- [ ] `git status` não mostra nada de `data-private/` mesmo com um arquivo de teste lá dentro.
- [ ] `npm run build` e `dist/` não contém `ag-psd`, `sharp` nem `fflate`.

## Não faça

- Nada de documento, editor ou importação. Não copie mais nada do Tabletop além do listado.
