export interface ConcurrencyGate {
  enter: () => Promise<number>;
  exit: (id: number) => void;
  use: <T>(func: () => Promise<T>) => Promise<T>;
}

/**
 * Prevents too many async functoins from running at the same time.
 * You can use this typically in combination with `Promise.all`.
 * See the tests for examples.
 * @param maxConcurrency The number of functions that can enter
 * the "gate" at the same time.
 */
const concurrencyGate = (maxConcurrency: number): ConcurrencyGate => {
  let counter = 0;
  const active: number[] = [];
  const queue: { id: number; resolve: (id: number) => void }[] = [];

  if (typeof maxConcurrency !== 'number')
    throw new TypeError('maxConcurrency must be an integer');
  if (maxConcurrency < 1)
    throw new RangeError('maxConcurrency must be an integer >= 1');

  /**
   * Waits for "my turn". Resolves when no more than `maxConcurrency` items
   * are active. The returned value (ID) must be passed to the `exit` when
   * your task is finished.
   * Prefer `use()` whenever possible.
   */
  const enter = async () => {
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
   * @param id The ID returned from the corresponding `enter` call.
   */
  const exit = (id: number) => {
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
   * A wrappter around the `enter`/`exit` pair.
   * This is the preferred approach of using concurrencyGate.
   * It waits for my turn, calls the callback,
   * and automatically calls `finish` when the callback is finished.
   * @param func The original promise to be wrapped.
   */
  const use = async <T>(func: () => Promise<T>) => {
    const id = await enter();
    try {
      const result = await func();
      return result;
    } finally {
      exit(id);
    }
  };

  return { enter, exit, use };
};

export default concurrencyGate;
