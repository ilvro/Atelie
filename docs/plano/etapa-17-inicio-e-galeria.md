# Etapa 17 — Início e galeria de modelos

Leia antes: `00-LEIA-PRIMEIRO.md`, `PLANO-INTERFACE.md` (seções 1, 4 e 6), `src/ui/shell.js`, `src/ui/primitives.js`, `src/ui/illustrations.js`, `src/editor/editor.js`, `src/editor/navigator.js`, `src/data/api.js`, `public/colecao/library.json`.

## Objetivo

A primeira coisa que a pessoa vê tem de convidar a começar: modelos bonitos espalhados na mesa, as folhas em branco do tamanho certo, o que foi feito por último. E uma gaveta **Modelos** para escolher um ponto de partida a qualquer momento.

## Tela de início (`src/editor/start.js`)

Aparece na mesa quando não há documento aberto (e no botão **Mesa** do trilho com Ctrl, ou "Ir para o início" no Ctrl+K). Substitui o estado vazio da etapa 2.

```
        [fita] COMEÇAR
   ┌──────────┐  ┌────┐  ┌──────┐  ┌──────────────┐  ┌─────┐  ┌───┐
   │ A4       │  │Car-│  │Polar.│  │ Telegrama    │  │Bilh.│  │...│   folhas em branco, nas proporções reais
   └──────────┘  └────┘  └──────┘  └──────────────┘  └─────┘  └───┘
        [fita] CONTINUAR
   (até 6 documentos recentes, como papéis sobre a mesa)
        [fita] MODELOS                                   [ver todos →]
   (8 modelos em destaque, um de cada categoria, espalhados com rotações leves e sombra)
        [fita] EXPANSÕES   (só se houver)
   (um cartão por expansão: nome, quantos modelos e elementos, "Explorar")
```

- **Folhas em branco**: um `.at-card` por `PAGE_PRESETS`, desenhado na proporção da página (altura fixa de 120 px), com o nome em Courier Prime. Clicar cria o documento com a animação de abrir.
- **Continuar**: os recentes com a prévia; clicar abre.
- **Modelos em destaque**: um por categoria da coleção (escolha fixa por categoria, a primeira em ordem alfabética; a etapa 26 pode refinar), com o nome embaixo; clicar abre o modelo (cópia) e já na aba Preencher.
- Tudo navegável por teclado (setas entre cartões dentro de cada fileira, Tab entre fileiras).

## Gaveta Modelos (`src/editor/templates-drawer.js`)

- Busca, chips de **origem** (como na biblioteca) e chips de **categoria**.
- Grade de prévias maiores (2 colunas, 160 px de largura), com nome, categoria e um selo com o número de campos ("5 campos"). Modelos com verso mostram um pequeno "frente e verso".
- Clicar abre uma prévia grande dentro da gaveta, com **Usar este modelo** e a lista dos campos que ele tem.
- **Usar**: se o documento aberto tem alterações não arquivadas, o diálogo da etapa 7; depois abre a cópia (com o verso, se houver), na aba Preencher.

## Primeira visita

Na primeira abertura (`localStorage`, `atelie-welcome`), três bilhetes (`.at-note`) presos na mesa, por cima da tela de início, um de cada vez com "Próximo":

1. **Escolha um ponto de partida** — "Um modelo pronto ou uma folha em branco."
2. **Preencha** — "Os campos do modelo ficam na aba Preencher, à direita. Para ir além, cada elemento da página é uma camada que você move, troca e recolore."
3. **Leve para a mesa** — "Exporte em PNG, imprima, ou use no Tabletop, onde o documento vira uma carta que os jogadores pegam para ler."

"Pular" fecha os três. Com movimento reduzido, sem animação.

## Testes

- `tests/e2e/start.test.js`: sem documento aberto, a tela de início mostra uma folha por tamanho, os modelos em destaque e (depois de criar um documento) a fileira Continuar; clicar numa folha "Polaroide" cria 880 × 1070; clicar num modelo abre a cópia com a aba Preencher; a gaveta Modelos filtra por categoria e mostra os campos na prévia; a primeira visita mostra os três bilhetes uma única vez; com uma expansão de teste, aparece a fileira Expansões.

## Pronto quando

- [ ] Testes passam; `npm test` e os E2E passam.
- [ ] Captura `docs/referencias/atelie-inicio.png` (primeira visita) e `atelie-inicio-2.png` (com recentes). Compare com a `ficha-principal.png`: o início tem de dar vontade de começar.
