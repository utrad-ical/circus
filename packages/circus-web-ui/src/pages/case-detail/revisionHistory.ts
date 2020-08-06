export interface HistoryStore<T> {
  registerNew: (revision: T) => void;
  push: (revision: T) => void;
  canUndo: () => boolean;
  undo: () => void;
  canRedo: () => boolean;
  redo: () => void;
  current: () => T;
  getHistoryLength: () => number;
}

/**
 * Creates a container that handles undo/redo.
 */
export const createHistoryStore = <T>(maxHistoryLength = 10) => {
  let history: T[] = [];
  let currentIndex = 0;

  const registerNew = (revision: T) => {
    history = [revision];
    currentIndex = 0;
  };

  const push = (revision: T) => {
    history = history.slice(0, currentIndex + 1);
    history.push(revision);
    currentIndex++;
    if (history.length > maxHistoryLength) {
      history = history.slice(-maxHistoryLength);
      currentIndex = history.length - 1;
    }
  };

  const canUndo = () => {
    return currentIndex > 0;
  };

  const undo = () => {
    if (!canUndo()) return;
    currentIndex--;
  };

  const canRedo = () => {
    return currentIndex < history.length - 1;
  };

  const redo = () => {
    if (!canRedo()) return;
    currentIndex++;
  };

  const current = () => {
    return history[currentIndex];
  };

  const getHistoryLength = () => history.length;

  return {
    registerNew,
    push,
    canUndo,
    undo,
    canRedo,
    redo,
    current,
    getHistoryLength
  } as HistoryStore<T>;
};
