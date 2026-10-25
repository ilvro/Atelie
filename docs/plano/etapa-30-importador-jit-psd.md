# Etapa 30 — Importador de Bundles Sob Demanda (JIT) no Navegador

Leia antes: `00-LEIA-PRIMEIRO.md` (seções "A coleção da casa e as expansões", "Onde os apps rodam"), `etapa-23-psd-leitura.md`, `etapa-24-psd-compositor.md`, `etapa-25-psd-modelos.md`, `etapa-29-expansao-no-navegador.md`, `src/data/expansion-installer.js`.

---

## 1. Objetivo

Permitir que **qualquer pessoa com os pacotes brutos dos Arquivos Confidenciais** (ou similares) no computador possa usá-los no Ateliê publicado no GitHub Pages **sem precisar rodar Node.js, scripts CLI ou terminal**, e sem sobrecarregar a memória RAM do navegador:

1. A pessoa seleciona ou arrasta a pasta de um bundle (ou raiz do acervo) na gaveta **Modelos**.
2. O navegador faz uma **indexação rasa (zero RAM)**, associando nomes de PSDs às imagens já existentes na pasta `Prévias/`.
3. Os modelos aparecem instantaneamente na gaveta com suas fotos reais.
4. Ao clicar em **"Usar este modelo"**, o arquivo `.psd` correspondente é lido e convertido **sob demanda (*Just-In-Time*)** no próprio navegador, salvando o resultado no IndexedDB para aberturas instantâneas futuras.

---

## 2. Funcionamento Detalhado

### A. Seleção e Indexação da Pasta (Zero RAM)

* **Entrada:** `showDirectoryPicker()` (Chromium) com fallback para `<input type="file" webkitdirectory>`.
* **Reconhecimento da estrutura:**
  * O scanner identifica pastas de bundles contendo a trinca:
    * Arquivos `.psd` (documentos originais);
    * Subpasta `Prévias/` (ou `Previas/`): imagens `.png`/`.jpg` prontas do autor;
    * Subpasta `Fontes/`: fontes `.ttf`/`.otf` necessárias para os textos.
* **Mapeamento:**
  * Relaciona cada PSD (ex: `1- Bilhete.psd`) à sua imagem em `Prévias/` (ex: `1- Bilhete.png`).
  * Gera miniatura WebP de 320 px no Canvas nativo e grava em cache temporário.
  * Registra o catálogo de modelos pendentes no IndexedDB com status `pending`.

### B. Exibição na Gaveta de Modelos

* Os modelos locais aparecem com a etiqueta da expansão e o selo de origem.
* O usuário pode filtrar por categoria, origem e busca textual por nome.
* Modelos pendentes têm um indicador sutil de que serão preparados no primeiro uso.

### C. Conversão Just-In-Time (JIT)

Quando o usuário clica em **"Usar este modelo"**:

1. **Verificação de cache:** Se o modelo já estiver convertido (`status === 'ready'`), abre imediatamente (< 50 ms).
2. **Se pendente:**
   * Abre diálogo artesanal com barra de progresso: *"Preparando documento..."*.
   * Carrega dinamicamente o motor de PSD client-side (`ag-psd` via `import()` dinâmico, sem pesar no bundle inicial).
   * Lê o buffer **apenas daquele arquivo `.psd` selecionado**.
   * Extrai árvore de camadas, posições de texto, alinhamentos e caixas delimitadoras (reaproveitando lógica pura de `psd-tree.js` e `psd-geometry.js`).
   * Renderiza a composição das camadas de fundo em `<canvas>` nativo e exporta para WebP (`canvas.toBlob('image/webp', 0.85)`).
   * Registra as fontes da pasta `Fontes/` no navegador via `new FontFace(...)` e `document.fonts.add()`.
   * Salva o modelo final em `items` e os WebPs em `files` no IndexedDB (`atelie-expansions-v1`).
   * Limpa referências e força liberação de memória (`canvas.width = 0; canvas.height = 0`).
   * Abre o documento pronto para preenchimento e edição na bancada.

---

## 3. Arquivos e Componentes

```text
src/data/bundle-scanner.js          # Scanner de pastas, emparelhamento de nomes (PSD <-> Prévia <-> Fontes)
src/editor/client-psd-converter.js  # Motor client-side de conversão JIT (Canvas + ag-psd dinâmico)
src/ui/conversion-dialog.js         # Modal artesanal com barra de progresso e cancelamento
src/editor/templates-drawer.js      # Integração de drop de pastas e modelos pendentes
src/data/expansion-installer.js     # Armazenamento e persistência no IndexedDB
tests/bundle-scanner.test.js        # Testes unitários de escaneamento e mapeamento
tests/e2e/bundle-import.test.js     # Teste E2E de fluxo completo no navegador
```

---

## 4. O que NÃO Fazer

* **Não ler todos os PSDs de uma vez:** Nunca faça `readPsd` em lote durante a seleção da pasta. A memória RAM estouraria a aba do navegador.
* **Não incluir `ag-psd` no bundle inicial:** O carregamento deve ser estritamente preguiçoso (`await import(...)`) para manter o carregamento do Ateliê em menos de 100 ms.
* **Não enviar nada para a rede:** Todos os arquivos continuam exclusivamente na máquina do usuário e no IndexedDB local.
* **Não violar direitos autorais:** Nenhuma prévia ou arte dos Arquivos Confidenciais é incluída no repositório Git ou no build do GitHub Pages.

---

## 5. Pronto Quando

- [ ] Selecionar ou arrastar uma pasta de bundle (como `Bundle 18`) lista todos os seus modelos na gaveta de Modelos com as prévias reais em segundos.
- [ ] Clicar em "Usar este modelo" em um modelo pendente abre o diálogo de progresso, converte o PSD e abre o documento editável com textos no lugar certo.
- [ ] O modelo convertido persiste no IndexedDB e abre instantaneamente nas próximas sessões.
- [ ] Testes unitários e testes E2E com pasta mock passam com sucesso.
- [ ] `npm run build:pages` e `npm test` continuam 100% verdes e com orçamentos de bundle respeitados.
