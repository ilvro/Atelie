import { escapeHTML as esc } from './icons.js';
import { tape } from './primitives.js';

let activeOverlay = null;

export function showWelcomeNotes({ root = (typeof document !== 'undefined' ? document.body : null), force = false, onClose } = {}) {
  if (typeof localStorage === 'undefined' || !root) return null;
  if (!force && localStorage.getItem('atelie-welcome') === 'done') return null;

  let welcomeStep = 1;

  if (activeOverlay) {
    activeOverlay.remove();
    activeOverlay = null;
  }

  activeOverlay = document.createElement('div');
  activeOverlay.className = 'welcome-overlay';
  activeOverlay.setAttribute('role', 'dialog');
  activeOverlay.setAttribute('aria-modal', 'true');
  activeOverlay.setAttribute('aria-label', 'Guia de introdução do Ateliê');

  const steps = [
    {
      step: 1,
      tape: 'PONTO DE PARTIDA',
      title: 'Escolha um ponto de partida',
      desc: 'Um modelo pronto ou uma folha em branco.',
      primaryText: 'Próximo',
    },
    {
      step: 2,
      tape: 'PREENCHA',
      title: 'Preencha',
      desc: 'Os campos do modelo ficam na aba Preencher, à direita. Para ir além, cada elemento da página é uma camada que você move, troca e recolore.',
      primaryText: 'Próximo',
    },
    {
      step: 3,
      tape: 'LEVE PARA A MESA',
      title: 'Leve para a mesa',
      desc: 'Exporte em PNG, imprima, ou use no Tabletop, onde o documento vira uma carta que os jogadores pegam para ler.',
      primaryText: 'Começar',
    },
  ];

  function render() {
    const cur = steps[welcomeStep - 1] || steps[0];

    activeOverlay.innerHTML = `
      <div class="at-note welcome-note">
        <div class="welcome-header">
          ${tape(cur.tape)}
          <span class="welcome-step-badge">${cur.step} / 3</span>
        </div>
        <h3 class="welcome-title">${esc(cur.title)}</h3>
        <p class="welcome-desc">${esc(cur.desc)}</p>
        <div class="welcome-actions">
          ${cur.step < 3 
            ? '<button type="button" class="welcome-skip-btn" data-action="welcome-skip">Pular</button>'
            : '<div></div>'
          }
          <div class="welcome-btn-group">
            ${cur.step > 1
              ? '<button type="button" class="at-btn welcome-prev-btn" data-action="welcome-prev">Anterior</button>'
              : ''
            }
            <button type="button" class="at-btn is-primary welcome-next-btn" data-action="welcome-next">
              ${esc(cur.primaryText)}
            </button>
          </div>
        </div>
      </div>
    `;

    activeOverlay.querySelector('[data-action="welcome-skip"]')?.addEventListener('click', () => {
      localStorage.setItem('atelie-welcome', 'done');
      activeOverlay?.remove();
      activeOverlay = null;
      onClose?.();
    });

    activeOverlay.querySelector('[data-action="welcome-prev"]')?.addEventListener('click', () => {
      if (welcomeStep > 1) {
        welcomeStep--;
        render();
      }
    });

    activeOverlay.querySelector('[data-action="welcome-next"]')?.addEventListener('click', () => {
      if (welcomeStep < 3) {
        welcomeStep++;
        render();
      } else {
        localStorage.setItem('atelie-welcome', 'done');
        activeOverlay?.remove();
        activeOverlay = null;
        onClose?.();
      }
    });
  }

  render();
  root.appendChild(activeOverlay);
  return activeOverlay;
}

