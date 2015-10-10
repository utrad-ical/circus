import promise = require('bluebird');

interface LruEntry<T> {
	key: string;
	item: T;
	size: number; // optional; size of the item
	time: Date;
}

interface Limits {
	maxCount: number;
	maxLife: number; // in seconds
	maxSize: number; // in bytes
	sizeKey: string;
}

type LoaderFunc<T> = (key: string) => Promise<T>;

/**
 * AsyncLruCache is an asynchronous key-value container class
 * which has the following features.
 * 1) Keys are strings.
 * 2) Values are returned with a promise.
 * 3) Automatically deletes contents using three types of limits
 *    (number of items, total size, life)
 * To use this class you have to pass a loader function to the constructor.
 * The loader function must take a key as an argument and returns a Promise
 * that will resolve with the corresponding loaded item.
 */
export default class AsyncLruCache<T> {
	private lru: LruEntry<T>[] = [];
	private pendings: {[key: string]: [Function, Function][]} = {};
	private memoryUsage: number;
	private loader: LoaderFunc<T>;
	private limits: Limits;
	private totalSize: number = 0;

	private defaultLimits: Limits = {
		maxCount: 10,
		maxLife: -1,
		maxSize: -1,
		sizeKey: 'length'
	};

	constructor (loader: LoaderFunc<T>, limits?: Limits) {
		this.loader = loader;
		this.limits = this.defaultLimits;
		if (typeof limits === 'object') {
			for (var k in limits) {
				if (k in this.limits) this.limits[k] = limits[k];
			}
		}
		if (this.limits.maxLife > 0) {
			setInterval(() => this.checkTtl(), 1000);
		}
	}

	/**
	 * Does not load anything, but synchronously returns the specified item
	 * only if it is already loaded.
	 */
	public touch(key: string): T
	{
		for (var i = 0; i < this.lru.length; i++) {
			if (this.lru[i].key === key) {
				var entry = this.lru.splice(i, 1)[0];
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
	 */
	public get(key: string): Promise<T> {
		// If already pending, just register callback
		if (key in this.pendings) {
			return new Promise<T>((resolve, reject) => {
				this.pendings[key].push([resolve, reject]);
			});
		}
		// If already loaded, return it via Promise
		var item = this.touch(key);
		if (item !== undefined) {
			// We should return this value asynchronously.
			return Promise.resolve(item);
		}
		// If not, start loading it using the loader function
		this.loader(key).then(
			item => {
				var size = (typeof item === 'object' && this.limits.sizeKey in item)
					? parseFloat(item[this.limits.sizeKey]) : 0;
				this.lru.push({	key, item, size, time: new Date() });
				this.totalSize += size;
				this.truncate();
				var callbacks = this.pendings[key];
				delete this.pendings[key];
				callbacks.forEach(funcs => funcs[0](item));
			},
			err => {
				var callbacks = this.pendings[key];
				delete this.pendings[key];
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
		for (var i = 0; i < this.lru.length; i++) {
			if (this.lru[i].key === key) return i;
		}
		return -1;
	}

	public remove(key: string): void {
		// If in pending, forget reject it and forget the callback
		if (key in this.pendings) {
			this.pendings[key].forEach(funcs => funcs[1]('Cancelled'));
			delete this.pendings[key];
		}
		// If already loaded, remove it
		var index = this.indexOf(key);
		var item = this.lru.splice(index, 1)[0];
		this.totalSize -= item.size;
	}

	public get length(): number {
		return this.lru.length;
	}

	public getTotalSize(): number {
		return this.totalSize;
	}

	protected shift(): T {
		if (this.lru.length > 0) {
			var shifted = this.lru[0];
			this.remove(shifted.key);
			return shifted.item;
		}
	}

	protected truncate(): void {
		if (this.limits.maxCount > 0) {
			while (this.lru.length > this.limits.maxCount) {
				this.shift();
			}
		}
		if (this.limits.maxSize > 0) {
			while (this.totalSize > this.limits.maxSize) {
				this.shift();
			}
		}
	}

	public checkTtl(): void {
		var now = (new Date()).getTime();
		var maxLife = this.limits.maxLife;
		if (maxLife <= 0) return;
		while (this.lru.length > 0 && now - this.lru[0].time.getTime() > maxLife) {
			this.shift();
		}
	}
}
