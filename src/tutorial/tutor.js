import { LESSONS } from './lessons.js';
import { met, measure } from './conditions.js';
import { escapeHTML as esc } from '../ui/icons.js';

const STORE = 'atelie-tutorials-v1';
const LOG = 'atelie-tutorials-log-v1';
const load = key => { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private window */ } };
/** After this long on a step the ring insists; after the second, the card offers the values. In seconds. */
const INSIST = 20;
const OFFER = 35;

/**
 * Runs a lesson over the live editor. It only points and waits: the person operates the real interface,
 * and a step completes when its condition on the real document holds.
 * `host` supplies `state()` for the conditions, `open(step)` to bring a side tab or drawer forward, and
 * `afterLesson(lesson, completed)` (optional) returns the buttons of the closing card.
 *
 * Help comes in steps and never does the step: after a while the ring insists, then the card offers to show where
 * (for a step done alone, without the ring) and the values the step asks for. Steps with `try` show only the goal.
 */
export function createTutor(root, host) {
  const layer = document.createElement('div');
  layer.className = 'tutor';
  layer.hidden = true;
  layer.innerHTML = '<div class="tutor-ring" hidden></div><section class="tutor-card" role="dialog" aria-live="polite" aria-label="Tutorial"></section>';
  root.append(layer);
  const ring = layer.firstElementChild;
  const card = layer.lastElementChild;
  let lesson = null;
  let index = 0;
  let frame = 0;
  let shown = -1;
  let missing = 0;
  let held = -1;
  const listeners = [];
  let ending = null;
  // The step's clock and help: when it was shown, whether the person asked to see where, and how far it was at the start.
  let since = 0;
  let shownWhere = false;
  let startLeft = 0;
  let lastNear = '';
  const progress = load(STORE) ?? {};
  const step = () => lesson?.steps[index];
  const emit = () => listeners.forEach(listener => listener());
  const alone = current => Boolean(current.try) && !shownWhere;
  const write = () => save(STORE, progress);

  /** What the person does on each step, kept in this browser only, to find the steps that confuse. */
  function note(kind) {
    if (!lesson) return;
    const log = load(LOG) ?? {};
    const entry = log[lesson.id] ??= { starts: 0, completes: 0, steps: {} };
    const at = entry.steps[index] ??= { seconds: 0, skips: 0, backs: 0, lost: 0, hints: 0 };
    if (kind === 'start') entry.starts++;
    else if (kind === 'complete') entry.completes++;
    else if (kind === 'leave') at.seconds = Math.round(at.seconds + (performance.now() - since) / 1000);
    else at[kind]++;
    save(LOG, log);
  }

  /** The values a step asks for, as a person reads them on screen: the label of each field and what goes in it. */
  const actsOf = current => (Array.isArray(current.act?.[0]) ? current.act : [current.act]);
  function hint(current) {
    if (current.hint) return current.hint;
    const labelOf = selector => {
      const node = root.querySelector(selector);
      const field = node?.closest('.field, .check');
      return (field?.querySelector('.field-label')?.firstChild?.textContent ?? field?.querySelector('span')?.textContent ?? '').trim();
    };
    const shownValue = value => (/^-?\d+(\.\d+)?$/.test(value) ? value.replace('.', ',') : value);
    return actsOf(current)
      .filter(act => ['fill', 'set', 'select'].includes(act?.[0]))
      .map(([, selector, value]) => {
        const label = labelOf(selector);
        return label ? `<b>${esc(label)}</b>: ${esc(shownValue(String(value)))}` : esc(shownValue(String(value)));
      })
      .join(' · ');
  }

  function render() {
    const current = step();
    const last = index === lesson.steps.length - 1;
    const waits = current.done?.[0] === 'read' || held === index;
    card.innerHTML = `<header><span class="eyebrow">${esc(lesson.title)} · ${index + 1} de ${lesson.steps.length}</span><button type="button" class="quiet" data-tutor="exit" aria-label="Sair do tutorial">Sair</button></header>
      <div class="tutor-progress"><i style="width:${(((index + 1) / lesson.steps.length) * 100).toFixed(1)}%"></i></div>
      ${current.try ? '<p class="tutor-alone">Agora sozinho</p>' : ''}<p class="tutor-say">${current.say}</p>${current.why ? `<p class="tutor-why">${current.why}</p>` : ''}
      <div class="tutor-near" hidden><span></span><i><b></b></i></div>
      <p class="tutor-hint" hidden></p>
      <p class="tutor-lost" hidden>Não encontrei este controle na tela. Siga a instrução acima; se não der, pule o passo.</p>
      <div class="tutor-help" hidden>${current.try && current.target ? '<button type="button" class="quiet" data-tutor="where">Mostrar onde</button>' : ''}${current.try ? '' : hint(current) ? '<button type="button" class="quiet" data-tutor="value">Mostrar o valor</button>' : ''}</div>
      <footer><button type="button" class="quiet" data-tutor="back" ${index ? '' : 'disabled'}>Voltar</button>${waits ? `<button type="button" class="primary" data-tutor="next">${last ? 'Concluir' : 'Continuar'}</button>` : '<button type="button" class="quiet" data-tutor="skip">Pular passo</button>'}</footer>`;
    shown = index;
    missing = 0;
    since = performance.now();
    shownWhere = false;
    startLeft = 0;
    lastNear = '';
    ring.classList.remove('insist');
  }

  /** The target on screen, after bringing its tab or drawer forward. A step done alone leaves finding it to the person. */
  function prepare(current) {
    if (alone(current)) return current.target && root.querySelector(current.target);
    host.open?.(current);
    return current.target && root.querySelector(current.target);
  }

  function box(target) {
    const field = target.matches('input, select, textarea') ? target.closest('.field, .check') || target : target;
    return field.getBoundingClientRect();
  }

  /** "Quase lá": how far a step reached by degrees still is, as a line and a bar that fills. */
  function gauge(current, state) {
    const near = card.querySelector('.tutor-near');
    if (!near) return;
    const reading = measure(current.done, state);
    if (!reading) { near.hidden = true; return; }
    startLeft = Math.max(startLeft, reading.left);
    const filled = startLeft > 0 ? Math.max(0, Math.min(1, 1 - reading.left / startLeft)) : 0;
    if (reading.text !== lastNear) { near.querySelector('span').textContent = reading.text; lastNear = reading.text; }
    near.querySelector('b').style.width = `${(filled * 100).toFixed(0)}%`;
    near.hidden = false;
  }

  function tick() {
    frame = requestAnimationFrame(tick);
    const current = step();
    if (!current) return;
    if (shown !== index) render();
    const state = host.state();
    // Done by any path, including before the step was shown. A step the person went back to is theirs to leave.
    if (current.done?.[0] !== 'read' && held !== index && met(current.done, state)) { advance(); return; }
    const target = prepare(current);
    const rect = target && box(target);
    const visible = rect && rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight;
    // A control scrolled out of its panel is brought into view before the ring goes around it.
    if (target && !visible && rect.width > 0 && !alone(current)) target.scrollIntoView({ block: 'center' });
    const pointing = visible && !alone(current);
    ring.hidden = !pointing;
    if (pointing) {
      const pad = 5;
      Object.assign(ring.style, { left: `${rect.left - pad}px`, top: `${rect.top - pad}px`, width: `${rect.width + pad * 2}px`, height: `${rect.height + pad * 2}px` });
    }
    // A missing target is reported once it has stayed missing for a moment, not while a panel is still opening.
    const wasLost = missing >= 90;
    missing = current.target && !visible && !alone(current) ? missing + 1 : 0;
    card.querySelector('.tutor-lost').hidden = missing < 90;
    if (missing >= 90 && !wasLost) note('lost');
    layer.dataset.missing = missing >= 90 ? current.target : '';
    place(pointing ? rect : null);
    if (current.done?.[0] !== 'read') {
      gauge(current, state);
      const waited = (performance.now() - since) / 1000;
      const help = card.querySelector('.tutor-help');
      ring.classList.toggle('insist', waited > INSIST);
      if (help && help.hidden && help.children.length && waited > (current.try ? INSIST : OFFER)) help.hidden = false;
    }
  }

  /** The card sits beside the target without covering it; at the lower corner when there is none. */
  function place(rect) {
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const gap = 16;
    let left = innerWidth - width - 24;
    let top = innerHeight - height - 24;
    if (rect && rect.width > innerWidth / 2) {
      left = innerWidth - width - 12;
      top = Math.max(12, rect.top + 60);
    } else if (rect) {
      const right = rect.right + gap + width < innerWidth;
      const below = rect.bottom + gap + height < innerHeight;
      if (right) { left = rect.right + gap; top = Math.min(Math.max(12, rect.top), innerHeight - height - 12); }
      else if (rect.left - gap - width > 0) { left = rect.left - gap - width; top = Math.min(Math.max(12, rect.top), innerHeight - height - 12); }
      else { left = Math.min(Math.max(12, rect.left), innerWidth - width - 12); top = below ? rect.bottom + gap : Math.max(12, rect.top - gap - height); }
    }
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
  }

  function advance() {
    note('leave');
    if (index >= lesson.steps.length - 1) { finish(true); return; }
    held = -1;
    index++;
    progress[lesson.id] = { ...progress[lesson.id], step: index };
    write();
    emit();
  }

  /** What the lesson taught, from the steps marked with `learn`: a key and what it does, or a phrase. */
  const learned = finished => finished.steps
    .flatMap(entry => (entry.learn ? [entry.learn] : []))
    .map(item => (Array.isArray(item) ? `<li><kbd>${esc(item[0])}</kbd> ${esc(item[1])}</li>` : `<li>${esc(item)}</li>`))
    .join('');

  /** The closing card: what was learned, the next tutorial and the way back from the practice document. */
  function closing(finished, completed) {
    const extra = host.afterLesson?.(finished, completed) ?? '';
    const next = completed && finished.next && LESSONS.find(entry => entry.id === finished.next);
    const list = completed ? learned(finished) : '';
    if (!completed && !extra) return;
    ending = finished.id;
    card.innerHTML = `<header><span class="eyebrow">${esc(finished.title)}</span><button type="button" class="quiet" data-tutor="close" aria-label="Fechar">Fechar</button></header>
      <p class="tutor-say">${completed ? 'Concluído.' : 'Você saiu do tutorial. O progresso fica guardado.'}</p>
      ${list ? `<p class="tutor-why">O que você aprendeu:</p><ul class="tutor-learned">${list}</ul>` : ''}
      <footer class="tutor-closing">${extra}${next ? `<button type="button" class="${extra ? 'quiet' : 'primary'}" data-action="tutorial-start" data-id="${next.id}">Próximo: ${esc(next.title)}</button>` : ''}</footer>`;
    layer.hidden = false;
    ring.hidden = true;
    card.style.left = `${Math.round(innerWidth - card.offsetWidth - 24)}px`;
    card.style.top = `${Math.round(innerHeight - card.offsetHeight - 24)}px`;
  }

  function dismiss() {
    if (ending && !lesson) { ending = null; layer.hidden = true; }
  }

  function finish(completed) {
    cancelAnimationFrame(frame);
    layer.hidden = true;
    ring.hidden = true;
    document.body.classList.remove('tutoring');
    const finished = lesson;
    if (lesson) {
      if (completed) note('complete'); else note('leave');
      progress[lesson.id] = completed ? { done: true } : { ...progress[lesson.id], step: index };
      write();
    }
    lesson = null;
    shown = -1;
    emit();
    if (finished) closing(finished, completed);
  }

  layer.addEventListener('click', event => {
    const action = event.target.closest('[data-tutor]')?.dataset.tutor;
    if (action === 'close' || (event.target.closest('[data-action]') && ending && !lesson)) { dismiss(); return; }
    if (!action || !lesson) return;
    if (action === 'exit') finish(false);
    else if (action === 'back') { note('leave'); note('backs'); index = Math.max(0, index - 1); held = index; shown = -1; emit(); }
    else if (action === 'where') { shownWhere = true; note('hints'); event.target.remove(); }
    else if (action === 'value') { const hintBox = card.querySelector('.tutor-hint'); hintBox.innerHTML = hint(step()); hintBox.hidden = false; note('hints'); event.target.remove(); }
    else { if (action === 'skip') note('skips'); advance(); }
  });

  return {
    lessons: LESSONS,
    progress: () => ({ ...progress }),
    get active() { return lesson && { id: lesson.id, step: index, total: lesson.steps.length, missing: layer.dataset.missing || null }; },
    start(id, from = 0) {
      const found = LESSONS.find(entry => entry.id === id);
      if (!found) return false;
      cancelAnimationFrame(frame);
      ending = null;
      held = -1;
      lesson = found;
      index = Math.max(0, Math.min(found.steps.length - 1, from));
      shown = -1;
      layer.hidden = false;
      document.body.classList.add('tutoring');
      note('start');
      frame = requestAnimationFrame(tick);
      emit();
      return true;
    },
    stop: () => finish(false),
    /** "Mostrar onde" on a step done alone: the ring and the panel come back. */
    showWhere() {
      if (lesson && step().try) { shownWhere = true; card.querySelector('[data-tutor="where"]')?.remove(); }
    },
    dismiss,
    /** Where people stop, skip and ask for help, per lesson and step, for whoever improves the lessons. */
    report: () => ({ exported: new Date().toISOString(), progress: { ...progress }, steps: load(LOG) ?? {} }),
    onChange(listener) { listeners.push(listener); },
  };
}

