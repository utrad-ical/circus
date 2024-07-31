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

  const memoized: AsyncLoader<T> = async (key: string) => {
    if (cache.has(key)) {
      return cache.get(key)!.value;
    }

    const promise = func(key);
    const size = options.length
      ? await promise.then(result => options.length!(result, key))
      : 0;

    cache.set(key, { value: promise, size });
    return promise;
  };

  const getLength = () => cache.size;
  const getCount = () => cache.size;

  return Object.assign(memoized, { getLength, getCount });
}
