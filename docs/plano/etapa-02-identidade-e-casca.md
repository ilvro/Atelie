# Etapa 2 — Identidade visual e casca da interface

Leia antes: `00-LEIA-PRIMEIRO.md`, **`PLANO-INTERFACE.md` (inteiro)**, `src/ui/theme.css`, `src/ui/styles.css`, `src/ui/icons.js`, `src/ui/controls.js`, `src/main.js`, `tests/theme.test.js`. Da Ficha, só leitura, para referência de comportamento: `../Ficha teste - Ordem II/src/workspace/workspace-sidebar.js` (`renderQuickSwitcherModal`, `renderQuickSwitcherResults`) e, em `../Ficha teste - Ordem II/src/app.js`, as funções de *toast* e de menu de contexto (procure `toast` e `custom-context-menu`).

## Objetivo

Dar ao Ateliê a sua cara e a estrutura de tela onde todas as próximas etapas vão morar: tokens e fontes próprios, primitivas (fita, carimbo, papel, bilhete), a mesa com a luminária, o trilho, as gavetas, o inspetor com abas, avisos, menu de contexto, a busca Ctrl+K (estrutura) e os Ajustes da mesa. Ainda **sem** documento: o centro mostra a mesa vazia com o estado vazio.

## 1. Fontes da interface

`scripts/fonts/fetch.js`: baixa fontes do repositório `google/fonts`, **no commit `e7db6ca603fd4862010383ff17ffd6cc4ffac1c0`**, a partir de uma lista em `scripts/fonts/fonts.json`, para uma pasta de destino, junto com o arquivo de licença da pasta (`OFL.txt` ou `LICENSE.txt`). Nesta etapa a lista tem só as duas fontes da interface; a etapa 14 acrescenta as da coleção.

```json
[
  { "family": "IM Fell English", "path": "ofl/imfellenglish", "files": ["IMFeENrm28P.ttf", "IMFeENit28P.ttf"], "license": "OFL.txt", "use": "ui" },
  { "family": "Courier Prime", "path": "ofl/courierprime", "files": ["CourierPrime-Regular.ttf", "CourierPrime-Bold.ttf"], "license": "OFL.txt", "use": "ui" }
]
```

- URL de cada arquivo: `https://raw.githubusercontent.com/google/fonts/<commit>/<path>/<arquivo>`.
- Destino das fontes `use: 'ui'`: `src/ui/fonts/<pasta>/`, com a licença. Elas entram no git (são livres; o app funciona offline).
- Grave em `scripts/fonts/fonts.lock.json` o SHA-256 de cada arquivo baixado; rodar de novo confere o SHA e não baixa o que já está igual.
- `@font-face` em `theme.css` para as duas (com `font-display: swap`).

## 2. Tokens e primitivas

- `src/ui/theme.css`: mantenha a camada `eco`; **remova** a camada `tt` (é do Tabletop) e crie a camada `at` exatamente como no `PLANO-INTERFACE.md`, seção 2. Defina `--at-font-display: 'IM Fell English', Georgia, serif;` e `--at-font-type: 'Courier Prime', 'Courier New', monospace;`.
- `src/ui/primitives.css` + `src/ui/primitives.js`: `.at-tape`, `.at-stamp`, `.at-card`, `.at-note`, `.at-desk`, `.at-btn` (e variantes), `.at-icon-btn`, `[data-tip]`, como na seção 3 do plano de interface. `primitives.js` exporta `tape(text)`, `stamp(text, { tone = 'ink' | 'wax' | 'uv', tilt })`, `card({ title, subtitle, image, id, attrs })`, `tiltOf(id)` (rotação estável de −0,8° a 0,8° por hash do id).
- O ruído das texturas (grão do papel, tinta falhada) é um SVG `feTurbulence` inline codificado em `data:` dentro do CSS; nada de imagem externa.
- Atualize `tests/theme.test.js` para os pares de contraste do plano: `--at-muted` sobre `--at-desk-2` ≥ 4,5; `--at-text` sobre `--at-desk` ≥ 12; `--at-uv-ink` sobre `--at-uv` ≥ 7; `--at-uv` sobre `--at-desk-2` ≥ 4,5; `--at-ink` sobre `--at-paper` ≥ 12; `--at-wax` sobre `--at-desk-2` ≥ 3. E o teste de fonte mínima passa a ler também `primitives.css`.

## 3. A casca (`src/ui/shell.js`)

```js
export function createShell(root, { onAction })
// → { desk: HTMLElement, inspector: { tab(name), panel(name) }, drawer: { open(name), close(), panel(name) }, rail: { setRecent(items), setActive(name) }, notify, contextMenu, palette }
```

