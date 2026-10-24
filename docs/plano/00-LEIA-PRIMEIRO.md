# Ateliê de documentos — leia primeiro

Plano escrito em 24 de outubro de 2026 para ser implementado **uma etapa por vez**. Cada etapa tem o seu próprio arquivo nesta pasta. Quem implementa recebe este arquivo e **um** arquivo de etapa; não leia nem adiante as outras etapas.

## O que é

Um aplicativo próprio, **separado do Tabletop**, para criar e editar documentos de RPG (*handouts*): cartas, jornais, fichas policiais, telegramas, polaroides, diários. Parecido com um Photoshop pequeno e especializado, com cara de **bancada de artesão** (ver `PLANO-INTERFACE.md`). A pessoa:

1. começa de um **modelo** ou de uma folha em branco;
2. troca textos, fontes, imagens, manchas, carimbos, dobras e desgaste, camada por camada, ou só **preenche os campos** do modelo;
3. pode esconder um texto que só aparece sob **luz UV**;
4. lê em tela cheia com lupa e lanterna UV, exporta PNG, imprime, e, com o Tabletop, usa o documento na cena (uma carta na mesa que os jogadores pegam para ler).

## A coleção da casa e as expansões

O Ateliê é **completo sozinho**. Ele traz a sua própria **coleção da casa** (`public/colecao/`, no git e no site), toda feita para ele, com licença própria ou livre:

- 16 papéis em 3 idades e ~60 texturas de sobreposição (manchas, sangue, água, queimado, amassados, dobras, digitais, rasgos), geradas por código (etapa 12);
- ~140 elementos vetoriais: carimbos, selos, clipes, fitas, etiquetas, lacres, molduras, ornamentos, emblemas fictícios, símbolos, marcas à mão (etapa 13);
- 26 famílias de fontes livres: máquina de escrever, à mão, impressão antiga, jornal, gótica, estêncil, tela (etapa 14);
- 36 modelos prontos, feitos no próprio Ateliê (etapa 16).

**Expansões** são bibliotecas a mais, instaladas na máquina e privadas (`data-private/expansoes/<id>/`). A primeira é o acervo do *Arquivos Confidenciais* (etapas 22 a 25): ele **melhora** o Ateliê (mais centenas de modelos e milhares de elementos), mas nada depende dele. Itens de expansão aparecem misturados na biblioteca, com um selo da origem, e podem ser filtrados.

## Onde os apps rodam

Os dois serão **publicados no GitHub Pages da mesma conta** (`https://<conta>.github.io/Tabletop/` e `https://<conta>.github.io/Atelie/`), sem contas de usuário nem servidor público. Por isso:

- o modo principal do Ateliê é o **modo navegador** (etapa 6): os documentos de cada pessoa ficam no navegador dela (IndexedDB), a coleção da casa vem como arquivos estáticos;
- os dois apps ficam na **mesma origem** (o caminho não conta), e a integração usa um banco de troca no navegador e um `BroadcastChannel` (caminho A do contrato);
- o servidor Node do Ateliê continua existindo para **desenvolvimento** e para quem quiser rodar localmente (caminho C), e é onde rodam os importadores de expansão;
- se um dia um dos dois ganhar domínio próprio, a integração continua pela janela (caminho B).

Detalhes em [`CONTRATO-TABLETOP.md`](CONTRATO-TABLETOP.md); publicação na etapa 26.

## Onde fica

| | Ateliê | Tabletop |
|---|---|---|
| Pasta | `/home/ilvro/Documents/Projects/Atelie` | `/home/ilvro/Documents/Projects/Tabletop` |
| Servidor | `http://127.0.0.1:3011` (`ATELIE_PORT`) | `http://127.0.0.1:3001` |
| Vite (desenvolvimento) | `http://127.0.0.1:5174` | `http://127.0.0.1:5173` |
| API | `/api/atelie/…` | `/api/tabletop/…` |

