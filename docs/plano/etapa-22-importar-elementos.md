# Etapa 22 — Importar elementos, símbolos e fontes

Leia antes: `00-LEIA-PRIMEIRO.md` (inclusive "Referências"), `etapa-06-armazenamento.md` (seção "Formato da biblioteca"), `server/paths.js`, `server/storage.js` (`atomicWrite`).

## Objetivo

Um script de linha de comando que lê as imagens soltas, os símbolos e as fontes do *Arquivos Confidenciais* no HD e grava a biblioteca privada: imagens reduzidas em WebP, prévias, fontes e o `library.json`. Pode rodar de novo: só processa o que mudou.

```
npm run library:elements -- --source "/home/ilvro/Documents/RPG - Conteúdo/RPG - Conteúdo/Arquivos Confidenciais" [--only assets|symbols|fonts] [--limit 50] [--dry-run]
```

## A expansão

Tudo vai para `expansionDir('arquivos-confidenciais')` = `data-private/expansoes/arquivos-confidenciais/`, que é uma **expansão**: o Ateliê funciona completo sem ela (coleção da casa, etapas 12 a 16) e a usa quando existe. Na primeira execução, grave `expansion.json`:

```js
{ id: 'arquivos-confidenciais', name: 'Arquivos Confidenciais', description: 'Acervo da comunidade de Ordem Paranormal (Catarse). Uso pessoal.', license: 'uso pessoal, não redistribuir', createdAt }
```

Os ids dos itens desta expansão começam com `ac-` (`ac-el-…`, `ac-font-…`, `ac-tpl-…`), para nunca colidir com a coleção da casa (`casa-…`) nem com outra expansão. Ajuste `elementId` e `fontId` abaixo para acrescentar o prefixo.

## O que o acervo tem (medido em 24/10/2026)

- `Assets/<ano>/<mês>/<Categoria (n)>/<arquivo>.png|jpg` — 1 723 JPG e 774 PNG; categorias como `Sangue`, `Manchas`, `Fitas`, `Prendedores`, `Polaroides`, `Papéis Amassados`, `Papéis Rasgados e Chamuscados (16 + 100)`, `Texturas de Papel`, `Quadros Ornamentados`, `Doodles`, `Rabiscos Extras`, `Poeira PNG`. Alguns arquivos ficam soltos na pasta do mês (`Doodles (30).png`).
- `Símbolos/<ano>/<mês>/…` — símbolos e marcas em PNG.
- Fontes: `.ttf`/`.otf` soltos e dentro de `.zip`, em `Documentos/Bundle N/Fontes - Bundle N/` (ou `Fonte/`, `Fontes/`) e em `Assets/2024/06-2024 (2º) [Fontes! (100+)]/`.
- `Atribuição*.txt` em algumas pastas.

## Arquivos

```
scripts/library/import-elements.js     # CLI: lê argumentos, chama as funções abaixo, imprime um resumo
scripts/library/lib/catalog.js         # funções puras: categoria, tags, ids
scripts/lib/font-names.js              # já existe (etapa 14): lê nomes de TTF/OTF
scripts/library/lib/manifest.js        # ler, mesclar e gravar library.json
tests/handouts-import-elements.test.js
```

## Regras

### Categoria, nome, tags, id (`catalog.js`, puro)

```js
export function stripCount(name)            // 'Sangue (14)' → 'Sangue'; 'Papéis Rasgados e Chamuscados (16 + 100)' → 'Papéis Rasgados e Chamuscados'; '06-2024 (2º) [Fontes! (100+)]' → '06-2024'
export const isMonthFolder = name => /^\d{2}-\d{4}/.test(name) || /^\d{4}$/.test(name)
export function categoryOf(relativePath)    // a pasta mais funda que não é de ano/mês, sem contagem; se o arquivo está direto na pasta do mês, o nome do arquivo sem contagem e sem extensão
export function displayName(relativePath)   // 'Sangue (7).png' em 'Sangue' → 'Sangue 7'; nomes com palavras ficam como estão, sem extensão
export function tagsOf(relativePath)        // palavras de categoria e nome, minúsculas, sem números, sem palavras de 1–2 letras, sem repetir, até 12
export function slug(text)                  // minúsculas, sem acento (normalize('NFD') e tirar \p{Diacritic}), não alfanumérico → '-', no máximo 40
export function elementId(relativePath)     // 'el-' + slug(categoria) + '-' + 8 primeiros hex do sha1 do caminho relativo (estável entre execuções)
export function fontId(postscriptName)      // 'font-' + slug(postscriptName)
```

### Imagens

