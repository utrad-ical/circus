/**
 * ImageCache class
 */

export = ImageCache;

class ImageCache {

	private lru: Array<string> = [];
	private cache: any = {};
	private threshold: number;

	/**
	 * Constructor
	 *
	 * threshold: upper limit of heap memory size. (in bytes)
	 *    When object added, cached object will remove to keep threshold.
	 *    So this threshold is not strictly.
	 */
	constructor(threshold: number) {
		this.threshold = threshold;
	}

	/**
	 * remove object from cache to keep threshold.
	 */
	public free(): void {
		var usage = process.memoryUsage();
		while (usage.heapUsed < this.threshold) {
			console.log(usage);

			if (this.lru.length > 0) {
				var key = this.lru.shift();
				delete this.cache[key];
			} else {
				break;
			}
			usage = process.memoryUsage();
		}

		// console.log("free. lru=" + this.lru);
	}

	/**
	 * update cache entry LRU.
	 *
	 * key: key name of last used object.
	 */
	public updateLru(key: string): void {
		var lruIndex = this.lru.indexOf(key);
		if (lruIndex != -1) {
			this.lru.splice(lruIndex, 1);
		}
		this.lru.push(key);
	}

	/**
	 * put data to cache.
	 *
	 * key: key name of last used object.
	 * rawData: object to be cached.
	 */
	public put(key: string, rawData: any): void {
		this.free();

		this.cache[key] = rawData;
		this.updateLru(key);

		// console.log("put [" + key + "]. lru=" + this.lru);
	}

	/**
	 * remove object from cache.
	 *
	 * key: key name of object to be removed.
	 */
	public remove(key: string): void {
		delete this.cache[key];
		var index = this.lru.indexOf(key);
		if (index !== -1) {
			this.lru.splice(index, 1);
		}

		// console.log("put [" + key + "]. lru=" + this.lru);
	}

	/**
	 * get data from cache.
	 *
	 * key: key name of object to retrieve.
	 */
	public get(key: string): any {
		if (key in this.cache) {
			this.updateLru(key);
			// console.log("get [" + key + "]. lru=" + this.lru);
			return this.cache[key];
		}
		return null;
	}

}
