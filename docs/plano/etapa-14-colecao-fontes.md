# Etapa 14 — Coleção da casa · fontes livres

Leia antes: `00-LEIA-PRIMEIRO.md`, `scripts/fonts/fetch.js` e `scripts/fonts/fonts.json` (etapa 2), `etapa-06-armazenamento.md` (item `font` do manifesto), `src/data/handout-fonts.js`, `scripts/colecao/build.js`.

## Objetivo

Um conjunto de fontes de licença livre (OFL ou Apache 2.0), auto-hospedadas, que cubra o que um documento de RPG precisa: máquina de escrever, letra à mão, impressão antiga, jornal e cartaz, gótica, estêncil e tela de computador. Com elas, todo modelo próprio (etapa 16) fica bonito sem fonte de terceiros.

## As fontes

Todas no repositório `google/fonts`, commit `e7db6ca603fd4862010383ff17ffd6cc4ffac1c0` (as pastas abaixo foram conferidas em 24/10/2026):

| Categoria | Família | Pasta |
|---|---|---|
| Máquina de escrever | Courier Prime | `ofl/courierprime` |
| | Special Elite | `apache/specialelite` |
| | Cutive Mono | `ofl/cutivemono` |
| Letra à mão | Caveat | `ofl/caveat` |
| | Kalam | `ofl/kalam` |
| | Homemade Apple | `apache/homemadeapple` |
| | Reenie Beanie | `ofl/reeniebeanie` |
| | Nothing You Could Do | `ofl/nothingyoucoulddo` |
| | Dawning of a New Day | `ofl/dawningofanewday` |
| | Rock Salt | `apache/rocksalt` |
| Marcador | Permanent Marker | `apache/permanentmarker` |
| Impressão antiga | IM Fell English | `ofl/imfellenglish` |
| | IM Fell DW Pica | `ofl/imfelldwpica` |
| | Old Standard TT | `ofl/oldstandardtt` |
| | Libre Baskerville | `ofl/librebaskerville` |
| | Cormorant Garamond | `ofl/cormorantgaramond` |
| | Playfair Display | `ofl/playfairdisplay` |
| Jornal e cartaz | Bebas Neue | `ofl/bebasneue` |
| | Oswald | `ofl/oswald` |
| | Anton | `ofl/anton` |
| Gótica | UnifrakturMaguntia | `ofl/unifrakturmaguntia` |
| | Pirata One | `ofl/pirataone` |
| Estêncil e militar | Stardos Stencil | `ofl/stardosstencil` |
| | Black Ops One | `ofl/blackopsone` |
| Tela de computador | VT323 | `ofl/vt323` |
| | Share Tech Mono | `ofl/sharetechmono` |

## Baixar

- Amplie `scripts/fonts/fetch.js`: para entradas com `"files": "*"`, liste a pasta pela API (`https://api.github.com/repos/google/fonts/contents/<pasta>?ref=<commit>`) e baixe todos os `.ttf` (estáticos e variáveis, como `Oswald[wght].ttf`). Sem `GITHUB_TOKEN`, a API tem limite de 60 pedidos por hora: faça uma listagem por pasta e guarde a lista em `fonts.lock.json`; execuções seguintes usam a lista guardada.
- Acrescente as 26 famílias a `fonts.json` com `"use": "colecao"` e `"category"`. Destino: `public/colecao/fontes/<pasta>/` (cada uma com o seu `OFL.txt` ou `LICENSE.txt`).
- `public/colecao/fontes/LICENCAS.md`: tabela família · licença · origem (URL da pasta no commit).

## Ler os nomes (`scripts/lib/font-names.js`)

Crie aqui (a etapa 22 vai reutilizar):

```js
/** Family, style and names of a TrueType/OpenType font from its 'name', 'OS/2' and 'fvar' tables; null if it is not one. */
export function readFontNames(buffer)
// → { family, subfamily, postscript, fullName, weight, italic, variable: { axes: [{ tag, min, default, max }] } | null }
// family: nameID 16 se existir, senão 1; subfamily: 17 ou 2; postscript: 6; fullName: 4.
// Prefira registros platformID 3 (UTF-16BE, languageID 0x0409); na falta, platformID 1 (Mac Roman).
// weight: OS/2.usWeightClass (padrão 400); italic: bit 0 de OS/2.fsSelection; variable: eixos da tabela 'fvar', se houver.
// Assinaturas aceitas: 0x00010000, 'true', 'OTTO'. Coleções 'ttcf' → null.
```

## Manifesto

`scripts/colecao/build.js` acrescenta um item `font` por arquivo: id `casa-font-<slug do postscript>`, `name` = `fullName`, `category` da tabela, `family`, `postscript`, `weight`, `style`, `variable` (eixos), `license` (`OFL-1.1` ou `Apache-2.0`, conforme o arquivo de licença da pasta), `file`. Fontes variáveis: um item só, com os eixos; o editor (etapa 7) passa a oferecer, para elas, um campo de peso contínuo dentro de `min..max`.

## No editor

O select de fonte das Propriedades (etapa 7) passa a ser um **seletor próprio** (como o `custom-select.js` da Ficha): lista agrupada por categoria, cada nome escrito **na própria fonte**, busca no topo, as 5 usadas por último em cima. Carregue cada fonte só quando o item entra na tela (`IntersectionObserver` + `fonts.load`).

## Testes

- `tests/font-names.test.js`: com uma fonte mínima montada no próprio teste (cabeçalho sfnt + tabelas `name`, `OS/2` e `fvar` só com os campos usados): família, PostScript, peso 700, itálico, eixo `wght` 100–900; buffer qualquer → `null`. E, se existirem, as fontes reais de `public/colecao/fontes/`: cada uma tem família e PostScript.
- `tests/colecao-fonts.test.js`: toda fonte do manifesto tem arquivo e licença ao lado; `license` ∈ { `OFL-1.1`, `Apache-2.0` }; as 26 famílias estão presentes; `LICENCAS.md` lista todas.
- `tests/e2e/editor.test.js` (acrescente): o seletor de fonte mostra "Special Elite" escrito na própria fonte (a largura do nome é diferente da mesma palavra em Hanken Grotesk); escolher uma fonte manuscrita muda o canvas.

## Pronto quando

- [ ] Testes passam; `npm test` passa.
- [ ] Captura `docs/referencias/colecao-fontes.png`: uma página do ateliê com uma linha em cada fonte, agrupadas por categoria.
- [ ] Tamanho das fontes anotado no `progress.md` (o orçamento da coleção é 60 MB no total).