- Extensões `.png`, `.jpg`, `.jpeg`, `.webp`. Ignore arquivos com menos de 1 KB e imagens com mais de 80 megapixels (anote no relatório).
- Gere com `sharp`: `elements/<id>.webp` com lado maior até **2048 px** (`withoutEnlargement`), `quality: 86`, mantendo a transparência; `previews/<id>.webp` com lado maior 320, `quality: 78`.
- Item: `{ id, kind: 'element', name, category, tags, file, preview, width, height, source: { bundle: '<ano>/<mês>', path: '<caminho relativo à pasta --source>', attribution? } }` (largura e altura do arquivo **gerado**).
- **Duplicatas**: calcule o sha1 do conteúdo do arquivo original; se já houver item com o mesmo sha1, não gere outro: some as tags novas ao existente.
- `attribution`: se a pasta tiver um `Atribuição*.txt`, guarde o texto (até 2 000 caracteres).
- Símbolos (`--only symbols`): igual, com categoria `Símbolos` seguida da subpasta, se houver.

### Fontes

Use `readFontNames` de `scripts/lib/font-names.js` (criado na etapa 14). Fontes que já existem na coleção da casa (mesmo `postscript`) não são copiadas para a expansão.

- Procure fontes soltas e dentro de `.zip` (abra com `fflate.unzipSync`, ignore `__MACOSX/` e arquivos começando com `._`).
- `fonts/<fontId>.<ext>`; item `{ id, kind: 'font', name: fullName, category: 'Fontes', tags: [família em minúsculas, nome do pacote], file, family, postscript, weight, style: italic ? 'italic' : 'normal', source: { bundle, path } }`.
- `.woff`/`.woff2`: copie, use o nome do arquivo como `family` e `postscript` (sem ler tabelas), e anote no relatório.
- Mesmo `postscript` encontrado em vários pacotes: guarde só o primeiro.

### Manifesto (`manifest.js`)

```js
export async function readManifest(libraryDir)                 // { schema: 1, generatedAt, items: [] } se não existir
export function mergeItems(manifest, items, { replaceKinds })  // substitui itens de mesmo id; com replaceKinds, remove antes os desses tipos que não vieram de novo
export async function writeManifest(libraryDir, manifest)      // ordena por kind, categoria, nome; grava com atomicWrite; atualiza generatedAt
```

O importador de elementos **nunca** apaga itens `template` e `layer` (da etapa 25).

### Execução incremental e relatório

- `<expansão>/state/elements-index.json`: `{ [caminhoRelativo]: { size, mtimeMs, id, sha1 } }`. Arquivo com mesmo tamanho e data é pulado sem ler.
- Ao fim: `reports/elements-<AAAA-MM-DD-HHmm>.json` com `{ scanned, created, updated, skipped, duplicates, errors: [{ path, message }], tooLarge: [...] }` e um resumo de cinco linhas no terminal.
- O HD é lento: leia um arquivo por vez; gere com `sharp` em no máximo 4 tarefas ao mesmo tempo.
- `--dry-run`: não grava nada, só o resumo. `--limit N`: para depois de N arquivos (para testar).
- Erro num arquivo não para o script: vai para `errors`.

## Testes (`tests/handouts-import-elements.test.js`)

1. `stripCount`, `categoryOf`, `displayName`, `tagsOf` com os exemplos de cima, inclusive `Assets/2024/10-2024/Doodles (30).png` → categoria `Doodles`.
2. `elementId` é igual em duas chamadas e diferente para caminhos diferentes; `slug('Papéis Amassados')` é `papeis-amassados`.
3. Uma fonte com o mesmo `postscript` de uma fonte da coleção da casa não é copiada.
4. `mergeItems` substitui por id e, com `replaceKinds: ['element']`, remove elementos antigos sem tocar em `template`.
5. De ponta a ponta numa pasta temporária: gere com `sharp` duas imagens PNG (uma copiada duas vezes com nomes diferentes) e um `.zip` com uma fonte mínima (monte como em `tests/font-names.test.js`), em `Assets/2023/01-2023/Sangue (2)/` e `Documentos/Bundle 1 - X/Fontes - Bundle 1/`; rode a função principal do script com `--source` nessa pasta e a biblioteca noutra → `library.json` tem 1 elemento (a duplicata virou tag), 1 fonte com o `postscript` certo, os arquivos existem e a prévia tem lado maior 320. Rodar de novo cria 0 e pula 3.

## Pronto quando

- [x] Testes passam; `npm test` passa.
- [x] Rodado de verdade com `--limit 200` no acervo do usuário: a biblioteca aparece em `data-private/expansoes/arquivos-confidenciais`, `curl …/api/atelie/library` lista os itens, e `git status` continua limpo.
- [x] Anote no `progress.md` quanto tempo levou o `--limit 200` e o tamanho da pasta gerada, para estimar o acervo inteiro.

## Não faça

- Não leia PSDs (etapas 23 a 25).
- Não escreva nada fora de `expansionDir('arquivos-confidenciais')`. Não modifique nada no HD.
