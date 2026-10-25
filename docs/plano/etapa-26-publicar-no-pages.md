# Etapa 26 — Publicar no GitHub Pages

Leia antes: `00-LEIA-PRIMEIRO.md` (seção "Onde os apps rodam"), `CONTRATO-TABLETOP.md` (seções 0 e 3), `vite.config.js`, `package.json`, `src/data/api.js`, `src/data/exchange.js`. Do Tabletop, só para copiar o modelo: `../Tabletop/.github/workflows/pages.yml`, `../Tabletop/vite.config.js` (o modo `pages`), `../Tabletop/docs/GITHUB_PAGES.md`, `../Tabletop/tests/e2e/pages.test.js` (servidor estático de teste sob um subcaminho).

## Objetivo

Publicar o Ateliê como site estático no GitHub Pages da mesma conta do Tabletop (`https://<conta>.github.io/Atelie/`), completo com a coleção da casa, funcionando sem servidor e se integrando ao Tabletop publicado pelo caminho A do contrato.

## Build do Pages

- `vite.config.js` com `mode === 'pages'`: `define` de `import.meta.env.VITE_ATELIE_STORAGE` como `'browser'`, `outDir: 'dist-pages'`, `base: './'` (o caminho do repositório não é fixado no código). Acrescente `dist-pages/` ao `.gitignore`.
- `package.json`: `"build:pages": "vite build --mode pages"` e `"preview:pages": "vite preview --outDir dist-pages --host 127.0.0.1"`.
- A coleção da casa (`public/colecao/`) vai inteira para o build. **Nada** de `data-private/` (confira no teste).
- O site não pode depender de nada fora dele: fontes, ícones, coleção, tudo com URL relativa.

## Workflow (`.github/workflows/pages.yml`)

Cópia adaptada do Tabletop: nome "Publicar Ateliê no GitHub Pages", `npm ci`, `npm test`, `npm run build:pages`, `actions/upload-pages-artifact` com `path: dist-pages`, e o job `deploy` com `actions/deploy-pages`. Mesmas versões de ações que o Tabletop usa.

## Conferências no próprio site

- Na primeira abertura no Pages, o modo navegador pede `navigator.storage.persist()` só quando a pessoa arquivar algo (etapa 6), e os Ajustes mostram o espaço usado.
- O rodapé da mesa diz "Salvando neste navegador"; a Ajuda (etapa 27) explica que os documentos ficam neste navegador e como exportá-los (PNG) ou fazer uma **cópia de segurança**: Ajustes → **Exportar tudo** (um arquivo `.json` com todos os documentos e envios em base64) e **Importar** (mescla, sem apagar o que existe; documentos com o mesmo id e revisão menor são ignorados). Implemente essas duas ações nesta etapa (`src/data/backup.js`, testado).
- O banco de troca (`mesa-handouts-v1`) funciona igual no Pages: é da origem `https://<conta>.github.io`, compartilhada com o Tabletop publicado.

## Documentação

`docs/GITHUB_PAGES.md`: como publicar (Settings → Pages → Source: GitHub Actions), onde ficam os dados (no navegador; por origem e caminho), cópia de segurança, como o Tabletop publicado na mesma conta encontra o Ateliê (o endereço irmão `../Atelie/`), e o que **não** vai para o site (expansões).

## Testes

- `tests/backup.test.js`: exportar e importar ida e volta; importar não apaga; revisão menor ignorada.
- `tests/e2e/pages.test.js`: um servidor estático (Express) serve `dist-pages/` sob `/Atelie/` **e**, sob `/Tabletop/`, uma página mínima de teste na mesma origem. No Ateliê: abrir, criar um documento a partir de um modelo da coleção, arquivar, recarregar (continua lá); `fetch('colecao/library.json')` funciona sob o subcaminho; nenhum pedido a `/api/` falha de forma visível (o modo é `browser`). Na página `/Tabletop/` de teste: abrir `mesa-handouts-v1` e encontrar o documento arquivado com o assado; receber `handout-saved` pelo `BroadcastChannel` ao arquivar de novo.
- `tests/pages-build.test.js` (roda depois do build): `dist-pages/` não contém nenhum arquivo cujo caminho tenha `data-private` nem itens com id `ac-`; o tamanho total fica abaixo de 80 MB.

## Pronto quando

- [x] Testes passam; `npm test` e os E2E passam.
- [ ] Publicado de verdade na conta do usuário (quando ele pedir o push): o site abre em `https://<conta>.github.io/Atelie/`, a coleção aparece, um documento arquivado sobrevive a fechar o navegador, e o Tabletop publicado na mesma conta o enxerga em "Do ateliê…" (depois da etapa 28).
