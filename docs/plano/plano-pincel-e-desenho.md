# Plano · Pincel com texturas e conforto no desenho

Escrito em 28/10/2026, depois da Fase 14 do `plano-qualidade-de-vida.md`. Segue as regras de `docs/plano/00-LEIA-PRIMEIRO.md` e do `AGENTS.md`:

- Faça **uma fase por vez**, na ordem. Cada fase precisa ter teste.
- **Não faça commit.** Ao fim de cada fase, informe o que foi feito, como foi validado e o que ficou pendente. Atualize o `progress.md` e sugira uma mensagem de commit em inglês.
- A interface segue o `PLANO-INTERFACE.md`: tokens `--at-*`/`--eco-*`, textos em pt-BR, respeito a `body.reduce-motion` e `prefers-reduced-motion`.
- Não mexa no contrato com o Tabletop. O Tabletop recebe só PNGs assados (`CONTRATO-TABLETOP.md`, §1), então os dados novos de pincel não o afetam.

## Situação das fases

| Fase | Tema | Situação |
|---|---|---|
| 1 | Pontas do pincel: lápis, giz, pena, pincel seco e marca-texto | feita em 28/10/2026 |
| 2 | Painel de Propriedades para traços de pincel (inclui 2 bugs) | feita em 28/10/2026 |
| 3 | Estabilizador de traço | feita em 28/10/2026 |
| 4 | Borracha de traço | a fazer |
| 5 | Atalhos e tintas de época na faixa do pincel | a fazer |

## O que o código tem hoje

| Peça | Onde | Observação |
|---|---|---|
| Dados do traço | `src/domain/brush.js` | Pontos `[x, y, pressão]` normalizados de 0 a 1 no box da camada. `null` separa traços. No máximo 20 000 pontos. |
| Desenho do traço | `src/render/handout-path.js` (`drawPathShape`) | Tem só um visual. Cada segmento é uma `quadraticCurveTo` com `lineCap: 'round'`, e a largura segue a pressão (`pressureFactor`). |
| Chamada do render | `src/render/handout-render.js:295` | `type === 'path'` chama `drawPathShape(ctx, layer.shape, w, h, scale)`, com o ctx já centrado e girado. |
| Ferramenta e prévia | `src/editor/draw-tools.js` | As opções ficam em `localStorage['atelie-tool-options']` (`DEFAULT_OPTIONS`). A prévia ao vivo usa o mesmo `drawPathShape`. |
| Criação da camada | `src/editor/editor.js:1697-1715` | `shapeLayer({ shape: { type: 'path', fill: null, stroke, strokeWidth, points } })`. O Shift no início do gesto acrescenta o traço à camada selecionada (`appendStroke`). |
| Validação | `src/domain/handouts.js:684-707` | |
| Duplicar com variação | `src/domain/handouts.js:136` (`varyLayer`) | Gera semente nova para efeito e tinta de texto. O pincel ainda não tem semente. |
| Ruído determinístico | `src/domain/noise.js` | `mulberry32`, `hash2D`, `valueNoise2D`, `fbm`. |
| Cache de render | `src/render/handout-effects.js:65` (`effectCache`, `getEffectCanvas`) | Use o mesmo padrão para as texturas do pincel. |
| Painel de forma | `src/editor/properties-panel.js:640-660` | Ver Fase 2: o painel trata o traço como retângulo. |
| Tutorial | `src/tutorial/lessons.js:181` (`draw-brush`) | |

---

## Fase 1 · Pontas do pincel

O objetivo é um traço que pareça feito com o material de verdade, e não uma linha vetorial lisa com outra cor.

### Pontas

| id | Nome na UI | Visual esperado | Padrões ao escolher |
|---|---|---|---|
| `pen` | Caneta | O traço de hoje, liso e redondo. É o padrão e o valor de quem não tem `brush`. | cor da ferramenta |
| `pencil` | Lápis | Grafite: grão fino que deixa o papel aparecer, borda levemente irregular. Pouca pressão deixa o traço mais claro, não só mais fino. | sugerir `#4a4a4f`, espessura 3 |
| `chalk` | Giz / carvão | Grão grosso com falhas grandes e borda bem áspera. Com pressão alta, cobre mais. | espessura 14 |
| `nib` | Pena (nanquim) | Ponta chata a 40°: o traço fica largo na diagonal e fino na outra direção, como em caligrafia. Borda nítida, sem grão. | `#15131a` |
| `drybrush` | Pincel seco | 5 a 9 "cerdas" paralelas ao traço, cada uma com falhas e um pequeno desvio lateral. | espessura 18 |
| `marker` | Marca-texto | Ponta chata, cor translúcida, mistura `multiply`. As sobreposições do mesmo traço não escurecem. | `#f2d23c`, opacidade 45%, espessura 18 |

