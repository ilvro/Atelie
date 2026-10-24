# Progresso — Ateliê de Documentos

## Visão Geral

Implementação do Ateliê de Documentos (engine de documentos editáveis e imersivos para RPG), conforme plano em `docs/plano/`.

| Etapa | Situação | Data | Resumo |
|---|---|---|---|
| 1 — O projeto | concluída | 2026-10-24 | Estrutura inicial do projeto, Express, Vite, UI base, testes unitários e E2E |
| 2 — Identidade e casca | concluída | 2026-10-24 | Identidade visual, primitivas, fontes OFL, casca, gavetas, inspetor, ajustes, Ctrl+K |
| 3 — Modelo de dados | pendente | | Formato do documento e validações |
| 4 — Renderizador | pendente | | Desenho de camadas, mesclagens, recortes |
| 5 — Texto | pendente | | Renderização de textos, fontes e tintas |
| 6 — Armazenamento | pendente | | IndexedDB, servidor, biblioteca, coleções |
| 7 — Editor | pendente | | Palco, camadas, desfazer/refazer, propriedades |
| 8 — Manipulação | pendente | | Mover, redimensionar, girar camadas |
| 9 — Ferramentas do editor | pendente | | Guias, réguas, conta-gotas, colar imagens |
| 10 — Documentos e rascunho | pendente | | Gestão de documentos, rascunho automático |
| 11 — Efeitos procedurais | pendente | | Desgaste, manchas, dobras, queimado, sangue |
| 12 — Coleção papéis e texturas | pendente | | Coleção da casa: papéis e sobreposições |
| 13 — Coleção elementos | pendente | | Coleção da casa: vetores, carimbos, fitas |
| 14 — Coleção fontes | pendente | | Coleção da casa: 26 famílias de fontes |
| 15 — Biblioteca | pendente | | Gaveta Biblioteca e modo de preenchimento |
| 16 — Coleção modelos | pendente | | Coleção da casa: 36 modelos prontos |
| 17 — Início e galeria | pendente | | Tela de abertura e catálogo de modelos |
| 18 — Assar e entregar | pendente | | Renderização final e integração de entrega |
| 19 — Luz UV | pendente | | Camadas secretas visíveis sob luz negra |
| 20 — Modo leitura | pendente | | Leitura imersiva, lupa, lanterna UV, verso |
| 21 — Exportar e imprimir | pendente | | Exportação em alta resolução e folha A4 |
| 22 — Importar elementos | pendente | | Expansão: acervo Arquivos Confidenciais |
| 23 — PSD leitura | pendente | | Expansão: análise e estrutura de PSDs |
| 24 — PSD compositor | pendente | | Expansão: composição de PSD em Node |
| 25 — PSD modelos | pendente | | Expansão: conversão de PSD para modelos |
| 26 — Publicar no Pages | pendente | | Build estático e workflow do GitHub Pages |
| 27 — Documentação | pendente | | Manuais, guia de uso e licenças |
| 28 — Integração Tabletop | pendente | | Consumo e interação direta dentro do Tabletop |
| 29 — Expansão no navegador | pendente | | Expansão local no navegador (opcional) |

---

## Etapa 2 — Identidade visual e casca da interface

### Feito
- Download automatizado de fontes OFL da interface (`IM Fell English` e `Courier Prime`) do repositório `google/fonts` (commit `e7db6ca603fd4862010383ff17ffd6cc4ffac1c0`) via `scripts/fonts/fetch.js`, com integridade garantida por SHA-256 em `scripts/fonts/fonts.lock.json`.
- Substituição da camada de tokens `--tt-*` pela camada `--at-*` em `src/ui/theme.css`, definindo tipografia editorial, cores da bancada noturna, tinta ferrogálica, papel envelhecido, cera e violeta UV.
- Implementação das primitivas visuais em `src/ui/primitives.css` e `src/ui/primitives.js`:
  - `.at-tape`: fita crepe com pontas serrilhadas e Courier Prime.
  - `.at-stamp`: carimbo com borda dupla e falha de tinta via máscara procedural SVG `feTurbulence`.
  - `.at-card`: cartão de papel com rotação determinística estável por id (`tiltOf`).
  - `.at-note`: bilhete preso por fita crepe para notificações.
  - `.at-desk`: superfície da bancada com vinheta radial da luminária.
  - `.at-btn` e `.at-icon-btn`: botões táteis nos tons ultravioleta, cera e neutro da mesa.
