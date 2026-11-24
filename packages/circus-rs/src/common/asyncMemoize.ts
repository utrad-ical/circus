import { LRUCache } from 'lru-cache';

interface AsyncLoader<T> {
  (key: string): Promise<T>;
}

export interface AsyncCachedLoader<T> extends AsyncLoader<T> {
  getLength: () => number;
  getCount: () => number;
}

interface CacheOptions<T> {
  maxSize?: number;
  ttl?: number;
  length?: (value: T, key?: string) => number;
  ttlAutopurge?: boolean;
}

/**
 * Memoize an async function that takes a single string key.
 * Backed by lru-cache.
 */
export default function asyncMemoize<T>(
  func: AsyncLoader<T>,
  options: CacheOptions<T> = {}
): AsyncCachedLoader<T> {
  const cache = new LRUCache<string, { value: Promise<T>; size: number }>({
    maxSize: options.maxSize,
    ttl: options.ttl ?? 0,
    ttlAutopurge: options.ttlAutopurge ?? true,
    sizeCalculation: entry => entry.size
  });

  const memoized: AsyncLoader<T> = (key: string) => {
    const hit = cache.get(key);
    if (hit) return hit.value;

    // Register the promise before it settles so that concurrent calls share it.
    // The size is known only after it resolves.
    const promise = func(key);
    cache.set(key, { value: promise, size: 1 });
    promise.then(
      result => {
        if (cache.peek(key)?.value !== promise) return;
        try {
          const size = options.length ? options.length(result, key) : 1;
          cache.set(key, { value: promise, size });
        } catch {
          // Do not keep an entry whose size is unknown
          cache.delete(key);
        }
      },
      () => {
        if (cache.peek(key)?.value === promise) cache.delete(key);
      }
    );
    return promise;
  };

  const getLength = () => cache.size;
  const getCount = () => cache.size;

  return Object.assign(memoized, { getLength, getCount });
}
