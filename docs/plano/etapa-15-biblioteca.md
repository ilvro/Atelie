# Etapa 15 — Biblioteca no editor e modo "Preencher"

Leia antes: `00-LEIA-PRIMEIRO.md`, `PLANO-INTERFACE.md`, `etapa-06-armazenamento.md` (formato da biblioteca, `sources`, cliente), `src/ui/shell.js`, `src/ui/primitives.js`, `src/editor/editor.js`, `src/editor/properties-panel.js`, `src/data/api.js`, `src/data/handout-fonts.js`, `src/domain/handouts.js` (`setField`, `fillFields`, `imageLayer`).

## Objetivo

Usar a biblioteca no editor com o prazer de mexer numa gaveta de papelaria: procurar e pôr elementos na página (clicando ou arrastando), aplicar fontes, abrir modelos; e o caminho rápido de quem só quer um documento pronto: abrir um modelo e **preencher os campos**. Funciona igual com a coleção da casa sozinha ou com expansões.

## Gaveta Biblioteca

- Topo: busca (sem acento, em nome, categoria e tags) e chips de tipo: **Elementos · Fontes** (os modelos têm gaveta própria, etapa 17).
- **Origem**: chips `Tudo · Coleção do Ateliê · <cada expansão>` (de `sources`); itens de expansão levam um pequeno `.at-stamp` com o nome curto da expansão. Sem expansões, os chips de origem não aparecem.
- **Favoritos**: estrela em cada item (guardados em `localStorage`, `atelie-favorites`); chip **Favoritos**.
- Categorias do tipo ativo como fitas (`.at-tape`) recolhíveis, com contagem; ordem: Papéis, Manchas, Sangue, Água, Sujeira, Queimado, Amassados, Dobras, Rasgos, Carimbos, Selos, Prendedores, Fitas, Etiquetas, Lacres, Molduras, Ornamentos, Emblemas, Símbolos, Marcas, Digitais, e depois as das expansões em ordem alfabética.
- Grade de `.at-card` (3 colunas, inclinação de `tiltOf`), prévia com `loading="lazy"`, nome embaixo em Courier Prime. 60 por vez, "Mostrar mais" (ou rolagem infinita com `IntersectionObserver`).
- Passar o mouse mostra uma prévia maior (240 px) ao lado, depois de 400 ms.

### Pôr um elemento na página

- **Clique**: nova camada `image` com `src: { library: id }`, acima da selecionada, centralizada, proporção do item, largura `min(item.width, page.width × 0,5)`.
- **Shift + clique** (ou "Cobrir a página" no menu de contexto do item): ocupa a página inteira com `fit: 'cover'` — o jeito de usar um **papel** como fundo: entra **abaixo de tudo** se a categoria for `Papéis`.
- **Arrastar** para a página: a miniatura "levanta" (seção 4 do plano de interface) e a camada nasce onde soltou.
- **Mesclagem e cor iniciais** (`defaultsFor(item)` em `src/editor/library-defaults.js`, puro e testado):

| Categoria (ou palavra no nome da categoria de uma expansão) | Mesclagem | Outros |
|---|---|---|
| Papéis | normal | cobrindo a página, no fundo |
| Manchas, Água, Sujeira, Queimado, Digitais, Sangue, ou `mancha`, `sujeira`, `café`, `queimad`, `sangue`, `poeira` | multiply | — |
| Amassados, Dobras, ou `amassad`, `dobrad`, `textura` | soft-light | cobrindo a página |
| Carimbos, Selos, Marcas, Ornamentos, Símbolos (monocromáticos) | multiply | `tint` com a cor de tinta atual (azul-escuro `#1f2f6b` para carimbos, `#a3202a` para os de "NEGADO/URGENTE/CANCELADO", preto para o resto); opacidade .9 |
| Rasgos | normal | `clip` desligado; uma nota explica que se usa recortando o papel (etapa 11) |
| o resto | normal | — |

### Fontes

- Cada fonte com o nome e a amostra "Querida Lia, não procure por mim." na própria fonte (carregue quando entra na tela).
- Com um texto selecionado, clicar aplica: `text.font = { family: item.family, library: item.id, weight: item.weight, italic: item.style === 'italic' }`.

### Biblioteca indisponível

No modo navegador, ou sem expansões, nada muda para a coleção da casa. Uma linha discreta no fim da gaveta: "Expansões (como o *Arquivos Confidenciais*) se instalam pelo terminal; veja `docs/MANUTENCAO.md`." — só no modo servidor.

## Modo "Preencher"

- Aba **Preencher** do inspetor, visível quando `handout.fields` não está vazio, e que **abre sozinha** ao usar um modelo com campos.
- Um campo por item de `fields`, na ordem, com o rótulo em `.at-tape` pequena: texto curto → `<input>`; com `\n` → `<textarea>` que cresce; imagem → a miniatura e **Trocar imagem** (enviadas, com **Enviar imagem…**, e os elementos da biblioteca).
- Editar chama `fillFields` com `coalesce: 'fill-' + layerId`. Clicar no rótulo destaca a camada na página (contorno pulsando uma vez) sem trocar de aba.
- Um botão **Preencher com exemplo** em cada campo de texto põe um texto plausível do tipo do campo (nome, data, endereço, texto de carta) a partir de listas curtas em português em `src/editor/sample-text.js` (nomes e sobrenomes comuns, datas de 1890 a 2020, frases). Bom para testar a cara do documento.
- Nas Propriedades de uma camada de texto ou imagem: check **Campo do Preencher** e **Rótulo** (`setField`).

## Testes

- `tests/library-defaults.test.js`: a tabela acima (inclusive categorias de expansão por palavra).
- `tests/library-search.test.js`: busca sem acento, por categoria e tag; filtro por origem e por favoritos.
- `tests/e2e/library.test.js`, com uma coleção de teste mínima (passe `collection` e `expansionsDir` temporários ao `createApp`: na coleção, um papel, uma mancha, um carimbo SVG e uma fonte — copie uma das fontes da coleção real ou `src/ui/fonts/…`; numa expansão "teste", um elemento de categoria "Sangue"):
  1. A gaveta lista os 4 itens da casa e o da expansão com o carimbo de origem; o chip "Coleção do Ateliê" esconde o da expansão.
  2. Clique na mancha → camada `multiply`; Shift + clique no papel → camada no fundo cobrindo a página; o carimbo → `tint` azul-escuro.
  3. Arrastar o elemento da expansão para a página cria a camada no ponto.
  4. Favoritar e filtrar por favoritos.
  5. Fonte aplicada a um texto muda `text.font.library`.
  6. Abrir um modelo com campos (crie um no teste) → a aba Preencher abre; editar muda o canvas; **Preencher com exemplo** põe um texto não vazio.

## Pronto quando

- [ ] Testes passam; `npm test` e os E2E passam.
- [ ] Captura `docs/referencias/atelie-biblioteca.png` com a gaveta aberta sobre a mesa e um documento sendo montado.
