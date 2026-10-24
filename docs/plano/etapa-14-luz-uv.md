# Etapa 14 — Luz UV

Leia antes: `00-LEIA-PRIMEIRO.md`, `src/domain/handouts.js`, `src/render/handout-render.js`, `src/editor/editor.js`, `src/editor/layers-panel.js`, `src/editor/properties-panel.js`, `src/editor/bake.js`.

## Objetivo

Um documento pode ter um texto ou marca que só aparece sob luz ultravioleta (como os pacotes "com Luz UV" do *Arquivos Confidenciais*). No editor, a pessoa vê e edita as duas versões; o assado UV (etapa 13) passa a ter o visual completo. A luz UV **na mesa**, durante a inspeção no Tabletop, é a etapa 18.

## Formato

Em `src/domain/handouts.js`, a página ganha um campo opcional:

```js
page: { width, height, background, uv: { tint: '#2b1d52', strength: .65 } }
// Como a página "escurece" sob UV, antes das camadas UV: tudo o que já foi desenhado é multiplicado pela cor `tint` com força `strength` (0–1).
// Ausente = { tint: '#2b1d52', strength: .65 }. Os modelos importados de pacotes UV (que já trazem o próprio visual UV) usam strength: 0.
```

Valide (`#rrggbb`, 0–1) e acrescente o teste. Se a etapa 12 já foi feita, ela passa a gravar `strength: 0` nos modelos com camadas `light: 'uv'` (mude o importador e o teste dela).

## Renderização sob UV

Em `renderHandout(…, { light: 'uv' })`:

1. Desenhe as camadas `both` (e não as `normal`), em ordem, **exceto** as `uv`.
2. Aplique o escurecimento: `multiply` com `tint` e `globalAlpha = strength` sobre a página inteira.
3. Desenhe as camadas `uv` na ordem do documento, cada uma com seu modo e opacidade.

(Isso muda a regra 2 da etapa 3: camadas `uv` passam a ser desenhadas depois, mesmo que estejam no meio da lista. Ajuste e teste.)

## No editor

- Botão **Luz UV** no cabeçalho (`aria-pressed`) e tecla **U** (fora de campos de texto): o palco renderiza com `light: 'uv'` e a moldura do palco fica roxa (`--uv: #7a3cff` em `src/ui/editor.css`).
- Com a luz UV ligada, camadas novas entram com `light: 'uv'`; desligada, com `both`.
- Na lista de camadas, as camadas `uv` têm um selo "UV" roxo; as `normal`, um selo "sem UV".
- Sem camada selecionada, as Propriedades mostram a **página**: tamanho (só leitura), fundo, e **Escurecer sob UV** (cor e força).
- Exportar (etapa 16, se já existir) ganha a opção "Sob luz UV".

## Testes

`tests/handouts.test.js` (acrescente): `page.uv` válido e inválido.

`tests/e2e/handout-render.test.js` (acrescente): documento com um retângulo cinza `both` e um texto `uv` branco: com `light: 'normal'` o texto não aparece; com `'uv'` a página escurece (pixel do fundo mais escuro e mais roxo que o original) e o texto aparece claro; uma camada `uv` **no meio** da lista é desenhada por cima do escurecimento.

`tests/e2e/editor.test.js` (acrescente): U liga a luz UV (o pixel do fundo escurece); uma camada criada com a luz ligada fica `light: 'uv'`; salvar gera também o assado UV (`hasUv: true` na lista).

## Pronto quando

- [ ] Testes passam; `npm test` passa.
- [ ] Com a etapa 12 feita: um modelo do `Bundle 59` mostra o texto escondido ao ligar a luz UV no editor.

## Não faça

- Nada no Tabletop. A lanterna UV de personagem iluminando documentos na mesa fica como pendência.
