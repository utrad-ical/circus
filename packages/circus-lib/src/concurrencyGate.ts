export interface ConcurrencyGate {
  wait: () => Promise<number>;
  finish: (id: number) => void;
  use: <T>(func: () => Promise<T>) => Promise<T>;
}

/**
 * Prevents too many async functoins from running at the same time.
 * You can use this typically in combination with `Promise.all`.
 * See the tests for examples.
 * @param maxConcurrency The number of functions that can pass
 *   the "gate" (`wait`) at the same time.
 */
const concurrencyGate = (maxConcurrency: number): ConcurrencyGate => {
  let counter = 0;
  const active: number[] = [];
  const queue: { id: number; resolve: (id: number) => void }[] = [];

  if (maxConcurrency < 1) throw new RangeError('maxConcurrency must be >= 1');

  /**
   * Waits for "my turn". Resolves when no more than `maxConcurrency` items
   * are active. The returned value (ID) must be passed to the `finish` when
   * your task is finished.
   * Prefer `use()` whenever possible.
   */
  const wait = async () => {
    const id = counter++;
    return new Promise<number>(resolve => {
      if (active.length < maxConcurrency) {
        active.push(id);
        resolve(id);
      } else {
        queue.push({ id, resolve });
      }
    });
  };

  /**
   * Marks the specified task as finished so that another async task
   * can be started.
   * Prefer `use()` whenever possible.
   * @param id The ID returned from the corresponding `wait` call.
   */
  const finish = (id: number) => {
    const idx = active.indexOf(id);
    if (idx < 0) throw new Error('This id is not active');
    active.splice(idx, 1);
    if (active.length < maxConcurrency && queue.length > 0) {
      const next = queue.shift()!;
      active.push(next.id);
      next.resolve(next.id);
    }
  };

  /**
   * A wrappter of `wait`/`finish`.
   * This is the preferred approach of using concurrencyGate.
   * It waits for my turn, calls the callback,
   * and automatically calls `finish` when the callback is finished.
   * @param func The original promise to be wrapped.
   */
  const use = async <T>(func: () => Promise<T>) => {
    const id = await wait();
    try {
      const result = await func();
      return result;
    } finally {
      finish(id);
    }
  };

  return { wait, finish, use };
};

export default concurrencyGate;
