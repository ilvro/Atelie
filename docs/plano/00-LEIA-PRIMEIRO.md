# Ateliê de documentos — leia primeiro

Plano escrito em 24 de outubro de 2026 para ser implementado **uma etapa por vez**. Cada etapa tem o seu próprio arquivo nesta pasta. Quem implementa recebe este arquivo e **um** arquivo de etapa; não leia nem adiante as outras etapas.

## O que é

Um aplicativo próprio, **separado do Tabletop**, para criar e editar documentos de RPG (*handouts*): cartas, jornais, fichas policiais, telegramas, polaroides, diários. Parecido com um Photoshop pequeno e especializado. A pessoa:

1. começa de um **modelo** (importado dos PSDs do *Arquivos Confidenciais* ou feito no próprio ateliê) ou de uma folha em branco;
2. troca textos, fontes, imagens, manchas, carimbos, dobras e desgaste, camada por camada;
3. pode esconder um texto que só aparece sob **luz UV**;
4. exporta PNG ou imprime, e, com o Tabletop, usa o documento na cena (uma carta na mesa que os jogadores pegam para ler).

O objetivo principal é usar **todo o acervo** de documentos que hoje vive em PSDs no HD, sem abrir o Photoshop.

## Onde fica

| | Ateliê | Tabletop |
|---|---|---|
| Pasta | `/home/ilvro/Documents/Projects/Atelie` | `/home/ilvro/Documents/Projects/Tabletop` |
| Servidor | `http://127.0.0.1:3011` (`ATELIE_PORT`) | `http://127.0.0.1:3001` |
| Vite (desenvolvimento) | `http://127.0.0.1:5174` | `http://127.0.0.1:5173` |
| API | `/api/atelie/…` | `/api/tabletop/…` |

As etapas 1 a 17 acontecem **só** no Ateliê. A etapa 18 acontece **só** no Tabletop e liga os dois pelo contrato de [`CONTRATO-TABLETOP.md`](CONTRATO-TABLETOP.md). Nenhuma etapa do Ateliê importa código do Tabletop: quando uma etapa diz "copie de `../Tabletop/…`", é cópia, com o teste junto.

## Por que em etapas pequenas

O acervo tem 78 pacotes de documentos, mais de 2 500 imagens soltas e PSDs de até 340 MB, com camadas de ajuste, modos de mesclagem, máscaras e objetos inteligentes aninhados. Nada disso precisa existir de uma vez. Cada etapa entrega algo que funciona e tem teste; a seguinte só começa com a anterior pronta.

## Ordem das etapas

| # | Arquivo | Entrega | Depende de |
|---|---|---|---|
| 1 | `etapa-01-projeto.md` | O projeto: pastas, servidor, Vite, tokens visuais, testes, git | — |
| 2 | `etapa-02-modelo-de-dados.md` | O formato de um documento e a validação | 1 |
| 3 | `etapa-03-renderizador.md` | Desenhar um documento num canvas: imagens, formas, mesclagem, recorte, ajustes | 2 |
| 4 | `etapa-04-texto.md` | Texto: caixa, quebra de linha, alinhamento, fontes, tintas | 3 |
| 5 | `etapa-05-armazenamento.md` | Salvar documentos, enviar imagens, ler a biblioteca | 2 |
| 6 | `etapa-06-editor.md` | O editor: palco, zoom, lista de camadas, propriedades, desfazer | 3, 4, 5 |
| 7 | `etapa-07-manipulacao.md` | Mover, redimensionar e girar no palco; escrever no lugar | 6 |
| 8 | `etapa-08-importar-elementos.md` | Script que importa as imagens soltas, símbolos e fontes do HD | 1, 5 |
| 9 | `etapa-09-biblioteca.md` | Navegar e usar a biblioteca no editor; modo "Preencher" | 6, 8 |
| 10 | `etapa-10-psd-leitura.md` | Ler a estrutura dos PSDs e gerar um relatório | 1 |
| 11 | `etapa-11-psd-compositor.md` | Compor as camadas de um PSD em Node | 10 |
| 12 | `etapa-12-psd-modelos.md` | Transformar um PSD num modelo editável e validar contra o original | 11, 4 |
| 13 | `etapa-13-assar-e-entregar.md` | Assar o documento em PNG, link direto, aviso para quem abriu o ateliê | 6 |
| 14 | `etapa-14-luz-uv.md` | Camadas UV, visualização e assado UV | 13 |
| 15 | `etapa-15-efeitos-procedurais.md` | Amassado, dobras, manchas, queimado, rasgado, sangue sem o acervo | 3 |
| 16 | `etapa-16-exportar-e-imprimir.md` | Exportar PNG e folha de impressão | 3 |
| 17 | `etapa-17-docs-e-exemplos.md` | Documentação de uso e manutenção, documentos de exemplo | 1–16 |
| 18 | `etapa-18-integracao-tabletop.md` | **No Tabletop**: usar documentos do ateliê na cena, editar, atualizar, UV na inspeção, tutorial | 13, 14 |

