# Etapa 13 — Coleção da casa · elementos vetoriais

Leia antes: `00-LEIA-PRIMEIRO.md` (seção "A coleção da casa"), `etapa-12-colecao-papeis-e-texturas.md` (o gerador e o manifesto), `src/render/handout-render.js` (como uma camada de imagem é desenhada e como funciona `tint`), `src/data/handout-images.js`, `src/domain/noise.js`.

## Objetivo

Os objetos que dão vida a um documento, desenhados por código em SVG (nítidos em qualquer tamanho, leves, recoloríveis): carimbos, selos, clipes, grampos, alfinetes, fita adesiva, etiquetas, cantoneiras, lacres, molduras, ornamentos, divisórias, brasões genéricos, símbolos ocultos e marcas feitas à mão. Todos com licença própria, em `public/colecao/elementos/`.

## Como são feitos

- Cada família é um módulo em `scripts/colecao/vectors/<familia>.js` que exporta `items()` → `[{ id, name, category, tags, svg }]`, onde `svg` é a string do SVG. `scripts/colecao/build.js` (etapa 12) grava cada um em `public/colecao/elementos/<id>.svg` e acrescenta ao manifesto (`width`/`height` do `viewBox`).
- SVG sempre com `xmlns`, `viewBox`, `width` e `height` (o navegador precisa do tamanho para desenhar SVG num canvas); sem fontes nem `<text>`: **as letras dos carimbos são contornos** (`<path>`), desenhados com um alfabeto de traços próprio (não use biblioteca de fontes; nada de dependência nova) (`scripts/colecao/vectors/letters.js`: A–Z, 0–9, acentos comuns, `/`, `-`, `.`, como polilinhas sobre uma grade 5 × 7, engrossadas com `stroke-width` e `stroke-linecap="square"`). Fica com cara de carimbo de verdade, e é nosso.
- **Monocromáticos** em preto quando forem para recolorir (carimbos, ornamentos, símbolos, marcas): no ateliê, a cor vem do `tint` da camada (etapa 4). **Coloridos** quando a cor faz parte do objeto (clipe metálico, lacre, fita).
- "Feito à mão": use o ruído (`src/domain/noise.js`) para tremer pontos de contornos (± 0,4 % do tamanho), com `seed` por item. Nada perfeitamente geométrico, exceto o que é industrial (clipe, grampo).
- Carimbos com **tinta falhada**: uma `<mask>` com `feTurbulence` + `feComponentTransfer` (limiar) dentro do próprio SVG, com seed diferente por item.

## O conjunto (≈ 140 itens)

| Família | Itens | Categoria |
|---|---|---|
| Carimbos retangulares | CONFIDENCIAL, ULTRA SECRETO, SECRETO, ARQUIVADO, URGENTE, RECEBIDO, APROVADO, NEGADO, CÓPIA, ORIGINAL, CLASSIFICADO, PAGO, VERIFICADO, ARQUIVO MORTO, NÃO DIVULGAR, EVIDÊNCIA, CANCELADO, DEVOLVER AO REMETENTE (18) | Carimbos |
| Carimbos em branco | retângulo duplo, retângulo com cantos cortados, círculo duplo, oval, triângulo, data (moldura com dia/mês/ano vazios) (6): para pôr um texto com tinta **Carimbo** por cima | Carimbos |
| Selos circulares | SELO DO ARQUIVO, DEPARTAMENTO DE INVESTIGAÇÃO, CARTÓRIO, POSTAGEM (com texto em círculo), e 4 em branco com estrela, brasão, monograma e coroa (8) | Selos |
| Clipes, grampos, alfinetes | clipe prateado (3 ângulos), clipe dourado, clipe de pressão preto, grampo, dois grampos, alfinete de cabeça vermelha, tacha de quadro, prendedor de madeira (10) | Prendedores |
| Fita adesiva | 6 pedaços de fita crepe (comprimentos e pontas diferentes), 3 de fita transparente amarelada, 2 de fita isolante preta (11) | Fitas |
| Etiquetas e cantoneiras | etiqueta de pasta, etiqueta de arquivo com ilhós, etiqueta de evidência com campos, cantoneiras de foto (4 cantos, preto e dourado) (8) | Etiquetas |
| Lacres | lacre vermelho, verde, preto e dourado, cada um liso e com brasão (8) | Lacres |
| Molduras | vitoriana (3), art déco (2), medieval/iluminura (2), diploma (2), simples de fio duplo (2), polaroide (borda branca), foto antiga com borda serrilhada (13) | Molduras |
| Ornamentos e divisórias | fios de jornal (simples, duplo, grosso-fino), arabescos (4), cantos ornamentais (4), estrelas e losangos de separação (3) (14) | Ornamentos |
| Brasões e emblemas genéricos | escudo com águia, escudo com leão, escudo com chave, emblema de polícia genérico (estrela de seis pontas), emblema médico (bastão com serpente), emblema de universidade (livro e tocha) (6) — **fictícios**, sem nome de instituição real | Emblemas |
| Símbolos ocultos | 12 sigilos originais (combinações de círculos, linhas e letras inventadas), pentáculo, olho em triângulo, espiral, mãos, chave antiga, ampulheta (18) | Símbolos |
| Marcas à mão | círculo em volta (3), sublinhado (3), seta curva (4), X, ponto de interrogação, exclamação, risco sobre palavra (3), "?!" na margem, colchete de margem (2), estrela de destaque (19) | Marcas |

Todos os nomes, rótulos e tags em português. Nada de nomes, logotipos ou brasões de instituições reais.

## Prévias e folha de contato

- Prévia: rasterize o SVG com `sharp` (ele lê SVG) em 320 px, WebP.
- `docs/referencias/colecao-elementos.png`: folha de contato de todos, sobre o papel "Ofício creme · usado", com os monocromáticos em tinta azul-escura para ver como ficam recoloridos. Revise com atenção (traços, peso, se os carimbos parecem carimbos).

## Testes

- `tests/colecao-vectors.test.js`: todo item tem `id` com prefixo `casa-`, nome, categoria, e um SVG que começa com `<svg`, tem `xmlns`, `viewBox`, `width`, `height`, não contém `<text` (as letras são contornos), não contém `http:`/`https:` (nada externo), nem `<script`, `on…=` ou `<foreignObject`; ids únicos.
- `tests/colecao-letters.test.js`: o alfabeto cobre A–Z, 0–9, Ç, Ã, Õ, Á, É, Í, Ó, Ú, Â, Ê, Ô, `/`, `-`, `.`; `wordPath('CONFIDENCIAL')` tem largura proporcional ao número de letras.
- `tests/colecao-manifest.test.js` (da etapa 12) continua passando.
- `tests/e2e/handout-render.test.js` (acrescente): uma camada com um carimbo SVG da coleção e `tint` vermelho → pixels vermelhos dentro da caixa.

## Pronto quando

- [ ] Testes passam; `npm test` passa.
- [ ] Folha de contato revisada; no `progress.md`, o que foi refeito depois de olhar.
- [ ] Tamanho total dos SVG e prévias anotado no `progress.md`.
