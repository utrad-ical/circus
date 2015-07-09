/**
 * DICOM Reader class
 */

import RawData = require('./RawData');
import DicomDumper = require('./DicomDumper');
import PathResolver = require('./PathResolver');

import Logger = require('./Logger');
var logger = Logger.prepareLogger();

export = DicomReader;

class DicomReader {

	private lru: Array<string> = [];
	private cache: { [seriesUID: string]: RawData } = {};
	private threshold: number;
	private execCounter: number = 0;
	private resolver: PathResolver;
	private dumper: DicomDumper;

	private memoryThreshold: number = 1024 * 1024 * 1024; // default heap limit (1GB)

	/**
	 * Constructor
	 */
	constructor(config: any) {
		var resolverClass = require('./' + config.pathResolver.module);
		this.resolver = new resolverClass(config.pathResolver.options);

		var dumperClass = require('./' + config.dumper.module);
		this.dumper = new dumperClass(config.dumper.options);

		this.memoryThreshold = config.cache.memoryThreshold;
	}

	/**
	 * remove object from cache to keep threshold.
	 */
	public free(): void {
		//logger.info('free:: ' + this.memoryThreshold);
		var usage = process.memoryUsage();
		while (usage.heapUsed > this.memoryThreshold) {
			//logger.info('' + usage.heapUsed);

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
	public put(key: string, rawData: RawData): void {
		this.cache[key] = rawData;
		this.updateLru(key);

		this.free();

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
	public get(key: string): RawData {
		if (key in this.cache) {
			this.updateLru(key);
			// console.log("get [" + key + "]. lru=" + this.lru);
			return this.cache[key];
		}
		return null;
	}

	/**
	 *  Returns the number of loaded volumes.
	 */
	public length(): number {
		var count = 0;
		for (var s in this.cache) count++;
		return count;
	}

	// read header/image from DICOM data.
	public readData(series: string, params: any, callback: any): void
	{
		if (this.execCounter > 0) {
			//logger.trace('waiting... ');
			setTimeout(function(){ this.readData(series, params, callback) }.bind(this), 500);
			return;
		}

		this.execCounter = 1;

		var rawData: RawData = this.get(series);
		if (rawData != null) {
			// TODO: support partial reading
			/*if (rawData.containImage(image)) {
					//logger.trace('request images already cached.');
					callback(rawData, null);
					this.execCounter = 0;
					return;
			}*/
			callback(rawData, null);
			this.execCounter = 0;
			return;
		} else {
			logger.info('no cache found.');
		}

		this.resolver.resolvePath(series, (dcmdir: string) => {
			if (!dcmdir) {
				 callback(null, 'cannot resolve path.');
				 this.execCounter = 0;
				 return;
			}

			this.dumper.readDicom(dcmdir, params, (rawData: RawData) => {
				var err: string = '';
				if (rawData == null) {
					err = "cannot read image.";
					logger.info('readDicom failed.');
				} else {
					logger.info('put rawdata: ' + series);
					this.put(series, rawData);
				}
				callback(rawData, err);
				this.execCounter = 0;
			});
		});
	}

}
