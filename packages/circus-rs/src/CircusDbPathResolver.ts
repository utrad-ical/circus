/// <reference path='typings/bluebird/bluebird.d.ts' />
/// <reference path='typings/mongoose/mongoose.d.ts' />

import mongoose = require('mongoose');
var Schema = mongoose.Schema;
import fs = require('fs');
import path = require('path');
import crypto = require('crypto');
import Promise = require('bluebird');

import PathResolver = require('./PathResolver');

export = CircusDbPathResolver;

class CircusDbPathResolver extends PathResolver {
	protected mongoconfig: any;
	protected db: mongoose.Connection = null; // DB connection
	protected seriesModel: mongoose.Model<any>;
	protected storageModel: mongoose.Model<any>;

	protected initialize() {
		// read configuration file
		this.mongoconfig = JSON.parse(fs.readFileSync(this.config.configPath, 'utf8'));
		console.log('Loaded MongoDB Configuration.');
	}

	public resolvePath(seriesUID: string, callback: (dir: string) => void): void {
		var dcmdir: string;
		if (!callback) return;

		var hash = crypto.createHash('sha256');
		hash.update(seriesUID);
		var hashStr = hash.digest('hex');

		this.connect()
			.then(() => {
				var findOne = Promise.promisify(this.seriesModel.findOne).bind(this.seriesModel);
				return findOne({seriesUID: seriesUID}, 'storageID');
			})
			.then(series => {
				var findOne = Promise.promisify(this.storageModel.findOne).bind(this.storageModel);
				return findOne({storageID: series.storageID, type: 'dicom', active: true}, 'path');
			})
			.then(storage => {
				dcmdir = path.join(storage.path, hashStr.substring(0, 2), hashStr.substring(2, 4), seriesUID);
				callback(dcmdir);
			})
			.catch((err: any) => {
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
			if (this.db) {
				resolve(null);
				return;
			}
			var cfg = this.mongoconfig;
			var constr: string =
				`mongodb://${cfg.username}:${cfg.password}@${cfg.host}:${cfg.port}/${cfg.database}`;
			this.db = mongoose.createConnection(constr, (err) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(null);
			});

			// define and register schema
			var seriesSchema = new Schema({
				studyUID: String,
				seriesUID: String,
				storageID: Number
			});
			var storageSchema = new Schema({
				storageID: {type: Number},
				path: {type: String},
				active: {type: Boolean}
			});
			this.seriesModel = this.db.model('Series', seriesSchema, 'Series');
			this.storageModel = this.db.model('Storages', storageSchema, 'Storages');
		});
	}
}