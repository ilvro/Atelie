# Etapa 20 — Modo leitura

Leia antes: `00-LEIA-PRIMEIRO.md`, `PLANO-INTERFACE.md` (seções 4 e 6), `src/render/handout-render.js` (luz `uv`), `src/editor/editor.js`, `src/editor/navigator.js`, `src/domain/folders.js`, `src/data/handout-images.js`, `src/data/handout-fonts.js`.

## Objetivo

Ver o documento como um jogador veria: só a folha sobre a mesa, em tela cheia, sem interface. Com três ferramentas que fazem a diferença numa mesa presencial ou numa chamada de vídeo: a **lupa**, a **lanterna UV** (um círculo de luz negra que revela o que está escondido só onde passa) e **virar a folha**. E as setas para passar pelos documentos de uma pasta, como o carrossel da Ficha.

## Entrar e sair

- Botão **Leitura** no trilho, tecla **P** (fora de campos), ou "Ler" no menu de contexto de um documento do navegador.
- Entra em tela cheia (`document.documentElement.requestFullscreen()`, se o navegador permitir; senão, ocupa a janela) e esconde trilho, gavetas, inspetor e barras. **Esc** sai.
- A folha aparece centrada, o maior possível com 6 % de margem, sobre a mesa escolhida nos Ajustes, com a luminária. Renderize em resolução de tela × `devicePixelRatio`.

## Ferramentas (barra mínima que aparece embaixo ao mover o mouse e some em 2 s parado)

| Ferramenta | Tecla | Como funciona |
|---|---|---|
| **Lupa** | L | Um círculo de 220 px que segue o cursor e mostra a área sob ele ampliada 2,5×, com borda de lente (anel escuro e reflexo). A imagem ampliada vem de um segundo render em 2,5× a escala atual, feito ao ligar a lupa (e refeito ao redimensionar). |
| **Lanterna UV** | U | Só aparece se o documento tem camadas `uv`. Escurece a folha um pouco (a sala "apagou") e mostra, num círculo de 260 px que segue o cursor, o render **sob luz UV** (etapa 19), com borda suave (máscara radial) e um halo violeta `--at-uv-glow`. A roda do mouse muda o tamanho do círculo (120–480 px). |
| **Virar** | F | Só com `back`. A folha gira em Y (`rotateY` 180°, `--eco-slow`) e mostra o verso; com movimento reduzido, troca direto. |
| **Anterior / próximo** | ← / → | Passa pelos documentos da mesma pasta (ou dos recentes, se o documento não tem pasta), com a transição de troca. Uma fileira de três miniaturas embaixo (anterior · atual · próximo), como a "Seleção de receptáculo" da Ficha, aparece junto com a barra. |
| **Sair** | Esc | — |

Toque (tablet): arrastar com um dedo move a lupa ou a lanterna; dois dedos dão zoom na folha; deslizar para os lados troca de documento.

## Implementação

- `src/reading/reading.js`: `createReading(shell, deps)` → `{ open(handoutId), close() }`.
- Dois canvases na mesma posição: o normal e o UV (renderizado só ao ligar a lanterna). A lanterna desenha o UV num terceiro canvas com `globalCompositeOperation = 'destination-in'` e um gradiente radial na posição do cursor, por quadro (`requestAnimationFrame`, só enquanto o cursor mexe).
- A lupa usa `drawImage` do render grande recortado na posição do cursor.
- Nada é salvo; o modo leitura não edita o documento.

## Testes

- `tests/reading.test.js` (Node): `fitPage(page, viewport, margin)` (o maior tamanho que cabe) e `neighbors(list, id)` (anterior e próximo, circular).
- `tests/e2e/reading.test.js`: entrar pelo trilho esconde o trilho e o inspetor; L mostra a lupa (o elemento existe e segue o mouse); com um documento com camada UV, U liga a lanterna e o pixel **dentro** do círculo mostra a cor da camada UV, e **fora** não; F com `back` mostra o verso; → passa para o próximo documento da pasta; Esc volta ao editor no mesmo documento.

## Pronto quando

- [ ] Testes passam; `npm test` e os E2E passam.
- [ ] Captura `docs/referencias/atelie-leitura-uv.png` com a lanterna UV revelando uma frase no "Diário de culto · com UV" (etapa 16).
