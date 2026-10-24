# Progresso — Ateliê de Documentos

## Visão Geral

Implementação do Ateliê de Documentos (engine de documentos editáveis e imersivos para RPG), conforme plano em `docs/plano/`.

| Etapa | Situação | Data | Resumo |
|---|---|---|---|
| 1 — O projeto | concluída | 2026-10-24 | Estrutura inicial do projeto, Express, Vite, UI base, testes unitários e E2E |
| 2 — Identidade e casca | pendente | | Identidade visual, primitivas, trilho, gavetas, inspetor, etc. |
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

