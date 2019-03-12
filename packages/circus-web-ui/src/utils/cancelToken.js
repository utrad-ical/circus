/**
 * Used to realize the "cancellation token pattern" to cancel a promise.
 * A time-consuming async function should take this instance as a parameter
 * and support cancellation.
 */
const cancelToken = () => {
  let isCancelled = false;
  let callbacks = [];
  return {
    cancel: () => {
      isCancelled = true;
      callbacks.forEach(cb => cb());
    },
    onCancel: cb => {
      callbacks = callbacks.filter(f => f !== cb).concat(cb);
    },
    removeListener: cb => {
      callbacks = callbacks.filter(f => f !== cb);
    },
    get cancelled() {
      return isCancelled;
    }
  };
};

export default cancelToken;