Os "padrões ao escolher" só valem quando a pessoa troca de ponta na faixa. Guarde a cor e a espessura de cada ponta em `options.brushes[kind]`, para que voltar ao lápis devolva o lápis como ela o deixou. Não sobrescreva o que ela ajustou.

### Dados

Acrescente um campo opcional a `shape` quando `type === 'path'`:

```js
brush: { kind: 'pencil', grain: 0.5, seed: 4821 }   // grain 0–1: quanto o grão "come" do traço
```

- **Sem `brush`, o resultado é `pen`.** Todo documento existente continua igual, e nenhuma migração é necessária.
- Validação em `handouts.js`:
  - `kind` deve estar na lista;
  - `grain` é um número entre 0 e 1;
  - `seed` é um inteiro.
  - Exporte a lista como `BRUSH_KINDS` em `src/domain/brush.js` e use-a também na UI.
- `varyLayer`: se `layer.shape?.brush`, gere uma semente nova, como já faz com `ink`.
- O `appendStroke` (Shift) mantém o `brush` da camada alvo. O traço novo herda a ponta da camada, não a da ferramenta. Comente isso no código, porque é um detalhe que surpreende.

### Render

Em `handout-path.js`, `drawPathShape` passa a escolher o desenho pela ponta:

```js
export function drawPathShape(ctx, shape, w, h, scale) {
  const kind = shape.brush?.kind ?? 'pen';
  if (kind === 'pen') return drawSmooth(ctx, shape, w, h, scale);   // o código atual, sem mudança
  ...
}
```

Regras que valem para todas as pontas texturizadas:

1. **Determinismo.** Use somente `mulberry32(seed)` e `hash2D`/`valueNoise2D` de `noise.js`, sem `Math.random`. O mesmo documento precisa sair igual na tela, no assado (worker) e no PNG de 2048 px.
2. **O grão fica no espaço da página.** A frequência do ruído é em px de página (`x / scale`), não em px do canvas. Assim, o zoom e a exportação em alta resolução mostram o mesmo grão, só que mais nítido. O tamanho do grão não pode mudar com o zoom.
3. **Desenhe primeiro, depois aplique a textura.** Desenhe o traço sólido num canvas fora da tela do tamanho do box. Use alfa por ponto quando a ponta pedir, como no lápis, em que a pressão define a cobertura. Depois aplique a máscara de grão com `globalCompositeOperation = 'destination-out'` e copie o resultado para o `ctx`. Desse jeito, as sobreposições dentro de uma camada não acumulam alfa, o que importa no marca-texto.
4. **Borda irregular** (lápis e giz): desloque a largura de cada amostra por `fbm` ao longo do comprimento do traço, com amplitude de cerca de 15% no lápis e 35% no giz.
5. **Pena:** para cada segmento, calcule a largura com `max(0.12, |sin(ângulo − 40°)|) × base × pressão` e preencha um quadrilátero entre as bordas, sem `stroke()`, para não aparecer a emenda redonda.
6. **Pincel seco:** N cerdas com deslocamento perpendicular fixo, sorteado pela semente. Cada cerda é um traço fino com falhas, em que `valueNoise2D` ao longo do comprimento apaga trechos.
7. **Cache:** um mapa no mesmo padrão de `effectCache`, com chave `JSON.stringify([shape.points.length, shape.brush, shape.stroke, shape.strokeWidth, w, h, scale])` mais um hash barato dos pontos. Limite o mapa a cerca de 64 entradas e descarte a mais antiga. Sem cache, arrastar uma camada de giz refaz o ruído a cada quadro.
8. **Ambiente:** o render roda no navegador, no worker de assar (`bake.js`) e nos testes do Node. Para criar o canvas fora da tela, use a mesma função de `handout-text.js` (`createOffscreenCanvas`). Mova-a para um módulo comum se precisar usá-la nos dois lugares, sem duplicar o código. Se não houver canvas, como no ctx falso dos testes, caia em `drawSmooth`.

