# Interface e identidade do Ateliê

Referência para **todas** as etapas que mexem em interface. Quando uma etapa disser "siga a interface", é este arquivo. Escrito em 24 de outubro de 2026, a partir de capturas e do código da *Ficha teste - Ordem II* (`../Ficha teste - Ordem II`) e do sistema visual do Tabletop (`../Tabletop/docs/DESIGN_SYSTEM.md`).

## 1. Família e identidade

O Ateliê é da mesma família da Ficha e do Tabletop: fundo escuro, tipografia editorial, títulos como peças de papel, interface que some para o conteúdo aparecer. O que o distingue é ser **um lugar de fazer**, não de consultar:

> **A bancada de um falsificador de documentos, à noite.** Uma mesa escura sob uma única luminária quente; papéis, carimbos, fita, lacre; e, guardada na gaveta, uma lanterna de luz negra que revela o que não se vê.

Daí saem as três marcas próprias:

| Marca | Ficha | Tabletop | **Ateliê** |
|---|---|---|---|
| Cor de destaque | vermelho-sangue `#e91d25` | âmbar tungstênio `#e3b878` | **violeta de luz negra `#a08aff`** (é a cor da luz UV, a função mais "mágica" do app) |
| Título de seção | etiqueta rasgada vermelha | etiqueta rasgada âmbar | **fita crepe** com texto à máquina |
| Estado (salvo, rascunho, UV) | pílulas | selo REC / ENSAIO | **carimbo de borracha** com tinta granulada |
| Transição entre itens | *glitch* | corte com letterbox | **folha deslizando e assentando** na mesa |
| Fundo | mapa texturizado / vídeo | a cena 3D | **a mesa**: madeira, feltro, couro ou concreto, com a luz da luminária |

Do ecossistema, mantém: a camada `eco` de tokens (fontes, espaçamentos, raios, movimento), Hanken Grotesk para texto de interface, serifada para nomes, trilho de ícones à esquerda, busca Ctrl+K, menus de contexto, avisos, modo de apresentação, exportar em alta resolução.

## 2. Tokens (`src/ui/theme.css`, camada `at`)

A etapa 2 cria a camada `at` **ao lado** da `eco` copiada do Tabletop (e remove a camada `tt`, que é do Tabletop).

```css
:root {
  /* the desk at night */
  --at-desk: #131110;          /* fundo do app */
  --at-desk-2: #1b1715;        /* painéis */
  --at-desk-3: #24201c;        /* campos, linhas selecionadas */
  --at-line: #3a332c;          /* filetes */
  --at-line-strong: #574c40;
  /* paper and ink, for things that are paper (cards, tags, notes, the page) */
  --at-paper: #efe6d2;
  --at-paper-2: #e2d6bc;
  --at-ink: #1d1b24;           /* tinta ferrogálica: texto sobre papel */
  --at-ink-faded: #5b5462;
  /* text on the desk */
  --at-text: #ece5d8;
  --at-text-2: #b9b0a2;
  --at-muted: #8d8578;         /* contraste ≥ 4,5 sobre --at-desk-2 (teste) */
  /* signature: black-light violet */
  --at-uv: #a08aff;
  --at-uv-strong: #c4b8ff;
  --at-uv-ink: #0b0818;        /* texto sobre --at-uv; contraste ≥ 7 (teste) */
  --at-uv-glow: color-mix(in srgb, var(--at-uv) 45%, transparent);
  /* sealing wax and lamp */
  --at-wax: #c94640;           /* excluir, perigo, carimbos vermelhos; contraste ≥ 3 sobre --at-desk-2 (componente, não texto) */
  --at-lamp: #f2c58a;          /* a luz da luminária sobre a mesa */
  --at-ok: #7fb685; --at-warn: #e0b354;
}
```

Regras: botões principais, foco, controles ativos e seleção usam `--at-uv`. Coisas que **são papel** (cartões da biblioteca, fita, avisos, a página) usam `--at-paper` e `--at-ink`. `--at-wax` só para perigo e carimbos vermelhos. Os testes de contraste da etapa 1 passam a conferir estes pares.

### Tipografia

| Uso | Fonte | De onde |
|---|---|---|
| Nomes de documento, títulos grandes | **IM Fell English** (OFL) | `google/fonts` `ofl/imfellenglish`, auto-hospedada (etapa 2) |
| Interface | Hanken Grotesk (OFL) | já copiada do Tabletop |
| Rótulos, fita, carimbos, atalhos | **Courier Prime** (OFL) | `google/fonts` `ofl/courierprime` |

