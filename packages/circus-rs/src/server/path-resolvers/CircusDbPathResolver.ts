import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Promise } from 'es6-promise';

import logger from '../Logger';
import PathResolver from './PathResolver';

try {
	var dummy = require.resolve('mongoose');
} catch (e) {
	if (e.code === 'MODULE_NOT_FOUND') {
		logger.info('Failed loading Mongoose module. Probably it is not installed with NPM.');
	}
	throw e;
}
import * as mongoose from 'mongoose';

/**
 * A PathResolver implementation which is based on CIRCUS DB datastore.
 */
export default class CircusDbPathResolver extends PathResolver {
	protected db: mongoose.Connection = null; // DB connection
	protected seriesModel: mongoose.Model<any>;
	protected storageModel: mongoose.Model<any>;

	protected initialize(): void {
		// read configuration file
		var mongoconfig = JSON.parse(fs.readFileSync(this.config.configPath, 'utf8'));
		logger.info('Loaded MongoDB Configuration.');

		var cfg = mongoconfig;
		var constr: string =
			`mongodb://${cfg.username}:${cfg.password}@${cfg.host}:${cfg.port}/${cfg.database}`;
		this.db = mongoose.createConnection(constr);

		// define and register schema
		var seriesSchema = new mongoose.Schema({
			studyUID: String,
			seriesUID: String,
			storageID: Number
		});
		this.seriesModel = this.db.model('Series', seriesSchema, 'Series');
		var storageSchema = new mongoose.Schema({
			storageID: Number,
			path: String,
			active: Boolean
		});
		this.storageModel = this.db.model('Storages', storageSchema, 'Storages');
	}

	public resolvePath(seriesUID: string): Promise<string> {
		var dcmdir: string;

		var hash = crypto.createHash('sha256');
		hash.update(seriesUID);
		var hashStr = hash.digest('hex');

		return Promise.resolve(null).then(() => {
				return this.seriesModel.findOne({seriesUID: seriesUID}, 'storageID').exec();
			})
			.then(series => {
				return this.storageModel.findOne(
					{storageID: series.storageID, type: 'dicom', active: true}, 'path'
				).exec();
			})
			.then(storage => {
				dcmdir = path.join(storage.path, hashStr.substring(0, 2), hashStr.substring(2, 4), seriesUID);
				return dcmdir;
			})
			.catch((err: any) => {
				logger.error('DB Error: ' + err);
				if (this.db) {
					this.db.close();
					this.db = null;
				}
				throw err;
			}) as any;
	}

}