A prévia ao vivo, em `draw-tools.js` `drawPreview`, passa a enviar `brush: { kind, grain, seed: gesture.seed }`. Sorteie `gesture.seed` no `pointerdown` e mande-o em `onDraw`, para que a camada criada fique **idêntica** à prévia. Se o giz ficar pesado demais na prévia, desenhe um `drawSmooth` translúcido durante o arraste e a textura só ao soltar. Meça antes de decidir: a meta é 60 qps (Fase 3 do plano anterior).

### Interface

- Na faixa de opções do pincel (`renderStrip`), antes de Cor, entra uma fileira de 6 botões de ponta com ícone e `title`. Ela segue o padrão visual dos botões da barra (`stage-tool-btn`), em tamanho menor. Use `aria-pressed`.
- Quando a ponta não é `pen` nem `nib`, aparece o controle "Grão", de 0 a 100.
- Os ícones vão em `src/ui/icons.js`, no mesmo traço dos outros: grafite, giz, pena, pincel e marca-texto.
- O nome da camada criada segue a ponta: "Lápis", "Giz", "Pena", "Pincel seco", "Marca-texto". "Pincel" fica reservado para a caneta, para não quebrar o tutorial.
- O `marker` cria a camada com `blend: 'multiply'`. O `BLEND_MODES` já existe em `handouts.js`.

### Testes

- `tests/brush.test.js`:
  - validação de `brush`, aceitando e recusando valores;
  - um documento sem `brush` continua válido;
  - `varyLayer` troca a semente;
  - `appendStroke` mantém o `brush`.
- Teste de render no Node, no padrão de `tests/handout-render.test.js`:
  - a mesma semente gera os mesmos pixels;
  - outra semente gera pixels diferentes;
  - o `pencil` tem cobertura menor que o `pen` com os mesmos pontos, contando pixels com alfa acima de 0;
  - o `marker` sobre o próprio traço não escurece o cruzamento.
- E2E em `tests/e2e/draw-tools.test.js`: escolher Giz, desenhar e conferir que a camada tem `shape.brush.kind === 'chalk'` e que há pixels com alfa parcial no meio do traço.
- **Validação visual (obrigatória):**
  - Gere uma folha de contato com as 6 pontas, cada uma em 3 pressões, sobre o papel "Ofício creme · usado". Siga o modelo de `scripts/colecao/contact-sheet.js` e salve em `docs/referencias/pincel-pontas.png`.
  - Olhe a imagem e compare com lápis, giz e nanquim reais. Se o lápis parecer "linha cinza pontilhada", o grão está errado.

---

## Fase 2 · Propriedades de um traço de pincel

O levantamento encontrou dois bugs em `properties-panel.js:640-660`:

| Achado | Efeito |
|---|---|
| O campo "Tipo" oferece só Retângulo, Elipse e Linha. O traço não aparece na lista. | Ao selecionar um traço, o select mostra uma opção errada. Se a pessoa mexer nele, o `path` vira retângulo e os pontos ficam órfãos. |
| A espessura vai até 50 no painel e até 200 na ferramenta (`draw-tools.js`) e na validação. | Um traço de 120 px abre no painel com o valor cortado, e editá-lo reduz a espessura. |

O que fazer:

- Para `shape.type === 'path'`, o grupo passa a se chamar "Traço" e mostra:
  - a ponta, com os mesmos 6 botões da Fase 1;
  - Grão (para as pontas que têm grão);
  - Cor (`shape.stroke`);
  - Espessura de 1 a 200;
  - um botão "Nova variação", que sorteia outra semente com o rótulo de desfazer "Variar traço".
- O grupo de traço esconde Tipo, Preenchimento e Arredondamento.
- Para as outras formas, o max da espessura passa a ser 200.
- Teste: um teste unitário ou e2e mostrando que, com um path selecionado, o painel não oferece "Tipo" e que a troca de ponta grava em `shape.brush.kind`.

---

## Fase 3 · Estabilizador de traço

Com o mouse, assinaturas e letras à mão saem tremidas. Um estabilizador do tipo "corda" (lazy brush) resolve.

