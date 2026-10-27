# Guia de Uso — Ateliê de Documentos

O **Ateliê de Documentos** é uma bancada de trabalho digital desenvolvida para forjar documentos imersivos de RPG (*handouts*), como cartas de época, recortes de jornal, telegramas, certidões oficiais, polaroides, laudos periciais e pergaminhos místicas. 

O aplicativo opera tanto em conjunto com um servidor local Node.js quanto de maneira 100% autônoma no navegador (GitHub Pages), salvando os dados no IndexedDB local e integrando-se nativamente ao **Tabletop**.

---

## 1. Começar por um Modelo

Ao abrir o Ateliê pela primeira vez ou acessar a gaveta **Modelos** (atalho **M** ou botão no trilho lateral), você encontrará um catálogo completo com **151 modelos prontos da coleção da casa** (132 documentos e 19 variações), organizados em 16 categorias:

- **Cartas e bilhetes**: cartas datilografadas anos 50, envelopes com frente e verso, bilhetes rasgados de caderno e notas de geladeira.
- **Jornal**: capas de jornal de época, artigos de classificados, colunas de obituário e recortes dos anos 20.
- **Polícia e investigação**: boletins de ocorrência, fichas criminais, laudos periciais e relatórios datilografados.
- **Médico**: receitas médicas, prontuários de internação e certidões de óbito.
- **Ocultismo**: páginas de grimório ritualístico, diários de culto com segredos UV e círculos de invocação.
- **Fantasia**: éditos reais com selo de cera e pergaminhos antigos.
- **Cotidiano**: cartões de visita, recibos comerciais, ingressos de teatro e passagens de trem.
- **Tecnologia**: telas de terminal retrô e conversas de celular impressas.

Para começar com uma página limpa, escolha um dos **9 formatos de folha em branco** disponíveis na tela de início ou clique em **Folha em branco** (A4 retrato/paisagem, Carta, Recorte de jornal, Telegrama, Foto polaroid, Cartão postal, Bilhete ou Quadrado).

---

## 2. Preencher (Edição Rápida)

Se você escolheu um modelo do catálogo, a maneira mais rápida de personalizá-lo é através da aba **Preencher** no Inspetor à direita.

1. Selecione a aba **Preencher** no painel lateral direito.
2. Os campos semânticos definidos para aquele modelo serão listados (por exemplo: *Nome do Investigado*, *Data da Ocorrência*, *Texto da Carta*, *Foto de Evidência*).
3. Ao alterar os valores dos campos, o documento na bancada é atualizado instantaneamente, mantendo a diagramação, a fonte histórica e os efeitos de desgaste sem que você precise editar cada camada manualmente.

---

## 3. Camadas e Manipulação Avançada

Para personalização profunda, o Ateliê organiza cada documento como uma pilha de camadas bidimensionais na aba **Camadas**:

### Tipos de Camada
- **`image` (Imagem)**: papéis de fundo, texturas de sobreposição, fotografias coladas, carimbos e selos.
- **`text` (Texto)**: caixas de texto com quebra automática de linha, alinhamento e estilos de tinta.
- **`shape` (Forma)**: retângulos, molduras geométricas, círculos e linhas divisórias.
- **`adjust` (Ajuste fotográfico)**: camadas não destrutivas que corrigem as camadas inferiores (Matiz/Saturação, Brilho/Contraste, Preto e Branco, Inversão, Níveis e Curvas).
- **`effect` (Efeito procedural)**: ruídos matemáticos, vinhetas, bordas queimadas e dobras de papel.

