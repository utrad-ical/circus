interface LruEntry<T> {
  key: string;
  item: T;
  size: number; // optional; size of the item
  time: Date;
}

export interface AsyncLruCacheOptions<T> {
  maxCount: number;
  maxLife: number; // in seconds
  maxSize: number; // in bytes
  sizeFunc: (item: T) => number;
}

type AsyncLruCacheOptionsParameter<T> = Partial<AsyncLruCacheOptions<T>>;

type LoaderFunc<T> = (key: string, ...context: any[]) => Promise<T>;

/**
 * AsyncLruCache is an asynchronous key-value container class
 * which has the following features.
 *
 * 1. Keys are strings.
 * 2. Values are always returned via promises.
 * 3. Automatically removes contents using three types of limits
 *    (number of items, total size, life)
 *
 * To use this class you have to pass a loader function to the constructor.
 * The loader function must take a key as an argument and return a Promise
 * that will resolve with the corresponding loaded item.
 */
export default class AsyncLruCache<T> {
  private timer: any = null;
  private lru: LruEntry<T>[] = [];
  private pendings: { [key: string]: [Function, Function][] } = {};
  private loader: LoaderFunc<T>;
  private options: AsyncLruCacheOptions<T>;
  private totalSize: number = 0;

  private static collection: AsyncLruCache<any>[] = [];

  private defaultOptions(): AsyncLruCacheOptions<T> {
    return {
      maxCount: 10,
      maxLife: -1,
      maxSize: -1,
      sizeFunc: (item: T): number => 1
    };
  }

  constructor(
    loader: LoaderFunc<T>,
    options: AsyncLruCacheOptionsParameter<T> = {}
  ) {
    this.loader = loader;
    this.options = { ...this.defaultOptions(), ...options };
    if (this.options.maxLife > 0) {
      this.timer = setInterval(() => this.checkTtl(), 1000);
    }
    AsyncLruCache.collection.push(this);
  }

  /**
   * Stops the internal timer.
   */
  public dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.truncate();
    AsyncLruCache.collection.splice(AsyncLruCache.collection.indexOf(this), 1);
  }

  /**
   * Does not load anything, but synchronously returns the specified item
   * only if it is already loaded.
   */
  public touch(key: string): T | undefined {
    for (let i = 0; i < this.lru.length; i++) {
      if (this.lru[i].key === key) {
        let entry = this.lru.splice(i, 1)[0];
        entry.time = new Date(); // renew time
        this.lru.push(entry);
        return entry.item;
      }
    }
    return undefined;
  }

  /**
   * Asynchronously returns the specified item using a Promise.
   * When a new key is passed, the loader function will be triggered.
   * @param key The string key of the item wanted.
   * @param context Optional parameters passed to the loader function.
   * @return The resulting item, wrapped with a Promise.
   */
  public get(key: string, ...context: any[]): Promise<T> {
    // If already pending, just register callback
    if (key in this.pendings) {
      return new Promise<T>((resolve, reject) => {
        this.pendings[key].push([resolve, reject]);
      });
    }
    // If already loaded, return it via Promise
    let item = this.touch(key);
    if (item !== undefined) {
      // We should return this value asynchronously.
      return Promise.resolve(item);
    }
    // If not, start loading it using the loader function
    this.loader(key, ...context).then(
      (loaded: T) => {
        const size = this.options.sizeFunc(loaded);
        this.lru.push({ key, item: loaded, size, time: new Date() });
        this.totalSize += size;
        this.truncate();
        let callbacks = this.pendings[key];
        delete this.pendings[key];
        if (!callbacks) return; // ignore cancelled pendings
        callbacks.forEach(funcs => funcs[0](loaded));
      },
      (err: any) => {
        let callbacks = this.pendings[key];
        delete this.pendings[key];
        if (!callbacks) return; // ignore cancelled pendings
        callbacks.forEach(funcs => funcs[1](err));
      }
    );
    return new Promise<T>((resolve, reject) => {
      this.pendings[key] = [[resolve, reject]];
    });
  }

  public getAt(index: number): T {
    return this.lru[index].item;
  }

  public indexOf(key: string): number {
    for (let i = 0; i < this.lru.length; i++) {
      if (this.lru[i].key === key) return i;
    }
    return -1;
  }

  public remove(key: string): void {
    // If in pending, forget reject it and forget the callback
    if (key in this.pendings) {
      const callbacks = this.pendings[key];
      delete this.pendings[key];
      if (!callbacks) return; // ignore cancelled pendings
      const err = new Error('Cancelled');
      callbacks.forEach(funcs => funcs[1](err));
    }
    // If already loaded, remove it
    const index = this.indexOf(key);
    if (index >= 0) {
      const item = this.lru.splice(index, 1)[0];
      this.totalSize -= item.size;
    }
  }

  public get length(): number {
    return this.lru.length;
  }

  public getTotalSize(): number {
    return this.totalSize;
  }

  protected shift(): T | undefined {
    if (this.lru.length > 0) {
      const shifted = this.lru[0];
      this.remove(shifted.key);
      return shifted ? shifted.item : undefined;
    }
  }

  protected truncate(): void {
    if (this.options.maxCount > 0) {
      while (this.lru.length > this.options.maxCount) {
        this.shift();
      }
    }
    if (this.options.maxSize > 0) {
      while (this.totalSize > this.options.maxSize) {
        this.shift();
      }
    }
  }

  /**
   * Checks the max age. This will called automatically,
   * but it's possible to call this manually.
   */
  public checkTtl(): void {
    const now = new Date().getTime();
    const maxLife = this.options.maxLife * 1000;
    if (maxLife <= 0) return;
    while (this.lru.length > 0 && now - this.lru[0].time.getTime() > maxLife) {
      this.shift();
      this.shift();
    }
  }

  /**
   * Get total of all instance cache size.
   */
  public static getTotalOfTotalSize(): number {
    return AsyncLruCache.collection.reduce((p, i) => p + i.getTotalSize(), 0);
  }
}

type Decorate<L> = (loader: L) => L;
export function asyncLruCachify<D>(
  options: AsyncLruCacheOptionsParameter<D>
): Decorate<LoaderFunc<D>> {
  return function(reader: LoaderFunc<D>): LoaderFunc<D> {
    const cache = new AsyncLruCache<D>(reader, options);
    return function(key: string) {
      return cache.get(key);
    };
  };
}