- Pura em `brush.js`: `stabilize(prev, target, radius)` devolve o novo ponto do pincel. Se a distância até o cursor for menor que `radius`, o pincel não se move. Se for maior, ele anda o excedente na direção do cursor.
- A opção `smooth` fica em `DEFAULT_OPTIONS`, de 0 a 100, com padrão 0 para não mudar o comportamento atual. Ela vira `radius = smooth × 0.3` px de página, dividido pelo zoom.
- Na faixa do pincel: controle "Suavizar". Com valor acima de 0, a prévia desenha uma linha fina tracejada entre o cursor e a ponta do pincel, para a pessoa ver a corda.
- No `pointerup`, acrescente o ponto final do cursor, para o traço não ficar curto.
- Testes:
  - `stabilize` com raio 0 é a identidade;
  - dentro do raio, o ponto não se move;
  - uma sequência em zigue-zague sai com amplitude menor.

---

## Fase 4 · Borracha de traço

Hoje, apagar parte de um traço exige Ctrl+Z ou excluir a camada inteira. A borracha trabalha nos **dados**: ela corta os pontos e não pinta transparência. Por isso o traço continua editável e o arquivo não cresce.

- Pura em `brush.js`: `erasePoints(points, centerNorm, radiusNorm)`.
  - Remove os pontos dentro do círculo e põe `null` onde um traço se parte.
  - Junta `null` repetidos e descarta traços que ficaram com 0 pontos.
  - Os pontos estão normalizados num box que não é quadrado. Faça a conta em espaço de página com `denormalizeStroke` e normalize de novo com `normalizeStroke`, que recalcula o box.
- Ferramenta nova `eraser` em `TOOLS`, com ícone de borracha e atalho **E**. Antes, confira o keymap para não haver conflito.
  - Ela age **só na camada de pincel selecionada**. Sem seleção de path, a faixa mostra o aviso "Selecione um traço de pincel para apagar" e o gesto não faz nada.
  - Opção: tamanho da borracha. O cursor é um círculo do tamanho real.
  - Um gesto inteiro gera um único passo de desfazer, com o rótulo "Apagar traço". Se a camada ficar vazia, ela é removida no mesmo passo.
- Testes de unidade:
  - apagar o meio de um traço gera 2 traços;
  - apagar tudo resulta em `null`, e o editor remove a camada;
  - os pontos continuam em 0–1;
  - a validação passa depois de apagar.
- E2E: desenhar, apagar no meio e conferir 2 traços.
- Acrescente um passo ao tutorial `draw-brush` ou crie uma lição curta. Siga o padrão de `lessons.js`: `target`, `done` e `act` reais.

---

## Fase 5 · Atalhos e tintas de época na faixa do pincel

- **Tamanho com `[` e `]`** enquanto uma ferramenta de desenho está ativa, com passo de 1 px até 10 e de 10% acima disso.
  - O `Ctrl+[` e o `Ctrl+]` já servem para mudar a camada de nível (`shortcuts.js:244-253`). O atalho novo é **sem** Ctrl. Registre-o no keymap configurável e confira o teste de conflitos em `tests/keymap.test.js`.
- **Alt+clique** com o pincel ativo pega a cor da página (conta-gotas) para a ferramenta. Reutilize `stage.activateEyedropper` (`editor.js:1753`).
- **Tintas de época:** 6 amostras na faixa, ao lado de Cor:
  - nanquim `#15131a`;
  - sépia `#5b3a1e`;
  - azul de caneta-tinteiro `#1f3a6e`;
  - vermelho de correção `#a3221c`;
  - grafite `#4a4a4f`;
  - verde de escritório `#2f5a3a`.
  - Mais as 4 últimas cores usadas, guardadas nas opções. Se `renderColorSwatchesHTML` (`properties-panel.js`) servir, reaproveite-o.
- Testes: keymap sem conflitos, e `[`/`]` mudando `options.width` e respeitando os limites de 1 a 200.

---

## Ideias para depois (fora deste plano)

Fiquei com estas ideias, mas elas não estão especificadas aqui:

- **Seleção múltipla** para mover, alinhar e agrupar. O `state.selection` hoje guarda um id só, e a mudança afeta o editor inteiro.
- **Pincel de mancha e respingo** (tinta derramada, café) como ponta extra. Ela se encaixa no mesmo sistema da Fase 1.
- **Tinta UV no pincel:** um atalho que cria o traço com `light: 'uv'`, para mensagens escondidas à mão. O `editor.js` já usa `currentLight`. Bastaria um alternador visível na faixa.
- **Sensibilidade à velocidade** no `pen` e no `nib`, para quem desenha com mouse: um traço rápido sai mais fino, o que imita a pressão.
