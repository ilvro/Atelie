import { createTutor, tutorialList, lessonForTask } from './tutor.js';
import { LESSONS } from './lessons.js';
import { escapeHTML as esc } from '../ui/icons.js';

/**
 * Connects the tutorials to the running app: what the conditions read, how a side tab or drawer is brought
 * forward, the practice documents, the list in Ajuda, the palette entries and the "?" of the tasks.
 */
export function mountTutorials({ root, shell, editor, reading, api, diagnostics = false } = {}) {
  const exported = [];
  let userFonts = 0;
  let fontTimer = null;
  let lastLesson = null;

  window.addEventListener('atelie:exported', event => {
    exported.push(event.detail?.target || 'screen');
  });

  async function refreshFonts() {
    try {
      const { items } = await api.library.list();
      userFonts = items.filter(item => item.source === 'usuario').length;
    } catch {
      userFonts = 0;
    }
  }

  function state() {
    const snapshot = editor.tutorialSnapshot();
    const tabButton = document.querySelector('.inspector-tab.active');
    const libraryChip = document.querySelector('.library-type-chips .is-active[data-type]');
    return {
      ...snapshot,
      inspectorTab: tabButton?.dataset.tab ?? null,
      drawer: shell.drawer.current?.() ?? null,
      templateDetail: Boolean(document.querySelector('.template-detail-view')),
      templateFilters: [...document.querySelectorAll('.templates-filter-slot .filter-chip.is-active')].filter(c => c.dataset.filterValue !== 'all').map(c => `${c.dataset.filterGroup}:${c.dataset.filterValue}`),
      librarySearch: document.querySelector('.library-search-input')?.value ?? '',
      libraryTab: libraryChip?.dataset.type ?? null,
      fontDialog: Boolean(document.querySelector('.font-upload-modal')),
      reading: {
        open: Boolean(reading?.isOpen?.()),
        loupe: Boolean(reading?.loupeOn),
        lantern: Boolean(reading?.lanternOn),
        flipped: Boolean(reading?.flipped),
      },
      exported,
      userFonts,
    };
  }

  const host = {
    state,
    /** Brings the side tab and the drawer of a step forward, as a person would. */
    open(step) {
      // Only when the target is not on screen: the person may be moving between tabs on purpose.
      const target = step.target && document.querySelector(step.target);
      if (target && target.getBoundingClientRect().width > 0) return;
      const current = state();
      if (step.tab && current.inspectorTab !== step.tab) shell.inspector.tab(step.tab);
      if (step.drawer && current.drawer !== step.drawer) shell.drawer.open(step.drawer);
    },
    /** After a lesson on a practice document: close it, or keep what was archived. */
    afterLesson() {
      if (!editor.hasPractice) return '';
      return '<button type="button" class="primary" data-action="tutorial-leave-practice" data-trash="1">Fechar o treino</button><button type="button" class="quiet" data-action="tutorial-leave-practice" data-trash="0">Fechar e manter o que arquivei</button>';
    },
  };

  const tutor = createTutor(root, host);
  const begin = tutor.start.bind(tutor);

  async function start(id, from = 0) {
    const lesson = LESSONS.find(entry => entry.id === id);
    if (!lesson) return false;
    shell.drawer.close();
    exported.length = 0;
    if (lesson.start && (!from || !editor.hasPractice)) {
      if (editor.hasPractice) await editor.closePractice({ trash: true });
      await editor.openPractice(lesson.start, 'Treino de tutorial', { secret: Boolean(lesson.secret) });
    }
    lastLesson = lesson;
    await refreshFonts();
    clearInterval(fontTimer);
    fontTimer = setInterval(refreshFonts, 700);
    return begin(id, from);
  }

  tutor.onChange(() => {
    if (!tutor.active) clearInterval(fontTimer);
    renderList();
  });

  /** The list of lessons lives in Ajuda ("Aprender na prática"); it is drawn into every container asking for it. */
  function renderList() {
    document.querySelectorAll('[data-tutorial-list]').forEach(box => {
      box.innerHTML = tutorialList(tutor);
    });
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;
    const action = trigger.dataset.action;
    if (action === 'tutorial-start') {
      event.preventDefault();
      start(trigger.dataset.id, Number(trigger.dataset.from || 0));
    } else if (action === 'tutorial-help') {
      event.preventDefault();
      event.stopPropagation();
      const lesson = lessonForTask(trigger.dataset.task);
      if (lesson) start(lesson.id);
    } else if (action === 'tutorial-leave-practice') {
      event.preventDefault();
      tutor.dismiss();
      editor.closePractice({ trash: trigger.dataset.trash === '1' });
    } else if (action === 'tutorial-report') {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([JSON.stringify(tutor.report(), null, 2)], { type: 'application/json' }));
      link.download = 'tutoriais-atelie.json';
      link.click();
    }
  });

  // Ctrl+K: every lesson is a command
  shell.palette?.register?.(() => LESSONS.map(lesson => ({
    title: lesson.title,
    subtitle: `${lesson.kind === 'tip' ? 'Dica' : 'Tutorial'} · ${lesson.minutes} min · ${lesson.summary}`,
    group: 'Tutoriais',
    icon: 'cap',
    run: () => start(lesson.id),
  })));

  // The help drawer is built each time it opens and asks for the list; the lists on screen follow the progress.
  window.__atelieTutorialList = () => tutorialList(tutor);

  const api2 = { tutor, start, renderList, get lastLesson() { return lastLesson; } };
  if (diagnostics) window.atelieTutor = Object.assign(tutor, { start: (id, from) => start(id, from) });
  return api2;
}

export { esc };