Escala: a `--eco-fs-*` (11 a 34 px). Nada menor que 11 px. Nomes de documento **sem** `text-transform` (testes leem `innerText`).

## 3. Primitivas (`src/ui/primitives.css` e `src/ui/primitives.js`)

| Primitiva | Aparência | Uso |
|---|---|---|
| `.at-tape` | faixa de fita crepe: fundo `--at-paper` a 88 %, texto Courier Prime maiúsculo `--at-ink`, pontas serrilhadas (`clip-path` com 6–8 dentes de cada lado), girada −1,5°, sombra curta | títulos de seção, rótulos de grupo |
| `.at-stamp` | carimbo: borda dupla 2 px na cor da tinta, Courier Prime maiúsculo, girado (−4° a 4°, fixo por instância), textura de tinta falhada (`mask-image` com ruído SVG inline) | estados: RASCUNHO, ARQUIVADO, UV, SÓ LEITURA |
| `.at-card` | papel: fundo `--at-paper`, grão sutil (SVG de ruído em `background-image`), sombra de papel sobre a mesa, rotação pequena por item (−0,8° a 0,8°, de um hash do id); ao passar o mouse, endireita e sobe 2 px | modelos, elementos, documentos na galeria |
| `.at-note` | bilhete preso: `.at-card` menor com um pedaço de fita no topo | avisos (*toasts*), dicas |
| `.at-desk` | o fundo do app: textura da mesa escolhida + vinheta quente da luminária (`radial-gradient` de `--at-lamp` a 9 % no centro para transparente) | `body` |
| `.at-btn`, `.at-btn.is-primary`, `.at-btn.is-danger`, `.at-icon-btn` | retos e limpos (é ferramenta de uso longo): primário em `--at-uv`, perigo em `--at-wax` | todos os botões |
| `[data-tip]` + `data-key` | dica com o atalho ao lado (como no Tabletop) | botões com atalho |

`primitives.js`: funções que geram o HTML (`tape(text)`, `stamp(text, { tone, tilt })`, `card({ … })`), testadas.

## 4. Movimento

Só `transform` e `opacity`; `--eco-ease` e as durações `--eco-fast/mid/slow`. Com `prefers-reduced-motion: reduce`, tudo vira troca instantânea.

| Momento | Movimento |
|---|---|
| Abrir um documento | a folha entra de baixo 24 px, girada 2°, e assenta em 0° (`--eco-slow`) |
| Trocar de documento | a folha atual sai deslizando para a esquerda e a nova entra pela direita, como papéis na mesa |
| Salvar ("arquivar") | um carimbo **ARQUIVADO** desce sobre o canto da página (escala 1,35 → 1, opacidade 0 → 1, `--eco-fast`), treme 1 px e some em 1,2 s |
| Aviso | o bilhete cai do topo direito com leve rotação e assenta |
| Ligar a luz UV | a interface inteira esfria: o fundo da mesa escurece, os destaques ganham brilho violeta (`box-shadow` com `--at-uv-glow`) em `--eco-mid` |
| Pegar um elemento da biblioteca | a miniatura "levanta" (sombra maior, escala 1,04) enquanto é arrastada |

## 5. Estrutura da tela

```
┌────┬───────────────────────────────────────────────────────────────────┬─────────────────┐
│ ◆  │  [fita: CARTA DE GUSTAV]  ✎ nome      ↶ ↷   ◐UV   − 60% +   [ARQUIVAR] │ ▸ Propriedades │
│ ▤  │                                                                   │   Preencher     │
│ ⌕  │                     ┌──────────────┐                              │   Camadas       │
│ ▦  │      a mesa         │   a página   │   (luminária: luz quente     │   Histórico     │
│ ◫  │   (textura e luz)   │              │    no centro)                │                 │
│ ☀  │                     └──────────────┘                              │                 │
│ ── │                                                                   │                 │
│ ▢▢ │  [régua]                                     [zoom · 60% · ⤢]     │                 │
│ ⚙  │                                                                   │                 │
└────┴───────────────────────────────────────────────────────────────────┴─────────────────┘
```