As etapas 1 a 27 acontecem **só** no Ateliê (a 29, opcional, também). A etapa 28 acontece **só** no Tabletop e liga os dois pelo contrato de [`CONTRATO-TABLETOP.md`](CONTRATO-TABLETOP.md). Nenhuma etapa do Ateliê importa código do Tabletop: quando uma etapa diz "copie de `../Tabletop/…`", é cópia, com o teste junto.

## Arquivos de apoio

| Arquivo | Para quê |
|---|---|
| [`PLANO-INTERFACE.md`](PLANO-INTERFACE.md) | Identidade visual, tokens, primitivas, movimento, estrutura da tela e padrões de qualidade. **Toda etapa com interface segue este arquivo.** |
| [`CONTRATO-TABLETOP.md`](CONTRATO-TABLETOP.md) | O que o Ateliê oferece ao Tabletop e como os dois conversam. |

## Por que em etapas pequenas

O acervo pago tem 78 pacotes de documentos, mais de 2 500 imagens soltas e PSDs de até 340 MB; a coleção própria tem centenas de itens; a interface tem dezenas de detalhes. Nada disso precisa existir de uma vez. Cada etapa entrega algo que funciona e tem teste; a seguinte só começa com a anterior pronta.

## Ordem das etapas

| # | Arquivo | Entrega | Depende de |
|---|---|---|---|
| 1 | `etapa-01-projeto.md` | O projeto: pastas, servidor, Vite, testes, git | — |
| 2 | `etapa-02-identidade-e-casca.md` | Identidade visual, fontes da interface, primitivas, trilho, gavetas, inspetor, avisos, menu de contexto, Ctrl+K, Ajustes da mesa | 1 |
| 3 | `etapa-03-modelo-de-dados.md` | O formato de um documento e a validação | 1 |
| 4 | `etapa-04-renderizador.md` | Desenhar um documento: imagens, formas, mesclagem, recorte, ajustes | 3 |
| 5 | `etapa-05-texto.md` | Texto: caixa, quebra, alinhamento, fontes, tintas | 4 |
| 6 | `etapa-06-armazenamento.md` | Documentos, versões, lixeira, envios, biblioteca (casa + expansões), modo navegador | 3 |
| 7 | `etapa-07-editor.md` | O editor na casca: palco, camadas, propriedades, desfazer, arquivar | 2, 4, 5, 6 |
| 8 | `etapa-08-manipulacao.md` | Mover, redimensionar, girar, escrever no lugar | 7 |
| 9 | `etapa-09-ferramentas-do-editor.md` | Réguas e guias, histórico, mini-barra, conta-gotas, colar e arrastar imagens, alinhar, cores | 8 |
| 10 | `etapa-10-documentos-e-rascunho.md` | Navegador com pastas, fixados, favoritos, recentes; rascunho automático; versões; lixeira | 7 |
| 11 | `etapa-11-efeitos-procedurais.md` | Amassado, dobras, manchas, queimado, rasgado, sangue, grão (camadas `effect`) | 4 |
| 12 | `etapa-12-colecao-papeis-e-texturas.md` | Coleção da casa: papéis e texturas gerados por código | 6, 11 |
| 13 | `etapa-13-colecao-elementos.md` | Coleção da casa: carimbos, selos, clipes, fitas, lacres, molduras, símbolos, marcas | 12 |
| 14 | `etapa-14-colecao-fontes.md` | Coleção da casa: 26 fontes livres e o seletor de fontes | 2, 6 |
| 15 | `etapa-15-biblioteca.md` | Gaveta Biblioteca e modo "Preencher" | 7, 12, 13, 14 |
| 16 | `etapa-16-colecao-modelos.md` | Coleção da casa: 36 modelos próprios | 9, 15 |
| 17 | `etapa-17-inicio-e-galeria.md` | Tela de início, gaveta Modelos, primeira visita | 10, 16 |
| 18 | `etapa-18-assar-e-entregar.md` | Assar em PNG e entregar ao Tabletop pelos três caminhos do contrato (banco de troca, janela, HTTP) | 7, 10 |
| 19 | `etapa-19-luz-uv.md` | Camadas UV, escurecimento, clima UV da interface, assado UV | 18 |
| 20 | `etapa-20-modo-leitura.md` | Leitura em tela cheia: lupa, lanterna UV, verso, carrossel | 10, 19 |
| 21 | `etapa-21-exportar-e-imprimir.md` | Exportar PNG e folha de impressão | 4 |
| 22 | `etapa-22-importar-elementos.md` | **Expansão**: importar imagens, símbolos e fontes do *Arquivos Confidenciais* | 6, 14 |
| 23 | `etapa-23-psd-leitura.md` | **Expansão**: ler a estrutura dos PSDs (relatório) | 1 |
| 24 | `etapa-24-psd-compositor.md` | **Expansão**: compor as camadas de um PSD em Node | 23 |
| 25 | `etapa-25-psd-modelos.md` | **Expansão**: PSD vira modelo editável | 24, 5 |
| 26 | `etapa-26-publicar-no-pages.md` | Publicar o Ateliê no GitHub Pages (workflow, build estático, conferências) | 18, 21 |
| 27 | `etapa-27-documentacao.md` | Ajuda no app, guia de uso, manutenção, licenças | 1–26 |
| 28 | `etapa-28-integracao-tabletop.md` | **No Tabletop**: documentos do Ateliê na cena pelos três caminhos, editar, atualizar, UV na inspeção, tutorial | 18, 19, 26 |
| 29 | `etapa-29-expansao-no-navegador.md` | **Opcional**: instalar uma expansão no próprio navegador, para usá-la no site publicado sem publicá-la | 22, 25, 26 |

