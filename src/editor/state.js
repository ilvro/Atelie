/**
 * Editor State & Undo History
 * Pure data model managing the open handout, selection, dirty flag, and coalescing undo history.
 */
export function createEditorState(initialHandout, { now = () => Date.now(), limit = 100 } = {}) {
  let savedSnapshot = initialHandout;
  let selectedLayerId = initialHandout.layers?.[0]?.id ?? null;
  let isDirty = false;

  // History is modeled as a list of step snapshots:
  // [ { label, handout, time, coalesce } ]
  const history = [
    {
      label: 'Documento aberto',
      handout: initialHandout,
      time: now(),
      coalesce: null,
    },
  ];
  let currentIndex = 0;

  const listeners = new Set();

  function emit(change) {
    for (const fn of listeners) {
      try {
        fn(change);
      } catch (err) {
        console.error('[atelie] Erro no listener do editor:', err);
      }
    }
  }

  function pruneSelection(handout) {
    if (selectedLayerId && !handout.layers.some(l => l.id === selectedLayerId)) {
      selectedLayerId = null;
    }
  }

  return {
    get handout() {
      return history[currentIndex].handout;
    },

    get selection() {
      return selectedLayerId;
    },

    get dirty() {
      return isDirty;
    },

    get canUndo() {
      return currentIndex > 0;
    },

    get canRedo() {
      return currentIndex < history.length - 1;
    },

    get stepIndex() {
      return currentIndex;
    },

    get steps() {
      return history.map((step, idx) => ({
        index: idx,
        label: step.label,
        isCurrent: idx === currentIndex,
        isUndone: idx > currentIndex,
      }));
    },

    select(layerId) {
      if (selectedLayerId === layerId) return;
      selectedLayerId = layerId;
      emit({ type: 'select', layerId });
    },

    edit(nextHandout, { label = '', coalesce = null } = {}) {
      const current = history[currentIndex].handout;
      if (nextHandout === current) {
        return;
      }

      const currentTime = now();
      const currentStep = history[currentIndex];

      if (
        coalesce &&
        currentStep &&
        currentStep.coalesce === coalesce &&
        currentTime - currentStep.time < 600
      ) {
        // Coalesce with current step: update handout and timestamp
        currentStep.handout = nextHandout;
        currentStep.time = currentTime;
        if (label) currentStep.label = label;
      } else {
        // Truncate any future undone steps
        history.splice(currentIndex + 1);

        // Push new step
        history.push({
          label: label || 'Edição',
          handout: nextHandout,
          time: currentTime,
          coalesce,
        });

        currentIndex = history.length - 1;

        // Enforce history limit
        while (history.length > limit + 1) {
          history.shift();
          currentIndex = Math.max(0, currentIndex - 1);
        }
      }

      isDirty = history[currentIndex].handout !== savedSnapshot;
      pruneSelection(history[currentIndex].handout);

      emit({ type: 'edit', label });
    },

    undo() {
      if (currentIndex <= 0) return;
      currentIndex--;
      isDirty = history[currentIndex].handout !== savedSnapshot;
      pruneSelection(history[currentIndex].handout);
      emit({ type: 'undo' });
    },

    redo() {
      if (currentIndex >= history.length - 1) return;
      currentIndex++;
      isDirty = history[currentIndex].handout !== savedSnapshot;
      pruneSelection(history[currentIndex].handout);
      emit({ type: 'redo' });
    },

    goTo(index) {
      if (typeof index !== 'number') return;
      const target = Math.max(0, Math.min(history.length - 1, Math.round(index)));
      if (target === currentIndex) return;

      currentIndex = target;
      isDirty = history[currentIndex].handout !== savedSnapshot;
      pruneSelection(history[currentIndex].handout);
      emit({ type: 'goto', index: currentIndex });
    },

    markSaved(savedHandout = history[currentIndex].handout) {
      history[currentIndex].handout = savedHandout;
      savedSnapshot = savedHandout;
      isDirty = false;
      emit({ type: 'saved' });
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
