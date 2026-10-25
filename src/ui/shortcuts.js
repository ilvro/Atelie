/**
 * Lista única e centralizada de atalhos de teclado do Ateliê de Documentos.
 * Utilizada na gaveta de Ajuda, na paleta de comandos (Ctrl+K) e conferida por testes.
 */

export const SHORTCUTS = [
  // --- Navegação e Casca ---
  {
    id: 'help',
    key: '?',
    label: 'Ajuda',
    description: 'Abrir ou fechar gaveta de ajuda e guia de uso',
    category: 'Navegação',
    handledIn: ['src/ui/shell.js'],
    tokens: ["'?'"],
  },
  {
    id: 'desk',
    key: '1',
    label: 'Mesa',
    description: 'Voltar à visualização principal da bancada de trabalho',
    category: 'Navegação',
    handledIn: ['src/ui/shell.js'],
    tokens: ["'1'"],
  },
  {
    id: 'documents',
    key: 'D',
    label: 'Documentos',
    description: 'Abrir gaveta de documentos, pastas e lixeira',
    category: 'Navegação',
    handledIn: ['src/ui/shell.js'],
    tokens: ["'d'"],
  },
  {
    id: 'library',
    key: 'B',
    label: 'Biblioteca',
    description: 'Abrir gaveta de biblioteca (papéis, texturas e carimbos)',
    category: 'Navegação',
    handledIn: ['src/ui/shell.js'],
    tokens: ["'b'"],
  },
  {
    id: 'templates',
    key: 'M',
    label: 'Modelos',
    description: 'Abrir gaveta de modelos prontos para preencher',
    category: 'Navegação',
    handledIn: ['src/ui/shell.js'],
    tokens: ["'m'"],
  },
  {
    id: 'settings',
    key: ',',
    label: 'Ajustes',
    description: 'Abrir ajustes da mesa, iluminação e superfícies',
    category: 'Navegação',
    handledIn: ['src/ui/shell.js'],
    tokens: ["','"],
  },
  {
    id: 'palette',
    key: 'Ctrl+K',
    label: 'Paleta de comandos',
    description: 'Abrir paleta rápida de busca e execução de comandos',
    category: 'Navegação',
    handledIn: ['src/ui/palette.js'],
    tokens: ["'k'"],
  },
  {
    id: 'close-drawer',
    key: 'Esc',
    label: 'Fechar gaveta / desselecionar',
    description: 'Fechar gaveta ativa ou remover seleção de camada',
    category: 'Navegação',
    handledIn: ['src/ui/shell.js', 'src/editor/editor.js'],
    tokens: ["'Escape'"],
  },

  // --- Documento ---
  {
    id: 'archive',
    key: 'Ctrl+S',
    label: 'Arquivar documento',
    description: 'Salvar alterações e arquivar versão no armazenamento',
    category: 'Documento',
    handledIn: ['src/editor/editor.js'],
    tokens: ["'s'"],
  },
  {
    id: 'reader',
    key: 'P',
    label: 'Modo leitura',
    description: 'Entrar no modo imersivo de leitura em tela cheia',
    category: 'Documento',
    handledIn: ['src/editor/editor.js'],
    tokens: ["'p'"],
  },
  {
    id: 'export',
    key: 'E',
    label: 'Exportar / Imprimir',
    description: 'Abrir gaveta de exportação em alta resolução (2048 px) e impressão 1:1',
    category: 'Documento',
    handledIn: ['src/editor/editor.js'],
    tokens: ["'e'"],
  },

  // --- Edição e Manipulação ---
  {
    id: 'undo',
    key: 'Ctrl+Z',
    label: 'Desfazer',
    description: 'Desfazer a última ação de edição',
    category: 'Edição',
    handledIn: ['src/editor/editor.js'],
    tokens: ["'z'"],
  },
  {
    id: 'redo',
    key: 'Ctrl+Y',
    label: 'Refazer',
    description: 'Refazer a ação desfeita',
    category: 'Edição',
    handledIn: ['src/editor/editor.js'],
    tokens: ["'y'"],
  },
  {
    id: 'copy',
    key: 'Ctrl+C',
    label: 'Copiar camada',
    description: 'Copiar camada selecionada para a área de transferência',
    category: 'Edição',
    handledIn: ['src/editor/editor.js'],
    tokens: ["'c'"],
  },
  {
    id: 'paste',
    key: 'Ctrl+V',
    label: 'Colar camada',
    description: 'Colar camada copiada sobre a página',
    category: 'Edição',
    handledIn: ['src/editor/editor.js'],
    tokens: ["'v'"],
  },
  {
    id: 'duplicate',
    key: 'Ctrl+D',
    label: 'Duplicar camada',
    description: 'Duplicar a camada selecionada',
    category: 'Edição',
    handledIn: ['src/editor/editor.js'],
    tokens: ["'d'"],
  },
  {
    id: 'layer-up',
    key: 'Ctrl+]',
    label: 'Avançar camada',
    description: 'Mover camada selecionada um nível para cima na pilha',
    category: 'Edição',
    handledIn: ['src/editor/editor.js'],
    tokens: ["']'"],
  },
  {
    id: 'layer-down',
    key: 'Ctrl+[',
    label: 'Recuar camada',
    description: 'Mover camada selecionada um nível para baixo na pilha',
    category: 'Edição',
    handledIn: ['src/editor/editor.js'],
    tokens: ["'['"],
  },
  {
    id: 'rulers',
    key: 'Shift+R',
    label: 'Alternar réguas',
    description: 'Exibir ou ocultar réguas milimetradas e guias',
    category: 'Edição',
    handledIn: ['src/editor/editor.js'],
    tokens: ["'r'"],
  },
  {
    id: 'eyedropper',
    key: 'I',
    label: 'Conta-gotas',
    description: 'Ativar amostrador de cor em qualquer ponto da página',
    category: 'Edição',
    handledIn: ['src/editor/editor.js'],
    tokens: ["'i'"],
  },
  {
    id: 'uv-light',
    key: 'U',
    label: 'Luz ultravioleta',
    description: 'Ligar ou desligar lâmpada UV na bancada de trabalho',
    category: 'Edição',
    handledIn: ['src/editor/editor.js'],
    tokens: ["'u'"],
  },
  {
    id: 'nudge',
    key: 'Setas',
    label: 'Mover camada',
    description: 'Deslocar camada selecionada em 1 px (ou 10 px segurando Shift)',
    category: 'Edição',
    handledIn: ['src/editor/editor.js'],
    tokens: ["'ArrowLeft'", "'ArrowRight'", "'ArrowUp'", "'ArrowDown'"],
  },
  {
    id: 'edit-text',
    key: 'Enter',
    label: 'Editar texto',
    description: 'Entrar na edição direta de texto na camada selecionada',
    category: 'Edição',
    handledIn: ['src/editor/editor.js'],
    tokens: ["'Enter'"],
  },
  {
    id: 'delete-layer',
    key: 'Del / Backspace',
    label: 'Excluir camada',
    description: 'Remover a camada selecionada do documento',
    category: 'Edição',
    handledIn: ['src/editor/editor.js'],
    tokens: ["'Delete'", "'Backspace'"],
  },

  // --- Modo Leitura ---
  {
    id: 'reader-loupe',
    key: 'L',
    label: 'Lupa de aumento',
    description: 'Ativar ou desativar lente de aumento de 2,5×',
    category: 'Leitura',
    handledIn: ['src/reading/reading.js'],
    tokens: ["'l'"],
  },
  {
    id: 'reader-uv',
    key: 'U',
    label: 'Lanterna UV',
    description: 'Ativar feixe de lanterna ultravioleta para revelar segredos',
    category: 'Leitura',
    handledIn: ['src/reading/reading.js'],
    tokens: ["'u'"],
  },
  {
    id: 'reader-flip',
    key: 'F',
    label: 'Virar folha',
    description: 'Alternar entre frente e verso do documento',
    category: 'Leitura',
    handledIn: ['src/reading/reading.js'],
    tokens: ["'f'"],
  },
  {
    id: 'reader-nav',
    key: '← / →',
    label: 'Navegar carrossel',
    description: 'Passar para o documento anterior ou seguinte da pasta',
    category: 'Leitura',
    handledIn: ['src/reading/reading.js'],
    tokens: ["'ArrowLeft'", "'ArrowRight'"],
  },
  {
    id: 'reader-close',
    key: 'Esc',
    label: 'Sair da leitura',
    description: 'Encerrar leitura em tela cheia e voltar à bancada',
    category: 'Leitura',
    handledIn: ['src/reading/reading.js'],
    tokens: ["'Escape'"],
  },
];

/**
 * Agrupa os atalhos por categoria.
 * @returns {Record<string, typeof SHORTCUTS>}
 */
export function getShortcutsByCategory() {
  const groups = {};
  for (const s of SHORTCUTS) {
    if (!groups[s.category]) groups[s.category] = [];
    groups[s.category].push(s);
  }
  return groups;
}