- Layout da seção 5 do plano de interface: trilho (80 px), gaveta (360 px, fechada por padrão), mesa, inspetor (320 px) com abas Propriedades · Preencher · Camadas · Histórico (painéis vazios por enquanto, com texto "Abra um documento").
- **Trilho**: botões Mesa · Documentos · Biblioteca · Modelos · Leitura · Exportar; separador; lugar para os recentes (`setRecent([{ id, name, preview }])` mostra até 5 miniaturas de papel; vazio por enquanto); separador; Ajustes · Ajuda. Cada botão com `aria-label`, `data-tip` e `data-action`. O ativo com um traço `--at-uv` à esquerda.
- **Gavetas**: Documentos, Biblioteca, Modelos abrem a gaveta (só uma por vez; clicar de novo fecha; Esc fecha). Por enquanto com o título em `.at-tape` e um estado vazio.
- **Mesa** (`.at-desk`): textura da mesa + luminária; estado vazio no centro: ilustração SVG própria (uma folha em branco com um clipe, desenhada em `src/ui/illustrations.js`) e o texto "Nenhum documento aberto".
- **Rodapé discreto** na mesa (canto inferior esquerdo): espaço para o modo de armazenamento ("Salvando neste navegador") e mensagens de estado.

## 4. Avisos, menu de contexto, busca

- `src/ui/notify.js`: `notify(message, { tone = 'info' | 'ok' | 'error', action })` mostra um `.at-note` no canto superior direito, que cai e assenta (seção 4 do plano), some em 4 s (erros em 8 s, com botão fechar), empilha até 3, `role="status"` (`role="alert"` para erro). `action: { label, run }` vira um botão no bilhete.
- `src/ui/context-menu.js`: `contextMenu.open({ x, y, items: [{ label, icon, key, danger, run } | 'separator'] })`; fecha com Esc, clique fora e rolagem; navegável por setas e Enter; não sai da tela (reposiciona).
- `src/ui/palette.js` (Ctrl+K): modal centralizado como o da Ficha (capturas em `docs/referencias/`): campo de busca, lista com ícone, título, subtítulo e a tecla à direita; ↑ ↓ navegam, Enter executa, Esc fecha; rodapé com as dicas de teclado. Recebe provedores: `palette.register(provider)`, `provider(query) → [{ id, title, subtitle, icon, group, key, run }]`. Busca sem acento e sem maiúscula (`normalize('NFD')`), por palavras em qualquer ordem. Nesta etapa só há o provedor de **ações** da casca (abrir cada gaveta, Ajustes, Ajuda).

## 5. Ajustes (`src/ui/settings.js`)

Painel aberto pelo trilho: **Mesa** (Madeira escura, Feltro verde, Couro, Concreto, Preto liso — texturas procedurais geradas por código no próprio CSS/SVG, nenhuma imagem de terceiros), **Luminária** (força 0–100 % e calor: neutra / quente / vela), **Movimento** ("Reduzir animações", além do do sistema), **Unidades** (px / mm). Guarda em `localStorage` (`atelie-settings`), aplica na hora em variáveis CSS.

## 6. Capturas de referência

`scripts/capture.js` (Playwright): sobe o servidor e grava `docs/referencias/atelie-casca-<n>.png` (1600 × 950): casca vazia; gaveta aberta; Ctrl+K aberto; um aviso; um menu de contexto; Ajustes. Grave também, uma vez, as da Ficha (`ficha-principal.png`, `ficha-ctrl-k.png`): sirva o build dela com `npx vite preview --port 4791` na pasta dela, capture e pare o servidor.

## Testes

- `tests/theme.test.js` (atualizado, acima) e `tests/primitives.test.js`: `tiltOf` estável e dentro de ±0,8; `stamp('salvo')` gera o texto em maiúsculas e a classe do tom.
- `tests/palette.test.js`: o filtro sem acento encontra "Lixeira" com "lixe" e "Documentos" com "doc"; palavras fora de ordem funcionam.
- `tests/e2e/shell.test.js` (substitui o da etapa 1): trilho com todos os botões e rótulos; abrir e fechar cada gaveta (inclusive com Esc); Ctrl+K abre, filtra, Enter executa a ação "Abrir Ajustes"; `notify` aparece e some; menu de contexto abre com o botão direito numa área de teste, navega por setas e fecha com Esc; mudar a mesa nos Ajustes muda uma variável CSS e persiste depois de recarregar; com `prefers-reduced-motion: reduce` (Playwright `reducedMotion`), nenhuma animação roda (`getAnimations().length === 0` após abrir um aviso).

## Pronto quando

- [ ] Testes passam; `npm test` e os E2E passam.
- [ ] As capturas mostram a família da Ficha (fundo escuro, tipografia editorial, títulos como papel) e uma identidade própria (violeta, fita, carimbo, a mesa com luminária). Coloque lado a lado `atelie-casca-1.png` e `ficha-principal.png` e descreva em três linhas no `progress.md` o que é comum e o que é próprio.

## Não faça

- Nenhum documento, editor ou biblioteca ainda. Não use imagens de terceiros em nada da interface.
