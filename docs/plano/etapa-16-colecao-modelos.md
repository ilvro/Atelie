# Etapa 16 — Coleção da casa · modelos próprios

Leia antes: `00-LEIA-PRIMEIRO.md` (seção "A coleção da casa"), `PLANO-INTERFACE.md`, `etapa-03-modelo-de-dados.md` (inclusive `fields` e `back`), `public/colecao/library.json` (o que existe: papéis, texturas, elementos, fontes), `src/editor/editor.js`, `scripts/colecao/build.js`.

## Objetivo

Trinta e seis modelos **feitos no próprio Ateliê**, só com a coleção da casa (papéis, texturas, elementos e fontes das etapas 12 a 14) e efeitos procedurais (etapa 11). Cobrem as situações mais comuns de mesas de investigação, horror, fantasia e cotidiano. São eles que fazem o app valer a pena sem expansão nenhuma.

## Regras de qualidade (valem para cada modelo)

1. **Desenhe o resultado antes**: decida a época, o tom e o que o documento conta. Monte no editor até ficar bonito; só então marque os campos.
2. **Referência**: compare, na sua máquina, com documentos do mesmo tipo das prévias do acervo (`…/Arquivos Confidenciais/Documentos/Bundle N/Prévias`) e com os do usuário (`…/Campanhas/Vaesen/Documentos/PDFs | Imagens`). O nível de acabamento tem de ser o mesmo. **Nada** deles é copiado: nem imagem, nem diagramação idêntica, nem texto.
3. **Coerência de época**: fonte, papel, carimbo e linguagem da mesma época (um telegrama dos anos 20 não usa Bebas Neue).
4. **Camadas com nome** em português ("Papel", "Mancha de café", "Carimbo URGENTE", "Corpo da carta"), na ordem lógica, sem camadas sobrando.
5. **Campos** para tudo o que se troca de uma mesa para outra (nomes, datas, textos, foto), com rótulos claros; os textos de exemplo são plausíveis e em português (nada de *lorem ipsum*).
6. **Variações** como camadas ocultas com nome "Variação · …" quando fizer sentido (com ou sem rasgo, carimbo aprovado/negado).
7. Só itens `casa-…` da biblioteca e fontes da coleção (não use fontes do sistema).

## Os modelos

