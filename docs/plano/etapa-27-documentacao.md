# Etapa 27 — Documentação e ajuda

Leia antes: `00-LEIA-PRIMEIRO.md` (inteiro, inclusive a tabela "Andamento"), `PLANO-INTERFACE.md`, `CONTRATO-TABLETOP.md`, `README.md`, `progress.md`, `src/ui/shell.js`, `src/ui/palette.js`.

## Objetivo

Deixar o Ateliê fácil de usar sem ninguém explicar, e fácil de manter: ajuda dentro do app, um guia de uso, um guia de manutenção da coleção e das expansões, e o registro de licenças de tudo o que é distribuído.

## Ajuda no app (`src/ui/help.js`)

Botão **Ajuda** do trilho (tecla **?** fora de campos) abre uma gaveta com:

- **Como começar** — os três passos da primeira visita (etapa 17), com um botão "Mostrar de novo".
- **Atalhos** — tabela gerada de uma lista única `src/ui/shortcuts.js` (a mesma usada nas dicas `data-key` e no Ctrl+K; um teste confere que cada atalho listado tem quem o trate).
- **Camadas e mesclagem** — uma frase por modo útil para papel (multiplicação para manchas e texto sobre papel; sobrepor e luz suave para amassados; divisão de tela para luz; recorte para colocar algo só dentro de outra camada).
- **Luz UV** — o que é e como criar uma camada que só aparece sob ela.
- **Usar no Tabletop** — o que a etapa 28 permite, e o endereço do Ateliê que o Tabletop deve usar.
- **Coleção e expansões** — o que vem com o app e como uma expansão se instala (link para `docs/MANUTENCAO.md` no modo servidor).

Cada seção com o título em `.at-tape`. Busca no topo filtra as seções.

## Documentação

1. `docs/USO.md`: o que é; começar por um modelo; Preencher; camadas (tipos, ordem, mesclagem, recorte, opacidade, travar); texto e tintas; imagens enviadas; biblioteca e favoritos; efeitos; luz UV; documentos, pastas, rascunho, versões e lixeira; modo leitura; exportar e imprimir; o endereço `?handout=`; atalhos; limites conhecidos.
2. `docs/MANUTENCAO.md`: como regenerar a coleção da casa (`npm run colecao:texturas`, o build de elementos e fontes, `colecao:modelo`) e o orçamento de 60 MB; como instalar e reimportar uma expansão (comandos das etapas 22 e 25, com os tempos e tamanhos medidos registrados no `progress.md`); onde fica cada arquivo; como ler os relatórios; o que fazer com um modelo marcado `revisar`; o aviso de que expansões são privadas.
3. `docs/LICENCAS.md`: tudo o que é distribuído (código, coleção da casa, fontes com a licença de cada uma, Hanken Grotesk), gerado a partir dos manifestos por `scripts/licenses.js`.
4. `README.md`: link para os três, e uma captura da tela de início.
5. `CONTRATO-TABLETOP.md`: no fim, a lista "qual teste cobre qual linha" (se a etapa 18 não deixou pronta).

## Testes

- `tests/shortcuts.test.js`: cada atalho de `shortcuts.js` aparece num manipulador de teclado (procure a tecla no código dos módulos indicados pela própria lista, campo `handledIn`).
- `tests/licenses.test.js`: `docs/LICENCAS.md` está atualizado (gerar de novo não muda o arquivo); toda fonte tem licença; todo item da coleção tem `license`.
- `tests/e2e/help.test.js`: **?** abre a ajuda; a busca "uv" mostra a seção Luz UV; "Mostrar de novo" reabre os bilhetes da primeira visita.

## Pronto quando

- [x] Testes passam; `npm test` e os E2E passam.
- [x] A tabela "Andamento" de `00-LEIA-PRIMEIRO.md` está completa até a 27.