/** The folders of the tutorial list, in order; a lesson names its folder with `folder`. */
export const LESSON_FOLDERS = [
  { id: 'start', name: 'Primeiros passos', about: 'Preencher, montar e envelhecer um documento.' },
  { id: 'inquiry', name: 'Investigação', about: 'Fichas, fotos e provas.' },
  { id: 'secrets', name: 'Segredos', about: 'Tinta invisível e leitura como os jogadores.' },
  { id: 'production', name: 'Produção', about: 'Do documento para a mesa de jogo.' },
  { id: 'news', name: 'Abas, verso, desenho e fontes', about: 'Trabalhar com vários documentos e ferramentas novas.' },
  { id: 'tips', name: 'Dicas rápidas', about: 'Um minuto cada. Também no “?” de cada tarefa.' },
];

const KINDS = { tip: 'dica', lesson: 'lição' };

/** The list of lessons, in folders, with what was done and where one stopped. */
export function tutorialList(tutor) {
  const progress = tutor.progress();
  const card = lesson => {
    const state = progress[lesson.id] ?? {};
    const resume = !state.done && state.step > 0;
    return `<article class="lesson ${state.done ? 'done' : ''}" data-lesson="${lesson.id}">
      <h4>${esc(lesson.title)}<small>${KINDS[lesson.kind ?? 'lesson']} · ${lesson.minutes} min · ${lesson.steps.length} passos${state.done ? ' · concluído' : resume ? ` · parou no passo ${state.step + 1}` : ''}</small></h4>
      <p>${esc(lesson.summary)}</p>
      <div class="lesson-actions"><button type="button" class="at-btn is-sm is-primary" data-action="tutorial-start" data-id="${lesson.id}">${state.done ? 'Refazer' : 'Começar'}</button>${resume ? `<button type="button" class="at-btn is-sm" data-action="tutorial-start" data-id="${lesson.id}" data-from="${state.step}">Continuar do passo ${state.step + 1}</button>` : ''}</div>
    </article>`;
  };
  const folders = LESSON_FOLDERS
    .map(folder => ({ folder, lessons: tutor.lessons.filter(lesson => (lesson.folder ?? 'start') === folder.id) }))
    .filter(entry => entry.lessons.length);
  return folders.map(({ folder, lessons }) => {
    const done = lessons.filter(lesson => progress[lesson.id]?.done).length;
    return `<details class="lesson-folder" data-lesson-folder="${folder.id}" ${done < lessons.length && folder.id !== 'tips' ? 'open' : ''}>
      <summary><span>${esc(folder.name)}</span><small>${done} de ${lessons.length} concluídos${folder.about ? ` · ${esc(folder.about)}` : ''}</small></summary>
      ${lessons.map(card).join('')}</details>`;
  }).join('');
}

/** The tutorial for a task of the panel, by the task's key: the "?" beside its title. Tips first, they answer fastest. */
export function lessonForTask(key) {
  const found = LESSONS.filter(lesson => [lesson.task].flat().includes(key));
  return found.find(lesson => lesson.kind === 'tip') ?? found[0] ?? null;
}
