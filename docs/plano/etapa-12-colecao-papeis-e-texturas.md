# Etapa 12 — Coleção da casa · papéis e texturas

Leia antes: `00-LEIA-PRIMEIRO.md` (seção "A coleção da casa"), `etapa-06-armazenamento.md` (formato da biblioteca), `src/render/handout-effects.js` e `src/domain/noise.js` (etapa 11, se o ruído estiver lá), `public/colecao/library.json`, `server/paths.js`.

## Objetivo

O Ateliê tem de ser **completo sem expansão nenhuma**. Esta etapa cria, por código e com licença própria, os papéis e as texturas de sobreposição que todo documento usa: folhas de vários tipos e idades, manchas, sangue, água, sujeira, queimado, amassados, dobras e digitais. Tudo vai para `public/colecao/`, entra no git e funciona no site estático.

Qualidade é o ponto: o resultado tem de aguentar a comparação com as texturas do acervo pago (só para comparar, na sua máquina; nada dele é copiado ou usado como base).

## Gerador (`scripts/colecao/`)

```
scripts/colecao/
  noise.js          # se o ruído ainda não estiver em src/domain/noise.js, crie lá (puro) e importe daqui
  raster.js         # buffer RGBA Float32 → sharp → WebP; desenhar manchas, linhas, máscaras
  papers.json       # receitas dos papéis
  papers.js         # gera os papéis
  overlays.js       # gera as texturas de sobreposição
  build.js          # roda tudo, grava arquivos e prévias, atualiza public/colecao/library.json
```

`npm run colecao:texturas` (acrescente ao `package.json`). Gera em Node, com typed arrays e `sharp` (já é dependência de desenvolvimento). **Determinístico**: cada receita tem `seed`; gerar duas vezes produz os mesmos bytes.

### Ruído (`src/domain/noise.js`, puro, testado)

`mulberry32(seed)`, `valueNoise2D(seed)` → `(x, y) → 0..1` suave (interpolação *smoothstep* entre pontos de grade), `fbm(noise, x, y, { octaves, lacunarity = 2, gain = .5 })`, `worley2D(seed)` → distância à célula mais próxima (para fibras e manchas), `domainWarp(noise, x, y, amount)`.

### Papéis (`papers.json` + `papers.js`)

Tamanho: retrato com lado maior **2400 px** (proporção da folha: A4 1 : 1,414; jornal, kraft e pergaminho também; papéis pequenos, como o de telegrama, na sua proporção). WebP `quality: 80`. Meta: ≤ 600 KB cada.

Camadas de cada papel, nesta ordem (todas parametrizadas na receita):

1. **Cor base** (`base`).
2. **Manchado** (`mottle`: fbm de baixa frequência, `scale`, `strength`): variação de tom em nuvens largas, como papel real.
3. **Fibras** (`fibers`: segmentos curtos e finos em direções aleatórias, claros e escuros, `density`, `length`).
4. **Grão** (`grain`: ruído de alta frequência, `strength`).
5. **Pauta / grade** (opcional, `lines`): pauta azul com margem vermelha (caderno), margem dupla (almaço), quadriculado, milimetrado verde; com leve tremor (a tinta não é perfeita) e falhas.
6. **Envelhecimento** por idade (`age`: `novo`, `usado`, `antigo`): amarelamento (mistura com `#d8b77a` crescente), **foxing** (pintas marrons de 1–6 px em grupos, só em `usado` e `antigo`), bordas escurecidas (gradiente das bordas para dentro), desbotamento das linhas.
7. **Borda** (`edge`: `reta`, `serrilhada` para papel rasgado à mão, `deckle` para pergaminho e papel artesanal): recorta o alfa.

Os 16 papéis, cada um em três idades (48 arquivos):