### Ordem e Hierarquia
A pilha de camadas é renderizada de baixo para cima: a camada inferior serve de fundo (papel base) e as superiores compõem o conteúdo sobreposto. Use os atalhos **Ctrl+]** (avançar camada) e **Ctrl+[** (recuar camada) para reordenar.

### Modos de Mesclagem (Blend Modes)
O modo de mesclagem define a física de como a camada interage com o papel abaixo:
- **Multiplicação (`multiply`)**: escurece as camadas inferiores e simula a absorção da tinta pelas fibras do papel. Indispensável para texto datilografado, carimbos, manchas de café, sujeira e sangue.
- **Sobrepor (`overlay`) e Luz Suave (`soft-light`)**: combinam tons claros e escuros sem clarear a base do papel. Perfeito para mapas de relevo de amassados, vincos de dobras e fibras de celulose.
- **Divisão de Tela (`screen`)**: clareia a imagem, ideal para luzes, marcas d'água desbotadas e reflexos.
- **Recorte (`clip`)**: restringe a exibição da camada ao contorno opaco da camada logo abaixo. Excelente para encaixar fotos dentro de molduras recortadas ou reter sujeira na silhueta de um papel rasgado.

### Bloqueio e Opacidade
- **Travar (cadeado)**: impede a seleção ou movimentação acidental da camada no palco (muito útil no papel de fundo).
- **Opacidade (0 a 100%)**: permite dosar a intensidade de carimbos desgastados e manchas secas.

---

## 4. Tipografia e Estilos de Tinta

O Ateliê conta com **40 famílias de fontes livres** selecionadas para recriar documentos históricos com precisão:

### Estilos de Tinta Físicos
Na aba **Propriedades** de uma camada de texto, você pode escolher o estilo de aplicação da tinta:
- **Limpa (`clean`)**: desenho tipográfico nítido e uniforme.
- **Máquina de Escrever (`typewriter`)**: simula as imperfeições da fita de tecido de máquinas de datilografia antigas, com micro-falhas e variações de impacto.
- **Manuscrita (`handwriting`)**: adiciona um tremor orgânico de pena ou caneta-tinteiro às curvas dos caracteres.
- **Carimbo (`stamp`)**: aplica textura granulada com falhas de borracha prensada.

Você também pode ajustar tamanho da fonte, altura de linha (*leading*), alinhamento horizontal e cor em formato hexadecimal. Dê um duplo-clique sobre a camada de texto no palco ou pressione **Enter** com a camada selecionada para iniciar a edição de texto em linha (*inline*).

---

## 5. Biblioteca de Ativos e Favoritos

A gaveta **Biblioteca** (atalho **B**) dá acesso a todo o acervo do Ateliê:

- **Papéis**: 48 texturas de papel em três idades (*novo*, *usado*, *antigo*), abrangendo ofício, jornal, pergaminho, kraft, caderno pautado, telegrama e carbono.
- **Texturas de acabamento**: 53 sobreposições em WebP com transparência (manchas de café, umidade, sangue, poeira, marcas queimadas, amassados e impressões digitais).
- **Elementos**: 140 ilustrações vetoriais em SVG (carimbos burocráticos, marcas periciais, selos consulares, fitas adesivas e clipes).
- **Fontes**: seletor visual tipográfico com visualização de espécime em tempo real.

### Busca e Favoritos
- Utilize o campo de busca no topo da biblioteca para filtrar por nome, categoria ou tags sem se preocupar com acentos ou maiúsculas.
- Clique na estrela de qualquer item para marcá-lo como **Favorito**, permitindo acesso imediato na aba de favoritos.
- Para adicionar um ativo ao documento aberto, basta clicar nele ou arrastá-lo diretamente para a bancada de trabalho.

---

## 6. Imagens Enviadas pelo Usuário (Uploads)

Você pode enriquecer seus documentos com suas próprias fotografias, retratos de personagens, mapas ou brasões de família:

1. **Arrastar e soltar**: arraste arquivos de imagem (`.png`, `.jpg`, `.webp`) diretamente do seu explorador de arquivos para a bancada.
2. **Colar da área de transferência**: copie uma imagem de outro programa ou navegador e pressione **Ctrl+V** com a bancada ativa.
3. **Botão de envio**: use a opção de envio na gaveta Biblioteca.

---

## 7. Luz Ultravioleta (Luz Negra)

A luz ultravioleta (UV) permite embutir mensagens secretas, marcas d'água fluorescentes e pistas místicas que só podem ser vistas sob iluminação especial:

1. **Criar camada secreta**: selecione a camada que contém a mensagem ou símbolo secreto e, no Inspetor de **Propriedades**, mude o campo **Luz** de `Normal` para `UV`.
2. **Alternar luz na bancada**: pressione a tecla **U** para ligar ou desligar a lâmpada UV na sua bancada de trabalho. A interface escurece com brilho violeta e as camadas secretas se revelam.
3. **Escurecimento e fluorescência**: configure a tonalidade (*tint*) e a intensidade (*strength*) do escurecimento da página sob luz negra nas propriedades do documento.
4. **Entrega e assado duplo**: o Ateliê assa e exporta tanto a versão normal quanto a versão revelada sob luz negra, permitindo que os jogadores investiguem o documento no Tabletop com uma lanterna UV.

---

## 8. Documentos, Pastas e Rascunho Automático

Na gaveta **Documentos** (atalho **D**), você organiza toda a sua biblioteca de criações:

- **Pastas**: crie pastas e subpastas para separar seus documentos por campanha, sessão ou caso investigativo.
- **Rascunho automático**: cada modificação feita na bancada é gravada de forma silenciosa e instantânea no armazenamento local. Se você fechar o navegador sem salvar, seu trabalho não será perdido.
- **Histórico e Desfazer**: use **Ctrl+Z** para desfazer e **Ctrl+Y** para refazer alterações. A aba **Histórico** lista todas as etapas registradas com navegação direta.
- **Lixeira**: documentos excluídos vão para a lixeira interna, onde podem ser restaurados ou expurgados automaticamente após 30 dias.

---

## 9. Modo Leitura Imersivo

O modo leitura (atalho **P**) transforma o documento em uma experiência de visualização em tela cheia sem distrações:

- **Tela cheia**: esconde menus e ferramentas, exibindo a página com proporções fiéis sobre a bancada noturna.
- **Lupa de inspeção (tecla L)**: ativa uma lente de aumento de 2,5× que acompanha o ponteiro do mouse para leitura minuciosa de pormenores, carimbos e pequenas notas de rodapé.
- **Lanterna UV (tecla U)**: projeta um feixe de luz negra móvel com máscara radial suave, permitindo ao leitor descobrir mensagens secretas passando a lanterna pela folha.
- **Frente e Verso (tecla F)**: vira a folha para inspecionar anotações no verso (em modelos que possuem verso configurado, como cartas, polaroides e cartões postais).
- **Carrossel de documentos (Setas ← e →)**: permite folhear todos os documentos da mesma pasta sem sair do modo leitura.
- **Sair da leitura**: pressione **Esc** para retornar ao editor.

---

## 10. Exportação e Impressão em Escala Real

Pela gaveta **Exportar** (atalho **E**), você transforma suas criações em arquivos físicos ou digitais prontos para a sessão:

- **Exportar em Alta Resolução**: gera um arquivo PNG de até 2048 px ou em resolução gráfica de 300 ppp (pontos por polegada), garantindo nitidez cristalina em impressões de mesa.
- **Exportar versão UV**: gera um segundo PNG correspondente à visualização revelada sob luz negra.
- **Impressão 1:1 sem margens**: envia o documento para a impressora na escala física exata da folha (por exemplo, um A4 sairá exatamente nas medidas 210 × 297 mm, e uma polaroide sairá em 88 × 107 mm). Marcas de corte e guias perimetrais opcionais facilitam o recorte com estilete ou tesoura.

---

## 11. Integração com o Tabletop e Parâmetros de URL

O Ateliê foi concebido para integração direta com a mesa virtual **Tabletop**:

- **No GitHub Pages**: quando hospedado no mesmo domínio em repositório irmão (`../Atelie/`), a troca de documentos e assados ocorre em tempo real via IndexedDB (`mesa-handouts-v1`) e canal de sincronização `BroadcastChannel`.
- **Servidor local HTTP**: na porta `3011`, o Tabletop consulta o Ateliê via API REST com CORS de leitura (`/api/atelie/handouts`).
- **Janela de entrega (Handoff)**: o Tabletop pode abrir o Ateliê em janela popup com parâmetros especiais:
  - `?handout=<id>`: carrega diretamente um documento específico para edição.
  - `?pick=1`: entra em modo de seleção, permitindo ao mestre escolher um documento e enviá-lo de volta à mesa com um clique.
  - `?new=1`: abre imediatamente uma folha em branco para criação ágil durante a partida.

---

## 12. Cópia de Segurança e Restauração (Backup)

Para garantir que suas criações nunca se percam ao limpar o cache do navegador ou trocar de máquina:

1. Abra os **Ajustes da Mesa** (atalho **,** ou ícone de engrenagem no rodapé do trilho).
2. Na seção **Armazenamento e Cópia de Segurança**, você verá o espaço utilizado pelo navegador (IndexedDB).
3. Clique em **Exportar tudo** para baixar um arquivo `.json` completo contendo todos os seus documentos, estrutura de pastas e imagens enviadas (codificadas em base64).
4. Para restaurar ou transferir seus documentos para outro computador, utilize o botão **Importar** e selecione seu arquivo de backup. A importação realiza uma mesclagem segura que preserva seus documentos preexistentes.

---

## 13. Tabela Completa de Atalhos de Teclado

| Tecla / Combinação | Ação | Contexto |
|---|---|---|
| **?** | Abrir ou fechar gaveta de Ajuda | Geral |
| **1** | Retornar à bancada principal (Mesa) | Geral |
| **D** | Abrir ou fechar gaveta de Documentos | Geral |
| **B** | Abrir ou fechar gaveta de Biblioteca | Geral |
| **M** | Abrir ou fechar gaveta de Modelos | Geral |
| **,** | Abrir painel de Ajustes da bancada | Geral |
| **Ctrl+K** | Abrir Paleta de Comandos rápidos | Geral |
| **Esc** | Fechar gaveta aberta ou desselecionar camada | Geral / Editor |
| **Ctrl+S** | Arquivar e salvar documento atual | Editor |
| **P** | Entrar no Modo Leitura em tela cheia | Editor |
| **E** | Abrir gaveta de Exportação e Impressão | Editor |
| **Ctrl+Z** | Desfazer última alteração | Editor |
| **Ctrl+Y** | Refazer alteração desfeita | Editor |
| **Ctrl+C** | Copiar camada selecionada | Editor |
| **Ctrl+V** | Colar camada copiada | Editor |
| **Ctrl+D** | Duplicar camada selecionada | Editor |
| **Ctrl+]** | Avançar camada um nível para cima | Editor |
| **Ctrl+[** | Recuar camada um nível para baixo | Editor |
| **Shift+R** | Exibir ou ocultar réguas milimetradas | Editor |
| **I** | Ativar conta-gotas de cor | Editor |
| **U** | Ligar ou desligar lâmpada UV na bancada | Editor |
| **Setas (← → ↑ ↓)** | Mover camada 1 px (ou 10 px segurando Shift) | Editor |
| **Enter** | Editar texto inline na camada de texto selecionada | Editor |
| **Del / Backspace** | Excluir camada selecionada | Editor |
| **L** | Ativar ou desativar lente de aumento 2,5× | Modo Leitura |
| **U** | Ligar ou desligar lanterna UV móvel | Modo Leitura |
| **F** | Virar folha (frente / verso) | Modo Leitura |
| **Setas ← / →** | Navegar entre documentos da pasta no carrossel | Modo Leitura |
| **Esc** | Sair do modo leitura e voltar à bancada | Modo Leitura |

---

## 14. Limites Conhecidos e Dicas de Desempenho

- **Dimensão máxima de imagem**: o renderizador suporta documentos com até 2400 px no maior eixo (equivalente a uma folha A4 em 200 ppp). Para documentos muito extensos, evite ultrapassar 40 camadas ativas para manter o desempenho fluido no navegador.
- **Exportação para impressão**: se desejar imprimir em papel fotográfico ou couchê, opte pela escala de 300 ppp na gaveta de exportação e desative as margens na janela de impressão do seu sistema operacional.
- **Fontes de terceiros**: fontes carregadas na coleção da casa são armazenadas localmente em formato `.ttf` ou `.woff2`. No modo navegador, as fontes utilizadas nos modelos são baixadas sob demanda e mantidas em cache.

