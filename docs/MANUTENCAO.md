# Guia de Manutenção e Expansões — Ateliê de Documentos

Este documento destina-se a desenvolvedores, mantenedores e criadores de conteúdo do **Ateliê de Documentos**. Ele detalha os procedimentos para regenerar a coleção da casa, manter os orçamentos de tamanho e desempenho, instalar e converter pacotes de expansão privados, ler relatórios de integridade e preservar o isolamento rigoroso entre acervos públicos e privados.

---

## 1. Coleção da Casa (Acervo Público)

A **coleção da casa** reside em \`public/colecao/\` e é distribuída junto com o código-fonte do Ateliê no repositório Git. O app é 100% completo, rico e jogável exclusivamente com esta coleção.

### Estrutura de Diretórios da Coleção
\`\`\`text
public/colecao/
├── library.json         # Manifesto consolidado (schema 1) de todos os itens públicos
├── papeis/              # 75 papéis em WebP (25 receitas × 3 idades, sobre escaneamentos CC0)
├── texturas/            # 53 sobreposições de acabamento em WebP com canal alfa
├── elementos/           # 140 ilustrações vetoriais em SVG (carimbos, selos, grampos)
├── fontes/              # 40 famílias de fontes livres auto-hospedadas (OFL-1.1 e Apache-2.0)
│   ├── LICENCAS.md      # Catálogo de licenças e commits do google/fonts
│   ├── ofl/
│   └── apache/
├── modelos/             # 39 modelos de documentos canônicos em JSON
└── previews/            # Miniaturas otimizadas em WebP (320 px) para a gaveta Biblioteca
\`\`\`

### Orçamento de Tamanho da Coleção
O teto estrito para a pasta \`public/colecao/\` é de **60 MB** para garantir carregamento instantâneo e leveza na publicação no GitHub Pages:
- **Papéis e texturas**: ~7,8 MB.
- **Fontes livres**: ~8,5 MB.
- **Elementos vetoriais e modelos**: ~1,2 MB.
- **Miniaturas (previews)**: ~3,5 MB.
- **Tamanho total atual**: **~21 MB** (amplamente abaixo do limite de 60 MB).

### Comandos de Regeneração da Coleção

1. **Regenerar papéis e texturas procedurais**:
   \`\`\`bash
   npm run colecao:texturas
   \`\`\`
   Executa \`scripts/colecao/build.js\`, que sintetiza os 75 papéis (\`scripts/colecao/papers.js\`) e as 53 sobreposições (\`scripts/colecao/overlays.js\`) utilizando ruídos matemáticos determinísticos (\`src/domain/noise.js\`) e exportação via biblioteca \`sharp\`.

2. **Reconstruir modelos e prévias da casa**:
   \`\`\`bash
   npm run colecao:modelos
   \`\`\`
   Valida todos os modelos em \`public/colecao/modelos/\` via \`validateHandout\` e gera as miniaturas WebP em \`public/colecao/previews/\`.

3. **Atualizar registro de licenças**:
   \`\`\`bash
   node scripts/licenses.js
   \`\`\`
   Lê o manifesto \`public/colecao/library.json\` e atualiza de forma determinística o documento \`docs/LICENCAS.md\`.

---

## 2. Expansões Privadas (Regra de Privacidade)

> [!CAUTION]
> **Regra de Ouro da Privacidade**:
> O Ateliê tem de ser completo sem expansão nenhuma. Expansões proprietárias ou de terceiros (como o acervo *Arquivos Confidenciais*) são **estritamente privadas**:
> - **NUNCA** adicione arquivos de expansão ao Git.
> - **NUNCA** copie arquivos de expansão para \`public/\`, \`dist/\` ou \`dist-pages/\`.
> - Arquivos de expansão residem única e exclusivamente em \`data-private/expansoes/\`.
> - A suíte de testes \`tests/privacy.test.js\` e \`tests/pages-build.test.js\` falhará imediatamente se qualquer arquivo ou menção privada for detectada fora de \`data-private/\`.

### Estrutura de uma Expansão
As expansões são armazenadas por identificador de slug sob \`data-private/expansoes/\`:
\`\`\`text
data-private/expansoes/
└── ac/                  # Exemplo: Arquivos Confidenciais
    ├── library.json     # Manifesto isolado da expansão
    ├── elementos/       # Imagens e recortes rasterizados ou vetoriais
    ├── fontes/          # Fontes tipográficas da expansão
    ├── modelos/         # Modelos editáveis convertidos
    └── previews/        # Miniaturas de 320 px da expansão
\`\`\`

---

## 3. Importação de Elementos e Fontes (Etapa 22)

Para importar grandes acervos de imagens soltas (carimbos, selos, papéis, texturas) e fontes tipográficas para uma expansão privada, utilize a ferramenta CLI em \`scripts/library/import.js\`:

\`\`\`bash
node scripts/library/import.js --src /caminho/para/pasta --expansion ac
\`\`\`

### Parâmetros Suportados:
- `--src`: diretório de origem contendo imagens (`.png`, `.jpg`, `.webp`, `.svg`) ou fontes (`.ttf`, `.otf`, `.woff2`).
- `--expansion`: identificador da expansão (padrão: `ac`).
- `--category`: categoria padrão para classificar os elementos importados.

O importador redimensiona imagens excessivamente grandes, gera miniaturas WebP de 320 px, extrai os nomes PostScript das fontes e atualiza o manifesto `library.json` da expansão.

---

## 4. Conversão de Modelos PSD para o Ateliê (Etapa 25)

Arquivos PSD complexos do Photoshop (com múltiplas camadas, máscaras, camadas de texto, objetos inteligentes e variações) são convertidos em modelos nativos do Ateliê pelo script CLI \`scripts/library/import-psd.js\`:

\`\`\`bash
node scripts/library/import-psd.js --src data-private/expansoes/ac/psd --dest data-private/expansoes/ac/modelos
\`\`\`

### Pipeline de Conversão:
1. **Leitura da árvore PSD (`psd-tree.js`)**: leitura em nó puro da estrutura de camadas, máscaras, textos e efeitos sem carregar pixels desnecessários na memória.
2. **Casamento inteligente de fontes (`font-match.js`)**:
   - Nível 1: PostScript exato.
   - Nível 2: Normalização de slugs de família e subfamília.
   - Nível 3: Prefixo da família com heurística de peso (Bold, Light, Black) e itálico.
3. **Extração de texto e campos semânticos**:
   - Camadas de texto são convertidas em camadas `text` com alinhamento, fonte equivalente e estilo de tinta.
   - Camadas identificadas por palavras-chave (`foto`, `retrato`, `placeholder`) são transformadas em campos de imagem na aba *Preencher*.
4. **Camadas de ajuste e luz UV**:
   - Camadas de ajuste do Photoshop (matiz/saturação, curvas, níveis, preto e branco) viram camadas `adjust`.
   - Camadas agrupadas sob pastas com termos como "UV" ou "Luz Negra" recebem automaticamente o atributo `light: "uv"`.
5. **Fusão inteligente de fundo (`mergeBackground`)**:
   - Camadas decorativas contínuas no fundo são compostas em uma única imagem de fundo, reduzindo a complexidade para entre 5 e 30 camadas editáveis por modelo.

### Relatório de Conversão (`report.json`)
Cada execução gera um relatório detalhado:
- `totalConverted`: quantidade de modelos gerados com sucesso.
- `matchedFonts`: lista de correspondências de fontes realizadas.
- `warnings`: avisos de camadas não suportadas ou truncadas.
- `status: "revisar"`: modelos que necessitam de inspeção humana (veja abaixo).

---

## 5. Como Lidar com Modelos Marcados como "Revisar"

Um modelo é marcado com a tag `"revisar"` quando o conversor automatizado encontra ambiguidades ou recursos que exigem decisão artística:
- **Fonte não encontrada**: a fonte original do PSD não possui correspondente idêntico na coleção; foi aplicada uma fonte aproximada que pode necessitar de ajuste de espaçamento.
- **Modos de mesclagem complexos**: efeitos como *Vivid Light*, *Linear Light* ou *Color Dodge* foram aproximados para *Normal* ou *Overlay*.
- **Transformações de perspectiva**: objetos inteligentes deformados em ângulos livres foram rasterizados com a flag `perspective: true`.

### Procedimento de Revisão:
1. Inicie o servidor local com `npm run dev`.
2. Abra a gaveta **Modelos** e filtre pela tag `revisar`.
3. Abra o modelo na bancada de trabalho.
4. Confira na aba **Preencher** se os campos semânticos (títulos, datas, assinaturas) estão legíveis e bem diagramados.
5. Na aba **Camadas**, confira o alinhamento de fotos e caixas de texto.
6. Ajuste a diagramação e salve o documento. A tag de revisão pode então ser removida do manifesto.

---

## 6. Verificação e Testes Contínuos

Antes de qualquer commit ou lançamento, execute a suíte de testes de integridade:

\`\`\`bash
# Testes unitários de domínio, coleções, privacidade, atalhos e licenças
npm test

# Testes de ponta a ponta (E2E) com Playwright
npm run test:e2e

# Teste de integridade do build para GitHub Pages
npm run build:pages
node --test tests/pages-build.test.js
\`\`\`