As etapas de expansão (22 a 25, e a opcional 29) podem ser feitas em qualquer momento depois das dependências, mas **o app tem de estar completo e bonito antes delas**: elas melhoram, não completam.

## Como entregar uma etapa a quem implementa

Mande uma etapa por conversa (ou por vez), com esta mensagem, trocando o número:

> Você vai implementar a **etapa N** do Ateliê de documentos (`/home/ilvro/Documents/Projects/Atelie`). Leia, nesta ordem: `AGENTS.md` (se já existir), `docs/plano/00-LEIA-PRIMEIRO.md` e `docs/plano/etapa-NN-….md`. Faça **só** o que essa etapa pede, na ordem em que ela pede, e leia só os arquivos de código que ela manda ler. Quando todos os itens de "Pronto quando" estiverem verdadeiros, pare e me mostre: o que mudou (arquivos), a saída dos testes, e o que ficou pendente. Não comece a próxima etapa.

Para a etapa 28, troque o projeto para o Tabletop: "Você vai implementar a etapa 28 … no Tabletop (`/home/ilvro/Documents/Projects/Tabletop`). Leia `AGENTS.md` do Tabletop, `../Atelie/docs/plano/00-LEIA-PRIMEIRO.md`, `../Atelie/docs/plano/CONTRATO-TABLETOP.md` e `../Atelie/docs/plano/etapa-28-integracao-tabletop.md`."

Para as etapas com interface, acrescente à mensagem: "Siga `docs/plano/PLANO-INTERFACE.md` em tudo o que for visual."

Ao receber a resposta, confira o "Pronto quando" você mesmo (rode os testes) antes de mandar a etapa seguinte.

## Regras que valem para todas as etapas

