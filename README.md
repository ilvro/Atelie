# Ateliê de Documentos

> A bancada de artesão digital para *handouts* de RPG: cartas envelhecidas, jornais de época, fichas de investigação, telegramas e polaroides, prontos para a mesa.

O **Ateliê** cria, edita e exibe documentos imersivos de RPG. Você parte de um dos 157 modelos da casa (ou de uma folha em branco), preenche os campos, manchas e carimbos, esconde mensagens que só aparecem sob **luz ultravioleta** e entrega o resultado ao [Tabletop](../Tabletop) ou o exporta como imagem para imprimir em escala real.

![Bancada do Ateliê de Documentos](docs/referencias/atelie-inicio.png)

## Destaques

| | |
|---|---|
| **Modelos prontos** | 157 modelos em 16 categorias (cartas, jornais, ficha policial, laudos médicos, ocultismo, fantasia, tecnologia…), com frente e verso. |
| **Preencher** | Edição rápida: só os campos do modelo, sem mexer em camadas. |
| **Editor completo** | Camadas, modos de mesclagem, máscaras, guias, réguas, histórico navegável e atalhos para tudo. |
| **Tinta e pincel** | Quatro estilos de tinta física, fontes de máquina de escrever e pontas de pincel com textura (caneta, lápis, giz, bico de pena, pincel seco, marcador, respingos e manchas). |
| **Efeitos procedurais** | Rasgar, cortar, queimar, dobrar, manchar e envelhecer, determinísticos por semente. |
| **Luz UV** | Camadas secretas que só aparecem sob luz negra, com a interface mudando de clima. |
| **Modo leitura** | Tela cheia com lupa 2,5×, lanterna UV, virar frente/verso e carrossel de documentos. |
| **Exportar e imprimir** | PNG em 2048 px ou 300 ppp, com ou sem UV, e layout de impressão 1:1 sem margens. |
| **Tutoriais interativos** | 15 lições guiadas dentro do próprio app (do primeiro modelo a rasgar e queimar papel). |
| **Funciona offline** | Roda como site estático (GitHub Pages) guardando tudo no IndexedDB, com cópia de segurança. |

## Início rápido

Requer **Node.js 22.12 ou superior**.

```bash
npm install
npm run dev
```

- Interface (Vite): http://127.0.0.1:5174
- Backend (Express): http://127.0.0.1:3011

Para servir só o backend com a interface já compilada: `npm run build && npm start`.

### Testes

```bash
npm test            # testes unitários e de servidor
npm run test:e2e    # ponta a ponta com Playwright (inclui os tutoriais)
```

### Versão estática (GitHub Pages)

```bash
npm run build:pages     # gera dist-pages/
npm run preview:pages   # serve localmente
```

O workflow em [.github/workflows/pages.yml](.github/workflows/pages.yml) publica a cada push na branch principal.

## O que vem na caixa

A **coleção da casa** (`public/colecao/`) é livre, vai no Git e deixa o app completo sem nada extra:

| Acervo | Conteúdo |
|---|---|
| Papéis | Papéis em três idades (novo, usado, antigo), além de escaneados |
| Texturas | 53 sobreposições de acabamento (manchas, dobras, umidade, desgaste) |
| Elementos | 294 vetores em SVG: carimbos, selos, prendedores, fitas, molduras |
| Fontes | 40 famílias livres (OFL-1.1 e Apache-2.0) |
| Modelos | 157 modelos (132 documentos e 25 variações) |

O orçamento da coleção é de 60 MB. Veja como regenerá-la em [docs/MANUTENCAO.md](docs/MANUTENCAO.md).

**Expansões privadas** (como o acervo *Arquivos Confidenciais*) ficam só em `data-private/expansoes/` ou são instaladas no navegador. Nunca entram no Git, em `public/`, `dist/` nem `dist-pages/`.

## Integração com o Tabletop

O Ateliê entrega documentos ao Tabletop por três caminhos, descritos em [docs/plano/CONTRATO-TABLETOP.md](docs/plano/CONTRATO-TABLETOP.md):

1. **IndexedDB compartilhado** (`mesa-handouts-v1`), para apps na mesma origem.
2. **Handoff por janela** (`postMessage`), com o Ateliê aberto em popup.
3. **API REST com CORS**, para servidores separados.

> O contrato vale para os dois lados: não o altere em um projeto sem alterar o outro.

## Estrutura do projeto

```
src/
  domain/     modelo de dados, pincel, efeitos, texto
  render/     renderizador em Canvas 2D
  editor/     palco, camadas, manipulação, histórico
  reading/    modo leitura
  tutorial/   motor de lições e as 15 lições
  data/       IndexedDB, backup, importadores, fontes do usuário
  ui/         casca, gavetas, atalhos, ajuda, temas
server/       Express: biblioteca, documentos, envios, CORS
scripts/      geradores da coleção, importadores, capturas
public/colecao/   coleção da casa (versionada)
data-private/     expansões privadas (fora do Git)
tests/            unitários e E2E
docs/             guias e plano de etapas
```

## Documentação

| Guia | Para quem |
|---|---|
| [Guia de Uso](docs/USO.md) | Quem cria documentos: modelos, camadas, tintas, UV, leitura, exportação e tabela de atalhos. |
| [Manutenção e Expansões](docs/MANUTENCAO.md) | Quem mantém o projeto: regenerar a coleção, importar elementos e fontes, converter PSD, privacidade. |
| [Publicação no GitHub Pages](docs/GITHUB_PAGES.md) | Build estático, IndexedDB, backup e integração com o Tabletop publicado. |
| [Licenças e Créditos](docs/LICENCAS.md) | Licenças de tudo o que é distribuído. |
| [Plano de etapas](docs/plano/00-LEIA-PRIMEIRO.md) | Histórico e decisões de projeto, uma etapa por vez. |
| [progress.md](progress.md) | Registro do que foi feito, validado e o que ainda está pendente. |

## Licença

Código sob **MIT**. A coleção da casa e as fontes têm licenças livres próprias, todas registradas em [docs/LICENCAS.md](docs/LICENCAS.md).