| Papel | Cor base | Detalhes |
|---|---|---|
| Ofício branco | `#f4f1ea` | grão fino, quase sem manchado |
| Ofício creme | `#efe6d2` | manchado suave |
| Papel jornal | `#e3dccb` | fibras escuras visíveis, grão forte, amarela muito com a idade |
| Kraft | `#b8916a` | fibras longas escuras, manchado forte |
| Pergaminho | `#e6d3a8` | manchado em nuvens grandes, borda `deckle`, foxing mesmo em `novo` |
| Carta pautada | `#f3eee2` | pauta cinza-azulada fina |
| Caderno | `#f7f4ea` | pauta azul, margem vermelha, furos de espiral (opção) |
| Quadriculado | `#f6f3ea` | grade azul de 5 mm |
| Milimetrado | `#f3f1e6` | grade verde, linha forte a cada 10 mm |
| Almaço | `#f2ecdc` | pauta com margem dupla vermelha |
| Telegrama | `#efe4bf` | amarelo pálido, grão médio (proporção 1,4 : 1, deitado) |
| Cartolina | `#c9cfd3` | cinza-azulado, fibras médias |
| Papel de seda | `#f2efe8` com alfa .85 | fino, translúcido |
| Papel fotográfico (verso) | `#f6f5f0` | liso, com a marca d'água própria "PAPEL FOTOGRÁFICO" repetida em diagonal, bem clara |
| Papel de máquina (*onionskin*) | `#f1eee4` | muito fino, grão quase nenhum |
| Papel carbono | `#1f2a5a` | azul escuro, brilho irregular |

Ids: `casa-papel-<slug>-<idade>`; categoria `Papéis`; tags com o tipo e a idade.

### Texturas de sobreposição (`overlays.js`)

PNG/WebP com alfa, para usar com mesclagem (o editor escolhe a mesclagem inicial pela categoria, etapa 15). Lado maior 2048 (as de página inteira) ou 1024 (as de detalhe).

| Categoria | Quantas | Como gerar |
|---|---|---|
| Manchas de café | 8 | anéis (contorno escuro irregular por ruído angular, miolo claro), respingos, marca de fundo de xícara incompleta |
| Água e umidade | 6 | manchas grandes de borda escura (marca seca), escorridos verticais |
| Sangue | 12 | gotas com cauda, respingos em leque, impressão de dedo, arrasto, poça seca com borda escura; tons do vermelho vivo ao marrom |
| Sujeira e poeira | 6 | pontos e manchas finas, mancha de graxa, marcas de dedo sujo |
| Queimado | 5 | bordas queimadas (página inteira, com alfa), um furo de cigarro, chamuscado de canto |
| Amassados | 4 | mapas de vinco para `soft-light` (cinza 50 % com vincos claros e escuros) |
| Dobras | 4 | uma, duas e três dobras, e dobra em cruz |
| Digitais | 4 | impressões digitais (espirais de cristas por ruído e senóides), em tinta e em sangue |
| Rasgos | 4 | máscaras de borda rasgada (alto, baixo, canto, meio) para usar com recorte |

Ids `casa-<categoria>-<n>`; categoria em português (`Manchas`, `Água`, `Sangue`, `Sujeira`, `Queimado`, `Amassados`, `Dobras`, `Digitais`, `Rasgos`).

### Prévias e manifesto

- Prévia de cada item: lado maior 320 px, WebP `quality: 76`, em `public/colecao/previews/`.
- `build.js` atualiza `public/colecao/library.json` (só os itens destas categorias: preserve os das outras etapas), com `license: 'própria'` e `generatedAt`.
- Orçamento: `public/colecao/` inteiro ≤ 60 MB ao fim da etapa 16. Anote no `progress.md` o tamanho desta etapa.

### Folha de contato

`scripts/colecao/contact-sheet.js` gera `docs/referencias/colecao-papeis.png` e `colecao-texturas.png` (prévias em grade, com nome). Abra, olhe com atenção e compare com as prévias de `Assets/…/Texturas de Papel`, `Manchas`, `Sangue` do acervo (no HD, só para comparar). Ajuste receitas até que um jogador não saiba dizer qual é gerada.

## Testes

- `tests/noise.test.js`: determinismo, faixa 0..1, `fbm` suave (vizinhos próximos diferem pouco).
- `tests/colecao-papers.test.js`: cada receita de `papers.json` é válida; gerar um papel pequeno (256 px) duas vezes dá o mesmo hash; um papel `antigo` é mais amarelo e mais escuro nas bordas que o `novo` (médias de cor no centro e na borda).
- `tests/colecao-manifest.test.js`: todo arquivo citado em `public/colecao/library.json` existe; todo arquivo em `public/colecao/` (exceto `library.json`, `README.md`, licenças) está no manifesto; todo item tem `license`; nenhum id fora do prefixo `casa-`.

## Pronto quando

- [ ] Testes passam; `npm test` passa.
- [ ] `docs/referencias/colecao-papeis.png` e `colecao-texturas.png` existem e foram revisadas (descreva no `progress.md` o que foi ajustado depois de olhar).
- [ ] No editor, um documento feito só com estes papéis e texturas parece um documento envelhecido de verdade (captura em `docs/referencias/colecao-exemplo.png`).
