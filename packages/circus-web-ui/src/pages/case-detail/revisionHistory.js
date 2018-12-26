/**
 * Creates a container that handles undo/redo.
 */
export const createHistoryStore = (maxHistoryLength = 10) => {
  let history = [];
  let currentIndex = 0;

  const registerNew = revision => {
    history = [revision];
    currentIndex = 0;
  };

  const push = revision => {
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
  };
};