1. **Antes de começar**, leia `AGENTS.md` (criado na etapa 1), este arquivo e o arquivo da etapa. Leia só os arquivos de código que a etapa manda ler.
2. **Faça só o que a etapa pede.** Se achar que falta algo, anote em "Pendências" no `progress.md`; não implemente.
3. **Nunca** coloque arquivos do *Arquivos Confidenciais* (PSDs, imagens, fontes) no git, em `public/` ou em `dist/`. É um produto pago, para uso pessoal: vai só para `data-private/expansoes/`, que está no `.gitignore`. A **coleção da casa** (`public/colecao/`) é o oposto: é do Ateliê, vai para o git, e só pode ter coisas feitas para ele ou com licença livre registrada (nada copiado nem derivado do acervo pago).
4. **Estilo**: JavaScript puro com módulos ES, sem framework, sem biblioteca de componentes, sem CDN. Comentários em inglês, curtos, explicando o porquê; textos de interface em português do Brasil. Funções puras em módulos próprios, cobertas por `tests/*.test.js` (`node --test`). Siga o arquivo vizinho.
5. **Dependências**: só as que a etapa 1 lista. As de importação (`ag-psd`, `sharp`, `fflate`) são `devDependencies` usadas só pelos scripts; nada delas entra no código do navegador.
6. **Interface**: siga `PLANO-INTERFACE.md` (tokens `--eco-*` e `--at-*`, primitivas `.at-*`, movimento, estrutura). Nenhuma fonte menor que 11 px (há teste). Toda animação respeita `prefers-reduced-motion`.
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
| **biblioteca** | Tudo o que se pode usar num documento: a coleção da casa mais as expansões instaladas. |
| **coleção da casa** | Papéis, texturas, elementos, fontes e modelos do próprio Ateliê (`public/colecao/`). |
| **expansão** | Uma biblioteca privada a mais, instalada na máquina (`data-private/expansoes/<id>/`), como o *Arquivos Confidenciais*. |
| **assar** (*bake*) | Renderizar o documento num PNG, para exportar e para o Tabletop. |
| **arquivar** | Salvar no servidor (ou no navegador), com o carimbo; diferente do rascunho automático. |
| **UV** | Camadas que só aparecem sob luz ultravioleta. |

## Referências

- Acervo: `/home/ilvro/Documents/RPG - Conteúdo/RPG - Conteúdo/Arquivos Confidenciais` (link para `/media/hd/Arquivos Confidenciais`, num HD; leitura lenta). Pastas: `Documentos/Bundle N - …` (PSDs, `Prévias`, `Fontes`), `Assets/<ano>/<mês>/<categoria>` (PNG/JPG soltos), `Símbolos/<ano>/<mês>`, `EXTRAS`, `EXTRAS (2)`.
- Documentos que o usuário já fez (PSD, e PNG/PDF em `PDFs | Imagens`): `/home/ilvro/Documents/RPG - Conteúdo/RPG - Conteúdo/Campanhas/Vaesen/Documentos/`.
- Como o Tabletop lida hoje com documentos na cena: `../Tabletop/docs/DOCUMENTOS_INTERATIVOS.md` (só leitura, para contexto).
- Sistema visual compartilhado: `../Tabletop/docs/DESIGN_SYSTEM.md` e `../Tabletop/src/ui/theme.css` (a camada `eco` é copiada na etapa 1).
- Projeto irmão de referência de experiência: `../Ficha teste - Ordem II` (ver `PLANO-INTERFACE.md`).

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
| 1 | feita | 24/10/2026 | Estrutura inicial, Express, Vite, UI base, testes unitários e E2E |
| 2 | feita | 24/10/2026 | Identidade visual, primitivas, fontes OFL, casca, gavetas, inspetor, ajustes, Ctrl+K |
| 3 | feita | 24/10/2026 | Modelo de dados dos documentos, camadas, limites, mesclagens e validação |
| 4 | feita | 24/10/2026 | Renderizador em Canvas 2D: formas, imagens, mesclagens, recorte, ajustes e luz UV |
| 5 | feita | 24/10/2026 | Diagramação pura, 4 estilos de tinta, carregador FontFace, testes unitários e E2E |
| 6 | feita | 24/10/2026 | Armazenamento: IndexedDB, rotas de biblioteca, documentos, lixeira e envios |
| 7 | feita | 24/10/2026 | Editor integrado: estado, palco, inspetor de camadas e propriedades, histórico e arquivamento |
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
| 19 | pendente | | |
| 20 | pendente | | |
| 21 | pendente | | |
| 22 | pendente | | |
| 23 | pendente | | |
| 24 | pendente | | |
| 25 | pendente | | |
| 26 | pendente | | |
| 27 | pendente | | |
| 28 | pendente | | |
| 29 | pendente (opcional) | | |
