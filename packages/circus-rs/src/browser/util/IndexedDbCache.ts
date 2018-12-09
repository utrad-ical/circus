export default class IndexedDbCache<T> {
  // TODO: This should be named as IndexDbKvs or something like that
  private connection: IDBDatabase | undefined;
  private queue: Promise<void>;

  private dbName: string;
  private storeName: string = 'cache';

  private static detected: IDBFactory;

  public static detect(): IDBFactory {
    if (!IndexedDbCache.detected) {
      const w = window as any;
      const indexedDB =
        w.indexedDB || w.mozIndexedDB || w.webkitIndexedDB || w.msIndexedDB;
      if (!indexedDB)
        throw Error('IndexedDB is not supported on this browser.');
      IndexedDbCache.detected = indexedDB;
    }
    return IndexedDbCache.detected;
  }

  constructor(dbName: string = 'circus-rs-cache') {
    this.dbName = dbName;
    this.queue = Promise.resolve();
    this.open();
  }

  public open(): void {
    const openFunc = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const db = IndexedDbCache.detect();
        const openRequest = db.open(this.dbName);

        openRequest.onerror = ev => {
          console.log('Error on open database');
          console.log(ev);
        };
        openRequest.onsuccess = ev => {
          this.connection = (ev.target as any).result as IDBDatabase;
          resolve();
        };
        openRequest.onupgradeneeded = ev => {
          this.connection = (ev.target as any).result as IDBDatabase;

          const store = this.connection.createObjectStore(this.storeName, {
            keyPath: 'key'
          });
          store.transaction.oncomplete = tranev => {
            resolve();
          };
        };
      });
    };

    this.queue = this.queue.then(openFunc);
  }

  public put(key: string, content: T): Promise<void> {
    const putFunc = () => {
      if (!this.connection) throw new Error('IndexedDB not initialized');
      const store = this.connection
        .transaction(this.storeName, 'readwrite')
        .objectStore(this.storeName);
      store.put({
        key: key,
        content: content
      });
    };
    this.queue = this.queue.then(putFunc);
    return this.queue;
  }

  public delete(key: string): Promise<void> {
    const deleteFunc = () => {
      if (!this.connection) throw new Error('IndexedDB not initialized');
      const store = this.connection
        .transaction(this.storeName, 'readwrite')
        .objectStore(this.storeName);
      store.delete(key);
    };
    this.queue = this.queue.then(deleteFunc);
    return Promise.resolve();
  }

  public get(key: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.then(() => {
        if (!this.connection) throw new Error('IndexedDB not initialized');
        const store = this.connection
          .transaction(this.storeName, 'readwrite')
          .objectStore(this.storeName);

        const request = store.get(key);
        request.onerror = ev => {
          resolve(undefined);
        };
        request.onsuccess = ev => {
          resolve(request.result ? request.result.content : undefined);
        };
      });
    });
  }

  public drop(): void {
    this.queue = this.queue.then(() => {
      if (this.connection) this.connection.close();
      this.connection = undefined;
      const db = IndexedDbCache.detect();
      const request = db.deleteDatabase(this.dbName);
      request.onerror = () => console.log('Drop failed');
      request.onsuccess = () => undefined; // noop
    });
  }
}