- **Trilho** (80 px, como a Ficha): Mesa (editor) · Documentos · Biblioteca · Modelos · Leitura · Exportar; separador; os **5 documentos recentes** como miniaturas de papel (o ativo com um clipe); separador; Ajustes · Ajuda. Botões com `aria-label` e dica com atalho.
- **Gavetas**: Documentos, Biblioteca e Modelos abrem como gaveta entre o trilho e a mesa (360 px), sem esconder a página; Esc fecha.
- **Inspetor** à direita (320 px) com abas: Propriedades · Preencher (só com campos) · Camadas · Histórico.
- **Mesa** no centro: a página com sombra de papel; réguas (liga/desliga); barra de zoom flutuante embaixo à direita; mini-barra sobre a camada selecionada.
- Telas estreitas (< 1100 px): inspetor vira gaveta pela direita; < 720 px: o modo **Preencher** e a **Leitura** funcionam completos, o editor mostra só Propriedades simples.

## 6. Recursos de qualidade (paridade com a Ficha, e o que é próprio)

| Recurso | Etapa |
|---|---|
| Trilho, gavetas, inspetor com abas, avisos, menu de contexto, Ctrl+K (estrutura), Ajustes (mesa e luminária) | 2 |
| Editor com palco, camadas, propriedades, desfazer | 7 |
| Mover, girar, redimensionar, escrever no lugar | 8 |
| Réguas e guias, painel **Histórico** (clicar volta a um passo), mini-barra sobre a seleção, conta-gotas (**I**), colar imagem (Ctrl+V) e arrastar arquivo do sistema para a página, copiar e colar camadas entre documentos, alinhar à página, cores recentes e do documento, menu de contexto no palco | 9 |
| Navegador de documentos com **pastas** (arrastar para mover), fixados, recentes, favoritos, busca e filtros; **rascunho automático** com barra "não arquivado" e recuperação depois de fechar sem salvar; **versões** (voltar a uma revisão anterior); Ctrl+K completo (documentos, modelos, elementos, fontes, ações) | 10 |
| Biblioteca com miniaturas em papel, arrastar para a página, favoritos, filtro por origem (coleção da casa / expansões) | 15 |
| **Início**: "Escolha um ponto de partida", galeria de modelos espalhados na mesa, tamanhos em branco, recentes; primeira visita com três bilhetes de boas-vindas | 17 |
| **Luz UV** que muda o clima de toda a interface | 19 |
| **Modo Leitura**: só a folha na mesa, em tela cheia; **lupa** que segue o cursor; **lanterna UV** (um círculo que revela a camada UV só onde passa); virar para o verso; setas passam entre documentos de uma pasta (como o carrossel da Ficha) | 20 |
| Exportar PNG (tela e 300 ppp) e imprimir em tamanho real | 21 |
| Ajuda no app com atalhos e "como começar" | 26 |

## 7. Qualidade (vale em todas as etapas)

- **Teclado**: tudo alcançável por Tab com foco visível (`:focus-visible` com anel `--at-uv`); atalhos listados na Ajuda; nenhum atalho dispara com foco em campo de texto, exceto Ctrl+S e Ctrl+K.
- **Leitores de tela**: botões só com ícone têm `aria-label`; gavetas e diálogos com `role` e `aria-modal` certos; avisos em `role="status"`.
- **Desempenho**: abrir um A4 com 15 camadas em menos de 400 ms; arrastar a 60 quadros por segundo (durante o arraste, renderize a meia resolução e refaça em resolução total ao soltar); a biblioteca com 3 000 itens rola sem travar (paginação e `loading="lazy"`).
- **Estados vazios** com ilustração própria em SVG (uma mesa vazia, uma gaveta vazia) e uma ação clara.
- **Nada some sem volta**: excluir documento pede confirmação e vai para "Lixeira" por 30 dias (etapa 10); excluir camada é desfazível.
- **Texto da interface** em português do Brasil, curto, sem jargão de programador ("camada", "mesclagem" e "recorte" são do vocabulário de quem edita imagem, e ficam).

## 8. Capturas de referência

A etapa 2 grava em `docs/referencias/` capturas da Ficha (`ficha-*.png`, tiradas com o build dela servido localmente) e, a cada etapa de interface, capturas do Ateliê no mesmo tamanho (1600 × 950). Compare lado a lado antes de dar a etapa como pronta: a família tem de ser reconhecível, a identidade tem de ser própria.
