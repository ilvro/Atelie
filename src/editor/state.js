/**
 * Editor State & Undo History
 * Pure data model managing the open handout, selection, dirty flag, and coalescing undo history.
 */
export function createEditorState(initialHandout, { now = () => Date.now(), limit = 100 } = {}) {
  let currentHandout = initialHandout;
  let savedSnapshot = initialHandout;
  let selectedLayerId = initialHandout.layers?.[0]?.id ?? null;
  let isDirty = false;

  const undoStack = [];
  const redoStack = [];
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
      return currentHandout;
    },

    get selection() {
      return selectedLayerId;
    },

    get dirty() {
      return isDirty;
    },

    get canUndo() {
      return undoStack.length > 0;
    },

    get canRedo() {
      return redoStack.length > 0;
    },

    select(layerId) {
      if (selectedLayerId === layerId) return;
      selectedLayerId = layerId;
      emit({ type: 'select', layerId });
    },

    edit(nextHandout, { label = '', coalesce = null } = {}) {
      if (nextHandout === currentHandout) {
        return;
      }

      const currentTime = now();
      const lastStep = undoStack.at(-1);

      if (coalesce && lastStep && lastStep.coalesce === coalesce && (currentTime - lastStep.time) < 600) {
        // Coalesce with the last step: preserve the previous handout snapshot, update time
        lastStep.time = currentTime;
      } else {
        // New undo step
        undoStack.push({
          handout: currentHandout,
          coalesce,
          time: currentTime,
          label,
        });

        if (undoStack.length > limit) {
          undoStack.shift();
        }
      }

      redoStack.length = 0;
      currentHandout = nextHandout;
      isDirty = currentHandout !== savedSnapshot;
      pruneSelection(currentHandout);

      emit({ type: 'edit', label });
    },

    undo() {
      if (!undoStack.length) return;

      const prev = undoStack.pop();
      redoStack.push({
        handout: currentHandout,
      });

      currentHandout = prev.handout;
      isDirty = currentHandout !== savedSnapshot;
      pruneSelection(currentHandout);

      emit({ type: 'undo' });
    },

    redo() {
      if (!redoStack.length) return;

      const next = redoStack.pop();
      undoStack.push({
        handout: currentHandout,
        time: now(),
        coalesce: null,
      });

      currentHandout = next.handout;
      isDirty = currentHandout !== savedSnapshot;
      pruneSelection(currentHandout);

      emit({ type: 'redo' });
    },

    markSaved(savedHandout = currentHandout) {
      currentHandout = savedHandout;
      savedSnapshot = currentHandout;
      isDirty = false;
      emit({ type: 'saved' });
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

