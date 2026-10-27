import { SHORTCUTS, getShortcutsByCategory } from './shortcuts.js';
import { tape } from './primitives.js';
import { escapeHTML as esc, icon as renderIcon } from './icons.js';
import { showWelcomeNotes } from './welcome.js';
import { label as keyLabel, byId, isCustomized, conflicts, set as setKey, reset as resetKey, normalizeCombo, comboFor } from './keymap.js';

export function createHelpDrawer({ onShowWelcome, shell } = {}) {
  const root = document.createElement('div');
  root.className = 'help-drawer-content';

  const groupedShortcuts = getShortcutsByCategory();

  function renderShortcutTable() {
    return Object.entries(groupedShortcuts).map(([category, list]) => `
      <div class="help-shortcut-group">
        <h4 class="help-shortcut-category">${esc(category)}</h4>
        <table class="help-shortcuts-table">
          <tbody>
            ${list.map(s => `
              <tr data-shortcut-id="${esc(s.id)}">
                <td class="help-col-key"><kbd class="help-kbd">${esc(keyLabel(s.id))}</kbd></td>
                <td class="help-col-desc">
                  <strong>${esc(s.label)}</strong>
                  <span class="help-desc-text">${esc(s.description)}</span>
                  ${s.configurable === false ? '' : `
                    <span class="help-key-actions">
                      <button type="button" class="help-key-btn" data-key-change="${esc(s.id)}">Alterar</button>
                      ${isCustomized(s.id) ? `<button type="button" class="help-key-btn" data-key-reset="${esc(s.id)}" title="Voltar para ${esc(s.key)}">Restaurar padrão</button>` : ''}
                    </span>
                  `}
                  <span class="help-key-note" data-key-note="${esc(s.id)}" role="status"></span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('');
  }

  root.innerHTML = `
    <!-- Barra de busca no topo -->
    <div class="help-search-box">
      <div class="help-search-input-wrap">
        ${renderIcon('search', 16)}
        <input
          type="search"
          class="help-search-input"
          id="help-search-input"
          placeholder="Buscar na ajuda..."
          aria-label="Buscar na ajuda"
          autocomplete="off"
        />
      </div>
    </div>

    <!-- Seção 1: Como começar -->
    <section class="help-section" data-section="comecar" data-keywords="comecar inicio primeiros passos modelo folha branco preencher mesa tabletop">
      <div class="help-section-header">
        ${tape('COMO COMEÇAR')}
      </div>
      <div class="help-section-body">
        <p class="help-intro">O Ateliê de documentos funciona como uma bancada artesanal para criar e forjar documentos de RPG em três passos simples:</p>
        <ol class="help-steps-list">
          <li>
            <strong>1. Ponto de partida:</strong> Escolha um dos 125 modelos prontos no catálogo ou comece com uma folha em branco com dimensões reais (A4, carta, telegrama, polaroid, etc.).
          </li>
          <li>
            <strong>2. Preencha e personalize:</strong> Use a aba <em>Preencher</em> à direita para editar rapidamente os textos e dados do modelo. Para uma criação profunda, use as abas <em>Camadas</em> e <em>Propriedades</em> para reposicionar, girar, alterar modos de mesclagem, aplicar texturas, papéis envelhecidos e fontes de época.
          </li>
          <li>
            <strong>3. Leve para a mesa:</strong> Exporte o documento em PNG em alta resolução (2048 px ou 300 ppp), imprima em escala 1:1, ou entregue diretamente ao Tabletop para virar uma carta manipulável pelos jogadores.
          </li>
        </ol>
        <div class="help-action-row">
          <button type="button" class="at-btn help-reopen-welcome" data-action="reopen-welcome">
            Mostrar de novo
          </button>
        </div>
      </div>
    </section>

    <!-- Seção 2: Atalhos -->
    <section class="help-section" data-section="atalhos" data-keywords="atalhos teclado comandos teclas ctrl combinacoes navegacao edicao leitura mesa">
      <div class="help-section-header">
        ${tape('ATALHOS')}
      </div>
      <div class="help-section-body">
        <p class="help-intro">Atalhos de teclado rápidos para acelerar seu trabalho na bancada:</p>
        <div class="help-shortcuts-wrapper">
          ${renderShortcutTable()}
        </div>
        <div class="help-action-row">
          <button type="button" class="at-btn" data-action="reset-all-shortcuts">Restaurar todos os atalhos</button>
        </div>
      </div>
    </section>

    <!-- Aprender na prática: tutoriais interativos -->
    <section class="help-section" data-section="tutoriais" data-keywords="tutorial tutoriais aprender pratica licao dica passo a passo carta modelo uv">
      <div class="help-section-header">
        ${tape('APRENDER NA PRÁTICA')}
      </div>
      <div class="help-section-body">
        <p class="help-intro">Cada tutorial acontece no próprio Ateliê: ele aponta, você faz, e o passo avança quando o resultado aparece. Você treina num documento à parte; os seus ficam como estão.</p>
        <div data-tutorial-list>${typeof window !== 'undefined' && window.__atelieTutorialList ? window.__atelieTutorialList() : ''}</div>
        <p class="help-tip-box"><button type="button" class="help-key-btn" data-action="tutorial-report">Exportar relatório dos tutoriais</button> (onde você travou ou pulou, guardado só neste navegador).</p>
      </div>
    </section>

    <!-- Seção 3: Camadas e mesclagem -->
    <section class="help-section" data-section="camadas-mesclagem" data-keywords="camadas mesclagem blend modos multiplicar sobrepor luz suave divisao tela recorte clip opacidade travar">
      <div class="help-section-header">
        ${tape('CAMADAS E MESCLAGEM')}
      </div>
      <div class="help-section-body">
        <p class="help-intro">Tudo no Ateliê é composto por camadas empilhadas (imagens, textos, formas, ajustes e efeitos). A ordem e o modo de mesclagem determinam o acabamento físico sobre o papel:</p>
        <ul class="help-modes-list">
          <li>
            <strong>Multiplicação (Multiply):</strong> Escurece as camadas de baixo e simula a absorção da tinta pelas fibras do papel; indispensável para manchas de café, sujeira, sangue, carimbos e texto sobre papel.
          </li>
          <li>
            <strong>Sobrepor (Overlay) e Luz Suave (Soft Light):</strong> Combinam tons claros e escuros preservando a base; ideais para texturas de amassados, vincos de dobras e relevos físicos.
          </li>
          <li>
            <strong>Divisão de Tela (Screen):</strong> Clareia as camadas inferiores; útil para efeitos de luz, brilho, fumaça ou marcas d'água desbotadas.
          </li>
          <li>
            <strong>Recorte (Clip):</strong> Restringe a renderização da camada ao contorno visível da camada imediatamente abaixo; perfeito para encaixar fotografias dentro de molduras recortadas ou limitar manchas a um pedaço de papel rasgado.
          </li>
        </ul>
        <p class="help-tip-box">
          <em>Dica:</em> Use o controle de <strong>Opacidade</strong> para desgastar carimbos e o botão de <strong>Travar</strong> para evitar mover o fundo acidentalmente.
        </p>
      </div>
    </section>

    <!-- Seção 4: Luz UV -->
    <section class="help-section" data-section="luz-uv" data-keywords="luz uv ultravioleta negra secreta invisivel lanterna fluorescente segredo mensagem oculta">
      <div class="help-section-header">
        ${tape('LUZ UV')}
      </div>
      <div class="help-section-body">
        <p class="help-intro">A luz ultravioleta (luz negra) revela camadas secretas invisíveis à iluminação normal, como mensagens com tinta simpática, marcas d'água ocultas e pistas místicas:</p>
        <ul class="help-bullet-list">
          <li>
            <strong>Criar camada secreta:</strong> Selecione qualquer camada e, na aba <em>Propriedades</em>, altere o campo <strong>Luz</strong> de <code>Normal</code> para <code>UV</code>. A camada desaparecerá sob iluminação comum.
          </li>
          <li>
            <strong>Bancada de trabalho:</strong> Pressione a tecla <strong>U</strong> para acender ou apagar a lâmpada UV na bancada e visualizar as camadas secretas durante a criação.
          </li>
          <li>
            <strong>Modo Leitura:</strong> No modo Leitura (<strong>P</strong>), use a lanterna UV (tecla <strong>U</strong>) para inspecionar o documento no escuro com um feixe direcional manipulável pelo mouse.
          </li>
          <li>
            <strong>Exportação e Tabletop:</strong> O Ateliê assa e exporta tanto a versão normal quanto a versão revelada sob luz negra, mantendo a surpresa para os jogadores.
          </li>
        </ul>
      </div>
    </section>

    <!-- Seção 5: Usar no Tabletop -->
    <section class="help-section" data-section="tabletop" data-keywords="tabletop mesa rpg integracao carta contrato comunicacao broadcast postmessage http">
      <div class="help-section-header">
        ${tape('USAR NO TABLETOP')}
      </div>
      <div class="help-section-body">
        <p class="help-intro">O Ateliê integra-se nativamente ao aplicativo Tabletop, transformando documentos em cartas interativas na mesa virtual de RPG:</p>
        <ul class="help-bullet-list">
          <li>
            <strong>O que o Tabletop recebe:</strong> O documento renderizado em alta definição (2048 px), frente e verso, com suporte a luz UV e leitura imersiva.
          </li>
          <li>
            <strong>Endereço de conexão:</strong>
            <ul>
              <li>No GitHub Pages: use o repositório irmão na mesma origem (<code>../Atelie/</code>).</li>
              <li>Com servidores locais: <code>http://127.0.0.1:3011/</code>.</li>
            </ul>
          </li>
          <li>
            <strong>Três caminhos de comunicação do contrato:</strong>
            <ul>
              <li><strong>Caminho A (Navegador compartilhado):</strong> Na mesma origem, a troca ocorre diretamente via IndexedDB (<code>mesa-handouts-v1</code>) e <code>BroadcastChannel</code> em tempo real.</li>
              <li><strong>Caminho B (Janela):</strong> Através de janela popup e <code>postMessage</code> seguro com handoff.</li>
              <li><strong>Caminho C (HTTP):</strong> API REST local com CORS de leitura para servidores em portas diferentes.</li>
            </ul>
          </li>
        </ul>
      </div>
    </section>

    <!-- Seção 6: Coleção e expansões -->
    <section class="help-section" data-section="colecao-expansoes" data-keywords="colecao expansoes casa arquivos confidenciais psd fontes modelos manutencao">
      <div class="help-section-header">
        ${tape('COLEÇÃO E EXPANSÕES')}
      </div>
      <div class="help-section-body">
        <p class="help-intro">O acervo do Ateliê é dividido entre a coleção pública e pacotes de expansões privadas:</p>
        <ul class="help-bullet-list">
          <li>
            <strong>Coleção da casa:</strong> Acompanha o aplicativo no Git e é 100% livre: 75 papéis em 3 idades, 53 texturas de sobreposição em WebP, 294 elementos vetoriais em SVG, 40 famílias de fontes livres e 125 modelos prontos para jogar (106 documentos e 19 variações).
          </li>
          <li>
            <strong>Expansões privadas:</strong> Pacotes adicionais de terceiros (como o acervo <em>Arquivos Confidenciais</em>) ficam isolados na pasta <code>data-private/expansoes/</code> e nunca sobem para o Git ou versão pública no Pages.
          </li>
          <li>
            <strong>Manutenção e CLI:</strong> Com o servidor local ativo, consulte o guia técnico em <code>docs/MANUTENCAO.md</code> para regenerar texturas, importar novos PSDs e catalogar fontes.
          </li>
        </ul>
      </div>
    </section>

    <!-- Estado vazio de busca -->
    <div class="help-empty-search" id="help-empty-search" style="display: none;">
      <p>Nenhuma seção encontrada para a busca.</p>
    </div>
  `;

  // Search input filter
  const searchInput = root.querySelector('#help-search-input');
  const sections = Array.from(root.querySelectorAll('.help-section'));
  const emptyState = root.querySelector('#help-empty-search');

  function filterHelp(term) {
    const q = (term || '').trim().toLowerCase();
    if (!q) {
      sections.forEach(s => {
        s.style.display = '';
      });
      if (emptyState) emptyState.style.display = 'none';
      return;
    }

    let matchCount = 0;
    sections.forEach(s => {
      const keywords = (s.dataset.keywords || '').toLowerCase();
      const text = (s.innerText || '').toLowerCase();
      const matches = keywords.includes(q) || text.includes(q);
      if (matches) {
        s.style.display = '';
        matchCount++;
      } else {
        s.style.display = 'none';
      }
    });

    if (emptyState) {
      emptyState.style.display = matchCount === 0 ? 'block' : 'none';
    }
  }

  searchInput?.addEventListener('input', (e) => {
    filterHelp(e.target.value);
  });

  // --- Change a shortcut: the next key combination pressed becomes the new one ---
  const shortcutsWrap = root.querySelector('.help-shortcuts-wrapper');

  function refreshShortcutTable() {
    shortcutsWrap.innerHTML = renderShortcutTable();
  }

  function noteFor(id, text) {
    const note = shortcutsWrap.querySelector(`[data-key-note="${CSS.escape(id)}"]`);
    if (note) note.textContent = text;
  }

  function captureNextCombo(id, button) {
    const entry = byId(id);
    button.textContent = 'Pressione a nova combinação… (Esc cancela)';
    button.classList.add('is-capturing');
    noteFor(id, '');

    const onKey = (e) => {
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return; // wait for the real key
      e.preventDefault();
      e.stopPropagation();
      document.removeEventListener('keydown', onKey, true);
      if (e.key === 'Escape') {
        refreshShortcutTable();
        return;
      }
      const combo = normalizeCombo(e);
      const clash = conflicts(combo, entry.scope || 'editor', id);
      if (clash.length) {
        refreshShortcutTable();
        noteFor(id, `${combo} já é usado por “${clash[0].label}”. Escolha outra combinação.`);
        return;
      }
      setKey(id, combo);
      refreshShortcutTable();
      noteFor(id, `Agora é ${comboFor(id)}.`);
    };
    document.addEventListener('keydown', onKey, true);
  }

  shortcutsWrap.addEventListener('click', (e) => {
    const change = e.target.closest('[data-key-change]');
    if (change) {
      captureNextCombo(change.dataset.keyChange, change);
      return;
    }
    const reset = e.target.closest('[data-key-reset]');
    if (reset) {
      resetKey(reset.dataset.keyReset);
      refreshShortcutTable();
    }
  });

  root.querySelector('[data-action="reset-all-shortcuts"]')?.addEventListener('click', () => {
    resetKey(null);
    refreshShortcutTable();
  });

  // Re-open welcome notes
  root.querySelector('[data-action="reopen-welcome"]')?.addEventListener('click', () => {
    if (onShowWelcome) {
      onShowWelcome();
    } else {
      showWelcomeNotes({ force: true });
    }
  });

  return root;
}