As etapas 8, 10 e 15 podem ser feitas a qualquer momento depois das suas dependências.

## Como entregar uma etapa a quem implementa

Mande uma etapa por conversa (ou por vez), com esta mensagem, trocando o número:

> Você vai implementar a **etapa N** do Ateliê de documentos (`/home/ilvro/Documents/Projects/Atelie`). Leia, nesta ordem: `AGENTS.md` (se já existir), `docs/plano/00-LEIA-PRIMEIRO.md` e `docs/plano/etapa-NN-….md`. Faça **só** o que essa etapa pede, na ordem em que ela pede, e leia só os arquivos de código que ela manda ler. Quando todos os itens de "Pronto quando" estiverem verdadeiros, pare e me mostre: o que mudou (arquivos), a saída dos testes, e o que ficou pendente. Não comece a próxima etapa.

Para a etapa 18, troque o projeto para o Tabletop: "Você vai implementar a etapa 18 … no Tabletop (`/home/ilvro/Documents/Projects/Tabletop`). Leia `AGENTS.md` do Tabletop, `../Atelie/docs/plano/00-LEIA-PRIMEIRO.md`, `../Atelie/docs/plano/CONTRATO-TABLETOP.md` e `../Atelie/docs/plano/etapa-18-integracao-tabletop.md`."

Ao receber a resposta, confira o "Pronto quando" você mesmo (rode os testes) antes de mandar a etapa seguinte.

## Regras que valem para todas as etapas

1. **Antes de começar**, leia `AGENTS.md` (criado na etapa 1), este arquivo e o arquivo da etapa. Leia só os arquivos de código que a etapa manda ler.
2. **Faça só o que a etapa pede.** Se achar que falta algo, anote em "Pendências" no `progress.md`; não implemente.
3. **Nunca** coloque arquivos do *Arquivos Confidenciais* (PSDs, imagens, fontes) no git, em `public/` ou em `dist/`. É um produto pago, para uso pessoal. Tudo o que vem dele vai para a pasta privada da biblioteca (`data-private/`), que está no `.gitignore`.
4. **Estilo**: JavaScript puro com módulos ES, sem framework, sem biblioteca de componentes, sem CDN. Comentários em inglês, curtos, explicando o porquê; textos de interface em português do Brasil. Funções puras em módulos próprios, cobertas por `tests/*.test.js` (`node --test`). Siga o arquivo vizinho.
5. **Dependências**: só as que a etapa 1 lista. As de importação (`ag-psd`, `sharp`, `fflate`) são `devDependencies` usadas só pelos scripts; nada delas entra no código do navegador.
6. **Interface**: use os tokens e primitivas copiados na etapa 1 (`--eco-*`, `--tt-*`, `.tt-tag`, `.tt-display`) e os controles de `src/ui/controls.js` (também copiados). Nenhuma fonte menor que 11 px (há teste). Toda animação respeita `prefers-reduced-motion`.
7. **Ao terminar a etapa**:
   - `npm test` sem falhas;
   - os testes E2E que a etapa lista: `npm run build && node --test --test-concurrency=1 tests/e2e/<arquivo>.test.js`;
   - marque a etapa como feita na tabela "Andamento" no fim deste arquivo, com a data e uma linha do que foi feito;
   - acrescente uma seção curta no `progress.md` (feito, validação, pendências reais);
   - **não faça commit** sem o usuário pedir. Quando pedir, um commit por etapa, só com os arquivos da etapa.
8. Se um teste que já existia falhar, verifique se ele falha também sem as suas mudanças (`git stash`, rode, `git stash pop`) antes de mexer nele. Só altere teste antigo quando a própria etapa mandar.

## Vocabulário

