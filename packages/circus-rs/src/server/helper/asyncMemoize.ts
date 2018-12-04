import AsyncCache from 'async-cache';

interface AsyncLoader<T> {
  (key: string): Promise<T>;
}

export interface AsyncCachedLoader<T> extends AsyncLoader<T> {
  getLength: () => number;
  getCount: () => number;
}

interface CacheOptions<T> {
  max?: number;
  maxAge?: number;
  length?: (value: T, key?: string) => number;
}

/**
 * Memoize an async function that takes a single string key.
 * Backed by async-cache.
 */
export default function asyncMemoize<T>(
  func: AsyncLoader<T>,
  options: CacheOptions<T> = {}
): AsyncCachedLoader<T> {
  const cache = new AsyncCache<T>({
    load: async (key, cb) => {
      try {
        cb(null, await func(key));
      } catch (err) {
        cb(err, (null as any) as T);
      }
    },
    max: options.max,
    maxAge: options.maxAge,
    length: options.length
  });

  const memoized: AsyncLoader<T> = (key: string) =>
    new Promise((resolve, reject) =>
      cache.get(key, (err: Error, result: T) => {
        if (err) reject(err);
        else resolve(result);
      })
    );
  const getLength = () => (cache as any)._cache.length;
  const getCount = () => cache.itemCount;

  return Object.assign(memoized, { getLength, getCount });
}
