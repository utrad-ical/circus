/// <reference path='typings/es6-promise/es6-promise.d.ts' />

var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Promise = require('es6-promise').Promise;

import PathResolver = require('./PathResolver');
export = CircusDbPathResolver;

class CircusDbPathResolver extends PathResolver {
	protected mongoconfig: any;
	protected db: any = null; // DB connection

	protected initialize() {
		// read configuration file
		this.mongoconfig = JSON.parse(fs.readFileSync(this.config.configPath, 'utf8'));
		console.log('Loaded MongoDB Configuration.');
	}

	public resolvePath(seriesUID: string, callback: (dir: string) => void): void {
		this
			.connect()
			.then(() => this.findSeries(seriesUID))
			.then(series => this.findStorage(series))
			.then(dcmdir => callback && callback(dcmdir))
			.catch((err: string) => {
				console.log('DB Error: ' + err);
				if (this.db) {
					this.db.close();
					this.db = null;
				}
				callback(null);
			});
	}

	protected connect(): Promise<any> {
		return new Promise((resolve, reject) => {
			if (this.db) resolve();
			var cfg = this.mongoconfig;
			var constr: string =
				'mongodb://' + cfg.username + ':' + cfg.password +
				'@' + cfg.host + ':' + cfg.port + '/' + cfg.database;
			this.db = mongoose.createConnection(constr, (err) => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});

			// define and register schema
			var SeriesSchema = new Schema({
				studyUID: String,
				seriesUID: String,
				storageID: Number
			});
			var StorageSchema = new Schema({
				storageID: {type: Number},
				path: {type: String},
				active: {type: Boolean}
			});
			this.db.model('Series', SeriesSchema, 'Series');
			this.db.model('Storages', StorageSchema, 'Storages');
		});
	}

	protected findSeries(seriesUID: string): Promise<any> {
		return new Promise((resolve, reject) => {
			var Series = this.db.model('Series');
			Series.findOne({seriesUID: seriesUID}, 'seriesUID storageID', (err, series) => {
				if (err) {
					reject(err);
					return;
				}
				if (!series) {
					reject('No series data in DB');
					return;
				}
				resolve(series);
			});
		});
	}

	protected findStorage(series): Promise<any> {
		return new Promise((resolve, reject) => {
			var Storages = this.db.model('Storages');
			Storages.findOne({storageID: series.storageID, type: 'dicom', active: true}, 'path', (err, storage) => {
				if (err) {
					reject(err);
					return;
				}
				var hash = crypto.createHash('sha256');
				hash.update(series.seriesUID);
				var hashStr = hash.digest('hex');

				// create path
				var dcmdir: string = path.join(storage.path, hashStr.substring(0, 2), hashStr.substring(2, 4), series.seriesUID);

				// check if the target directory exists
				fs.exists(dcmdir, exists => {
					if (exists)
						resolve(dcmdir);
					else
						reject('not exists: ' + dcmdir);
				});
			});
		});
	}
}