| Termo | Significado |
|---|---|
| **documento** (no código: *handout*) | Uma peça editável: uma página com camadas. Formato na etapa 2. |
| **camada** | Uma imagem, um texto, uma forma, um ajuste de cor ou um efeito, empilhados de baixo para cima. |
| **modelo** | Um documento pronto para ser copiado, com campos marcados para preencher. |
| **elemento** | Uma imagem solta da biblioteca: papel, mancha, sangue, fita, prendedor, símbolo, carimbo, moldura. |
| **envio** (*upload*) | Uma imagem que a pessoa enviou ao ateliê (uma foto de NPC, um mapa). |
| **biblioteca** | Os modelos, elementos e fontes importados, na pasta privada. |
| **assar** (*bake*) | Renderizar o documento num PNG, para exportar e para o Tabletop. |
| **UV** | Camadas que só aparecem sob luz ultravioleta. |

## Referências

- Acervo: `/home/ilvro/Documents/RPG - Conteúdo/RPG - Conteúdo/Arquivos Confidenciais` (link para `/media/hd/Arquivos Confidenciais`, num HD; leitura lenta). Pastas: `Documentos/Bundle N - …` (PSDs, `Prévias`, `Fontes`), `Assets/<ano>/<mês>/<categoria>` (PNG/JPG soltos), `Símbolos/<ano>/<mês>`, `EXTRAS`, `EXTRAS (2)`.
- Documentos que o usuário já fez (PSD, e PNG/PDF em `PDFs | Imagens`): `/home/ilvro/Documents/RPG - Conteúdo/RPG - Conteúdo/Campanhas/Vaesen/Documentos/`.
- Como o Tabletop lida hoje com documentos na cena: `../Tabletop/docs/DOCUMENTOS_INTERATIVOS.md` (só leitura, para contexto).
- Sistema visual compartilhado: `../Tabletop/docs/DESIGN_SYSTEM.md` e `../Tabletop/src/ui/theme.css` (copiados na etapa 1).

## O que a análise dos PSDs mostrou (24/10/2026)

Medido com `ag-psd` 30.2.0 em três arquivos (um jornal, um relatório policial com UV, um modelo de polaroide):

- Folhas A4 a 300 ppp (2480 × 3508); recortes menores (1148 × 627).
- **Texto editável fica dentro de objetos inteligentes**: o PSD tem uma camada `SMART "Textos"` cujo conteúdo é um `.psb` embutido (`psd.linkedFiles[i].data`); dentro dele estão as camadas `TEXT` com fonte (`OldNewspaperTypes`, `KingthingsTrypewriter2`, `F25Executive`, `Moinho`, `Calibri`), tamanho, cor, caixa (`shapeType: 'box' | 'point'`) e o texto.
- Mesclagens usadas: `multiply`, `overlay`, `screen`, `soft light`, `hard light`, `linear burn`, `lighter color`, `pass through` (grupos).
- Camadas de ajuste: `black & white`, `hue/saturation`, `levels`, `curves`, `color balance`, quase sempre como **máscara de recorte** (`clipping`) de uma camada.
- Variações em grupos irmãos, um visível e outro oculto (`"Com Rasgo"` / `"Sem Rasgo"`).
- UV num grupo próprio (`"Efeito de UV"`), com texto roxo em `multiply` e efeitos de camada.
- Efeitos de camada (`dropShadow`, `outerGlow`, `stroke`…) aparecem, mas não são essenciais para o visual.
- **Todo PSD traz a imagem composta** (`psd.imageData`, lida em 0,1 a 0,5 s, até ~480 MB de memória). Ela serve de prévia e de gabarito para validar a importação.
- Para ler pixels em Node, o `ag-psd` exige `initializeCanvas(createCanvas, createImageData)`; um *stub* que só cria `ImageData` basta (ver etapa 10).

## Andamento

| Etapa | Situação | Data | Nota |
|---|---|---|---|
| 1 | pendente | | |
| 2 | pendente | | |
| 3 | pendente | | |
| 4 | pendente | | |
| 5 | pendente | | |
| 6 | pendente | | |
| 7 | pendente | | |
| 8 | pendente | | |
| 9 | pendente | | |
| 10 | pendente | | |
| 11 | pendente | | |
| 12 | pendente | | |
| 13 | pendente | | |
| 14 | pendente | | |
| 15 | pendente | | |
| 16 | pendente | | |
| 17 | pendente | | |
| 18 | pendente | | |
