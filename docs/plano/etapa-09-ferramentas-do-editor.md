# Etapa 9 — Ferramentas do editor

Leia antes: `00-LEIA-PRIMEIRO.md`, `PLANO-INTERFACE.md` (seções 5 a 7), `src/editor/editor.js`, `src/editor/state.js`, `src/editor/stage.js`, `src/editor/geometry.js`, `src/editor/properties-panel.js`, `src/ui/context-menu.js`, `src/ui/palette.js`, `src/data/api.js`.

## Objetivo

As ferramentas que fazem um editor parecer profissional e não atrapalhar: réguas e guias, histórico navegável, mini-barra sobre a seleção, conta-gotas, colar e arrastar imagens de fora, copiar camadas entre documentos, alinhar à página, cores recentes, menu de contexto no palco e as ações no Ctrl+K.

## 1. Réguas e guias (`src/editor/rulers.js`)

- Réguas no topo e à esquerda da mesa (20 px), em px do documento ou mm (Ajustes → Unidades; 1 mm = 150 / 25,4 px), com marcas que se adaptam ao zoom (escolha o passo entre 1, 2, 5, 10, 20, 50, 100… para que as marcas fiquem a ≥ 48 px de distância na tela). Liga/desliga com **Shift+R** (Ctrl+R recarrega a página no navegador).
- Arrastar de uma régua cria uma **guia** (linha `--at-uv` fina); arrastar a guia para fora da página a remove; clique duplo numa guia pede a posição exata. Guias são do documento: `handout.guides = { x: [números], y: [números] }` (opcional; acrescente ao formato da etapa 3, com validação e teste).
- O encaixe da etapa 8 passa a incluir as guias.

## 2. Histórico (`src/editor/history-panel.js`)

- Aba **Histórico** do inspetor: a lista dos passos (`label` de cada `edit`), o mais recente em cima, o atual destacado, os desfeitos em cinza. Clicar num passo vai até ele (vários undo/redo). O primeiro item é "Documento aberto".
- O estado da etapa 7 passa a expor `steps` (rótulos e índice atual) e `goTo(index)`. Teste no Node.

## 3. Mini-barra sobre a seleção (`src/editor/selection-bar.js`)

Uma barra pequena (`.at-desk-2`, raio `--eco-radius-m`) acima da caixa da camada selecionada, que acompanha zoom e rolagem e foge para baixo se não couber em cima: **Duplicar** (Ctrl+D) · **Trazer para frente** (Ctrl+]) · **Enviar para trás** (Ctrl+[) · **Mesclagem** (menu com os modos mais usados para papel: Normal, Multiplicação, Sobrepor, Luz suave, Divisão de tela) · **Travar** · **Excluir**. Some durante o arraste.

## 4. Conta-gotas (`I`)

Com o conta-gotas ativo, o cursor vira uma lupa com a cor sob ele; clicar aplica a cor ao campo de cor **que estava focado** (ou, sem campo focado, à cor do texto ou do preenchimento da camada selecionada). Lê a cor do canvas do palco (`getImageData` de 1 px). Esc cancela.

## 5. Cores

- **Cores do documento**: abaixo de cada campo de cor, uma fileira com as cores já usadas no documento (texto, formas, tintas), sem repetir, até 12.
- **Recentes**: as últimas 8 cores escolhidas (em `localStorage`), em outra fileira.
- Clicar numa amostra aplica.

## 6. Imagens de fora

- **Arrastar um arquivo** de imagem do sistema para a mesa: envia (`api.uploads.send`) e cria uma camada de imagem no ponto onde soltou, com a proporção da imagem e largura até 50 % da página. Vários arquivos: várias camadas, em cascata.
- **Colar** (Ctrl+V) uma imagem da área de transferência: o mesmo, no centro.
- Enquanto envia, um aviso "Enviando imagem…"; erro → aviso de erro com o motivo.

## 7. Copiar camadas entre documentos

- **Ctrl+C** com uma camada selecionada guarda a camada (JSON) na área de transferência do sistema (`navigator.clipboard.writeText` com um prefixo `atelie-layer:v1:`) e numa variável local.
- **Ctrl+V** sem imagem na área de transferência: se houver uma camada copiada, cola com id novo, deslocada 20 px, acima da selecionada. Funciona entre documentos e entre abas.

## 8. Alinhar

Nas Propriedades, uma linha de seis botões: alinhar à esquerda, centro horizontal, direita, topo, centro vertical, base — **em relação à página**. Considera a rotação (alinha a caixa envolvente girada).

## 9. Menu de contexto no palco

Botão direito numa camada: Duplicar · Copiar · Colar · separador · Trazer para frente · Enviar para trás · Para o topo · Para o fundo · separador · Travar/Destravar · Ocultar · separador · Excluir (em `--at-wax`). Botão direito na página vazia: Colar · Adicionar texto aqui · Adicionar imagem aqui.

## 10. Ações no Ctrl+K

Registre um provedor com as ações do editor (com o atalho à direita): Novo documento (submenu de tamanhos), Arquivar, Desfazer, Refazer, Duplicar camada, Excluir camada, Adicionar texto, Adicionar imagem, Adicionar retângulo, Mostrar réguas, Conta-gotas, Caber na tela, Zoom 100 %.

## Testes

- `tests/rulers.test.js`: passo das marcas por zoom (10 % → 100 px; 100 % → 10 px ou o que a regra der; documente), conversão px ↔ mm.
- `tests/editor-state.test.js` (acrescente): `steps` e `goTo`.
- `tests/e2e/editor-tools.test.js`: criar guia arrastando da régua e encaixar uma camada nela; clicar no histórico três passos para trás e conferir o documento; mini-barra duplica; conta-gotas aplica a cor de um retângulo vermelho a um texto; soltar um PNG gerado no teste (`page.dispatchEvent` de `drop` com `DataTransfer`) cria camada de imagem; Ctrl+C / Ctrl+V de uma camada para outro documento; alinhar ao centro; menu de contexto → Excluir.

## Pronto quando

- [ ] Testes passam; `npm test` e os E2E passam.
- [ ] Captura `docs/referencias/atelie-editor-ferramentas.png` com réguas, uma guia, a mini-barra e o histórico visíveis.
