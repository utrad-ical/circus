export interface CancelToken {
  cancel: () => void;
  onCancel: (cb: Function) => void;
  removeListener: (cb: Function) => void;
  readonly cancelled: boolean;
}

/**
 * Used to realize the "cancellation token pattern" to cancel a promise.
 * A time-consuming async function should take this instance as a parameter
 * and support cancellation.
 */
const cancelToken = () => {
  let isCancelled = false;
  let callbacks: Function[] = [];
  return {
    cancel: () => {
      isCancelled = true;
      callbacks.forEach(cb => cb());
    },
    onCancel: (cb: Function) => {
      callbacks = callbacks.filter(f => f !== cb).concat(cb);
    },
    removeListener: (cb: Function) => {
      callbacks = callbacks.filter(f => f !== cb);
    },
    get cancelled() {
      return isCancelled;
    }
  } as CancelToken;
};

export default cancelToken;