- Estrutura completa da casca em `src/ui/shell.js`:
  - Trilho (80px) com botões táteis, área de recentes e atalhos.
  - Gavetas laterais deslizantes (360px) para Documentos, Biblioteca e Modelos.
  - Bancada central (`.at-desk`) com ilustração vetorial SVG (`src/ui/illustrations.js`) e estado vazio.
  - Rodapé discreto indicando "Salvando neste navegador".
  - Inspetor lateral direito (320px) com abas Propriedades, Preencher, Camadas e Histórico.
- Notificações em formato de bilhete em `src/ui/notify.js` com empilhamento de até 3 notas e animação física de assentamento.
- Menu de contexto flutuante em `src/ui/context-menu.js` com reposicionamento automático na tela e navegação por teclado.
- Paleta de comandos (Ctrl+K) em `src/ui/palette.js` com suporte a busca insensível a acentos/maiúsculas, palavras em qualquer ordem e registro dinâmico de comandos da casca.
- Painel de Ajustes da mesa em `src/ui/settings.js` com 5 texturas procedurais de bancada (Madeira, Feltro, Couro, Concreto, Preto), intensidade/temperatura da luminária, unidades de medida e suporte a redução de animação persistidos em `localStorage`.
- Script de captura de referência `scripts/capture.js` com geração de 8 imagens em `docs/referencias/` (6 do Ateliê e 2 da Ficha).

### Comparativo Visual (Ateliê vs. Ficha)
- **Comum**: Fundo escuro imersivo, tipografia editorial marcante, layout estruturado com trilho de navegação lateral à esquerda, paleta rápida de comandos via Ctrl+K com atalhos em rodapé e elementos que remetem a recortes táteis de papel.
- **Próprio do Ateliê**: O Ateliê é concebido como a bancada noturna de um artesão/falsificador sob iluminação quente de luminária ajustável, destacando-se pelo violeta de luz negra (`--at-uv`), títulos colados com fita crepe serrilhada, carimbos de borracha granulados e micro-rotações físicas nos cartões.

### Validação
- `npm test`: 16 testes unitários passando (taxas de contraste conferidas, fontes mínimas >= 11px, `tiltOf` estável, busca da paleta sem acentos e fora de ordem).
- `npm run test:e2e`: teste ponta a ponta com Playwright executando todas as interações da casca, gavetas, teclado (Esc, setas, Enter), Ctrl+K, troca de material nos ajustes com persistência após recarregamento e verificação de redução de movimento.
- `scripts/capture.js`: gerou todas as 8 capturas em 1600x950 em `docs/referencias/`.

### Pendências reais
- Nenhuma pendência na Etapa 2.

---

## Etapa 1 — O projeto

### Feito
- Estrutura completa de diretórios: `scripts/`, `scripts/library/`, `server/`, `src/ui/`, `src/ui/fonts/`, `tests/`, `tests/e2e/`, `data/`, `public/colecao/`, `data-private/expansoes/`.
- Configuração do `.gitignore` com exclusão rigorosa de `data-private/`, `node_modules/`, `dist/`, etc.
- Definição do `package.json` com scripts (`dev`, `build`, `start`, `test`, `test:e2e`, `library:*`) e dependências alinhadas.
- Servidor Express em `server/app.js`, `server/index.js`, `server/paths.js` e `server/storage.js` com rota `/api/atelie/health` e suporte a SPA.
- Configuração do Vite em `vite.config.js` com porta padrão 5174 e proxy para API na porta 3011.
- Script de desenvolvimento unificado em `scripts/dev.js`.
- Arquivos de UI iniciais: `index.html`, `src/main.js`, `src/ui/theme.css`, fontes Hanken Grotesk, `src/ui/icons.js` (com ícone `doc`), `src/ui/controls.js`, `src/ui/styles.css`.
- Testes unitários implementados:
  - `tests/privacy.test.js`: limites estritos entre arquivos públicos e coleções privadas (`data-private`), ausência de importações restritas no código do cliente.
  - `tests/server.test.js`: inicialização do servidor Express, verificação da rota `/api/atelie/health` e roteamento SPA.
  - `tests/controls.test.js`: validação de componentes de controle (`splitLabel`, `numberField`, `choiceField`, `colorField`, `normalizeHex`).
  - `tests/theme.test.js`: verificação de fontes mínimas (>= 11px), contraste e ausência de cores hardcoded na folha de estilos.
- Teste E2E implementado em `tests/e2e/shell.test.js` com Playwright.

### Validação
- `npm test` rodando e passando 100%.
- `npm run build` executado gerando `dist/` sem pacotes de backend.
- `npm run test:e2e` rodando e passando com Chromium headless.

### Pendências reais
- Nenhuma pendência na Etapa 1.
