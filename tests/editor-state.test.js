import test from 'node:test';
import assert from 'node:assert/strict';
import { createEditorState } from '../src/editor/state.js';
import { createHandout, textLayer, addLayer } from '../src/domain/handouts.js';

test('editor state: edit, dirty flag, undo and redo', () => {
  const initial = createHandout({ name: 'Inicial' });
  const state = createEditorState(initial);

  assert.equal(state.dirty, false);
  assert.equal(state.canUndo, false);
  assert.equal(state.canRedo, false);
  assert.equal(state.handout, initial);

  const edited = { ...initial, name: 'Modificado' };
  state.edit(edited, { label: 'Renomear' });

  assert.equal(state.dirty, true);
  assert.equal(state.canUndo, true);
  assert.equal(state.canRedo, false);
  assert.equal(state.handout, edited);

  state.undo();
  assert.equal(state.handout, initial);
  assert.equal(state.canUndo, false);
  assert.equal(state.canRedo, true);
  assert.equal(state.dirty, false);

  state.redo();
  assert.equal(state.handout, edited);
  assert.equal(state.canUndo, true);
  assert.equal(state.canRedo, false);
  assert.equal(state.dirty, true);
});

test('editor state: coalesce within 600 ms vs across 700 ms', () => {
  let currentTime = 1000;
  const initial = createHandout();
  const state = createEditorState(initial, { now: () => currentTime });

  // Two edits with same coalesce key within 300 ms -> should coalesce into 1 step
  currentTime = 1000;
  const step1 = { ...initial, name: 'Dig' };
  state.edit(step1, { coalesce: 'typing' });

  currentTime = 1300; // 300 ms later (< 600 ms)
  const step2 = { ...initial, name: 'Digi' };
  state.edit(step2, { coalesce: 'typing' });

  assert.equal(state.canUndo, true);
  state.undo();
  // Undoing once brings back initial directly
  assert.equal(state.handout, initial);
  assert.equal(state.canUndo, false);

  // Redo back to step2
  state.redo();
  assert.equal(state.handout, step2);

  // Now an edit 700 ms later (> 600 ms) -> should create a second step
  currentTime = 2000; // 1300 + 700 ms
  const step3 = { ...initial, name: 'Digitando' };
  state.edit(step3, { coalesce: 'typing' });

  state.undo(); // back to step2
  assert.equal(state.handout, step2);
  assert.equal(state.canUndo, true);

  state.undo(); // back to initial
  assert.equal(state.handout, initial);
});

test('editor state: undo after adding and selecting a layer resets selection to null', () => {
  const initial = createHandout();
  const state = createEditorState(initial);

  const layer = textLayer({ id: 'layer-temp', name: 'Temp' });
  const withLayer = addLayer(initial, layer);

  state.edit(withLayer);
  state.select('layer-temp');
  assert.equal(state.selection, 'layer-temp');

  state.undo();
  // Layer 'layer-temp' no longer exists in initial document
  assert.equal(state.selection, null);
});

test('editor state: history limit discards oldest steps', () => {
  const initial = createHandout();
  const state = createEditorState(initial, { limit: 3 });

  let cur = initial;
  for (let i = 1; i <= 5; i++) {
    cur = { ...cur, name: `Passo ${i}` };
    state.edit(cur);
  }

  // With limit 3, only 3 undos are possible
  let count = 0;
  while (state.canUndo) {
    state.undo();
    count++;
  }
  assert.equal(count, 3);
  // It stopped at Passo 2 (since 5 -> 4 -> 3 -> 2 was 3 undos)
  assert.equal(state.handout.name, 'Passo 2');
});

test('editor state: markSaved clears dirty flag, new edit re-enables it', () => {
  const initial = createHandout();
  const state = createEditorState(initial);

  const doc1 = { ...initial, name: 'Alterado' };
  state.edit(doc1);
  assert.equal(state.dirty, true);

  state.markSaved();
  assert.equal(state.dirty, false);

  const doc2 = { ...doc1, name: 'Alterado Novamente' };
  state.edit(doc2);
  assert.equal(state.dirty, true);
});

test('editor state: steps list and goTo navigation', () => {
  const initial = createHandout({ name: 'Passo 0' });
  const state = createEditorState(initial);

  assert.equal(state.steps.length, 1);
  assert.equal(state.steps[0].label, 'Documento aberto');
  assert.equal(state.steps[0].isCurrent, true);
  assert.equal(state.steps[0].isUndone, false);

  state.edit({ ...initial, name: 'Passo 1' }, { label: 'Adicionar Texto' });
  state.edit({ ...initial, name: 'Passo 2' }, { label: 'Mover Camada' });
  state.edit({ ...initial, name: 'Passo 3' }, { label: 'Girar Camada' });

  assert.equal(state.steps.length, 4);
  assert.equal(state.stepIndex, 3);
  assert.equal(state.steps[3].isCurrent, true);
  assert.equal(state.handout.name, 'Passo 3');

  // Navigate to step 1
  state.goTo(1);
  assert.equal(state.stepIndex, 1);
  assert.equal(state.handout.name, 'Passo 1');
  assert.equal(state.steps[1].isCurrent, true);
  assert.equal(state.steps[2].isUndone, true);
  assert.equal(state.steps[3].isUndone, true);

  // Navigate to step 0 (initial)
  state.goTo(0);
  assert.equal(state.stepIndex, 0);
  assert.equal(state.handout.name, 'Passo 0');

  // Navigate back to step 3
  state.goTo(3);
  assert.equal(state.stepIndex, 3);
  assert.equal(state.handout.name, 'Passo 3');
});