| Categoria | Modelo | Tamanho | O essencial | Campos |
|---|---|---|---|---|
| **Cartas e bilhetes** | Carta envelhecida | A4 | ofício creme antigo, manchas de café, uma dobra, texto à máquina (Special Elite, desgaste 50 %), assinatura à mão (Homemade Apple) | Local e data, Destinatário, Corpo, Assinatura |
| | Carta datilografada · anos 50 | A4 | ofício branco usado, cabeçalho de papel timbrado fictício, Courier Prime, carimbo RECEBIDO | Remetente, Data, Destinatário, Corpo, Assinatura |
| | Bilhete de caderno rasgado | 900 × 700 | caderno usado com rasgo em cima, Caveat, uma digital de sangue opcional (variação) | Texto |
| | Bilhete de geladeira | 700 × 700 | papel amarelo (quadrado), fita crepe no topo, Permanent Marker | Texto |
| | Cartão-postal · frente e verso | 1400 × 900 (dois) | frente: moldura e um campo de imagem; verso: linhas de endereço, selo, carimbo POSTAGEM, texto à mão | Imagem, Saudação; Mensagem, Destinatário, Endereço |
| | Telegrama · anos 20 | telegrama | papel de telegrama, cabeçalho em Old Standard TT, corpo em tiras coladas (faixas brancas com texto à máquina em maiúsculas, "STOP") | Origem, Data, Destinatário, Mensagem |
| | Carta com envelope · frente e verso | A4 + 1300 × 650 | carta e envelope com lacre, endereço à mão, selo | Corpo, Assinatura; Destinatário, Endereço |
| **Jornal** | Recorte de jornal · anos 20 | recorte | papel jornal antigo, manchete em Playfair Display, duas colunas em Libre Baskerville, foto com filtro sépia e grão, borda rasgada | Manchete, Linha fina, Texto, Foto, Legenda |
| | Capa de jornal | A4 | nome do jornal fictício em UnifrakturMaguntia, data, manchete grande, três colunas, uma foto | Nome do jornal, Data, Manchete, Texto, Foto |
| | Obituário | 900 × 1300 | moldura de luto, IM Fell English | Nome, Datas, Texto |
| | Classificados | A4 | grade de anúncios, um circulado à mão em vermelho | Anúncio em destaque |
| **Polícia e investigação** | Relatório policial | A4 | formulário (linhas e caixas como formas), emblema policial genérico, Courier Prime, carimbo CONFIDENCIAL | Número, Data, Agente, Ocorrência, Relato |
| | Boletim de ocorrência | A4 | campos de formulário preenchidos à máquina | Partes, Local, Data, Fato |
| | Ficha criminal | A4 | foto 3 × 4 com cantoneiras, digitais, dados | Foto, Nome, Apelido, Crimes, Observações |
| | Mandado | A4 | brasão genérico, texto formal, assinatura e selo | Nome, Motivo, Data, Juiz |
| | Laudo pericial | A4 | cabeçalho, seções numeradas, marca d'água CONFIDENCIAL | Número, Vítima, Conclusão |
| | Cartão de evidência | 1100 × 700 | etiqueta de evidência com campos, barbante (fita), número | Número, Item, Local, Responsável |
| **Médico** | Prontuário | A4 | formulário médico, letra de médico (Nothing You Could Do), mancha de água | Paciente, Data, Anotações |
| | Receita médica | 1000 × 1400 | cabeçalho de consultório fictício, à mão | Médico, Paciente, Prescrição |
| | Certidão de óbito | A4 | moldura, selo, campos | Nome, Data, Causa, Médico |
| | Internação · sanatório | A4 | formulário antigo, carimbo, foto | Paciente, Foto, Diagnóstico, Observações |
| **Ocultismo** | Página de grimório | A4 | pergaminho antigo, IM Fell DW Pica, um círculo e símbolos, notas na margem à mão | Título, Texto, Nota na margem |
| | Círculo ritual | A4 | pergaminho, sigilos ao redor do círculo, instruções | Instruções |
| | Diário de culto · com UV | A4 | caderno antigo à mão, e uma frase **só na luz UV** (`light: 'uv'`) | Data, Texto, Mensagem oculta |
| | Pergaminho com selo | 1100 × 1500 | pergaminho `deckle`, lacre vermelho, Pirata One | Título, Texto |
| **Fantasia** | Édito real | 1100 × 1500 | iluminura (moldura medieval), capitular, UnifrakturMaguntia e Cormorant Garamond | Título, Texto, Assinatura |
| | Mapa rasgado | 1400 × 1000 | kraft antigo, rasgos, rosa dos ventos e traços desenhados (formas), campo de imagem para o mapa | Mapa, Legenda |
| | Cartaz de procurado | 1000 × 1400 | papel kraft usado, título em Anton, recompensa em Bebas Neue, foto com borda serrilhada, buracos de tacha | Foto, Nome, Recompensa, Crime |
| **Cotidiano** | Recibo | 700 × 1100 | papel fino, VT323 ou Courier, linha picotada | Estabelecimento, Itens, Total, Data |
| | Passagem de trem | 1200 × 500 | cartolina, picote, número | Origem, Destino, Data, Assento |
| | Cartão de visita | cartão | cartolina, Cormorant Garamond | Nome, Ofício, Endereço |
| | Ingresso de teatro | 1200 × 500 | ornamentos art déco | Espetáculo, Data, Poltrona |
| | Polaroide com legenda · frente e verso | polaroide (dois) | moldura polaroide, legenda à mão; verso com dedicatória | Foto, Legenda; Dedicatória |
| **Tecnologia** | Conversa de celular | 900 × 1800 | interface de mensagem fictícia (balões como formas), Share Tech Mono | Contato, Mensagens |
| | E-mail impresso | A4 | cabeçalho de e-mail, fonte de tela, papel de impressora | De, Para, Assunto, Corpo |
| | Tela de terminal | 1600 × 1000 | fundo preto, texto VT323 verde, linhas de varredura (efeito `grain`) | Texto |

Modelos com "frente e verso" são dois modelos com `backTemplate` no item do manifesto: ao usar, o editor cria os dois documentos e liga `back` nos dois sentidos.

## Gravar um modelo na coleção

`npm run colecao:modelo -- --handout <id> --slug <slug> --category "<categoria>" [--back <slug do verso>]`:

1. lê o documento de `<dataDir>/handouts/<id>.json`;
2. confere: só `src.library` com prefixo `casa-` (ou `src: null` em campos de imagem), fontes com `library` `casa-…`, campos não vazios, nenhum `src.upload` (imagens enviadas não vão para a coleção: use um campo de imagem vazio);
3. grava `public/colecao/modelos/<slug>.json` (id `casa-tpl-<slug>`, `revision: 0`, `source: { kind: 'blank' }`);
4. gera a prévia renderizando no navegador (Playwright, `window.__atelie.renderHandout`, lado maior 480) em `public/colecao/previews/casa-tpl-<slug>.webp`;
5. atualiza o manifesto (`kind: 'template'`, `fields`, `backTemplate`).

## Folha de contato

`docs/referencias/colecao-modelos.png`: as 36 prévias em grade, por categoria. Revise com o usuário antes de dar a etapa como pronta.

## Testes

- `tests/colecao-templates.test.js`: cada modelo do manifesto existe, passa em `validateHandout`, usa só itens `casa-` e fontes da coleção, tem ao menos um campo, e `backTemplate` (quando há) aponta para um modelo existente; os 36 estão presentes.
- `tests/e2e/templates.test.js`: abrir três modelos (um de cada categoria, um com verso, um com UV) pelo modo Preencher, mudar um campo e conferir que o canvas muda; o de verso cria dois documentos ligados.

## Pronto quando

- [ ] Testes passam; `npm test` passa.
- [ ] Folha de contato revisada com o usuário; os ajustes pedidos foram feitos.
- [ ] `public/colecao/` inteiro dentro de 60 MB.
