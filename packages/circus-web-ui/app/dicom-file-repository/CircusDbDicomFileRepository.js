'use strict';

/*
 Defines DicomFileRepository module used by the bundled CIRCUS RS.
 */

const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise; // Plug-in native Promise

const multirange = require('multi-integer-range').multirange;

const rs = path.resolve(__dirname, '../../vendor/utrad-ical/circus-rs/');
const DicomFileRepository = require(path.resolve(rs, 'lib/server/dicom-file-repository/DicomFileRepository')).default;

function pad8(num) {
	return ('00000000' + num).slice(-8);
}

class CircusDbDicomFileRepository extends DicomFileRepository {

	initialize() {
		// read configuration file
		const cfg = JSON.parse(fs.readFileSync(this.config.configPath, 'utf8'));
		const constr =
			`mongodb://${cfg.username}:${cfg.password}@${cfg.host}:${cfg.port}/${cfg.database}`;
		this.db = mongoose.createConnection(constr);

		// define and register schema
		var seriesSchema = new mongoose.Schema({
			studyUID: String,
			seriesUID: String,
			storageID: Number,
			images: String
		});
		this.seriesModel = this.db.model('Series', seriesSchema, 'Series');
		var storageSchema = new mongoose.Schema({
			storageID: Number,
			path: String,
			active: Boolean
		});
		this.storageModel = this.db.model('Storages', storageSchema, 'Storages');
	}

	getSeriesLoader(seriesUID) {
		const hasher = crypto.createHash('sha256');
		hasher.update(seriesUID);
		const hash = hasher.digest('hex');
		let count = 0;

		return this.seriesModel.findOne({ seriesUID }, { images: true, storageID: true }).exec()
			.then(series => {
				if (!series) return Promise.reject(new Error('Series not found'));
				count = multirange(series.images).max();
				return this.storageModel.findOne(
					{ storageID: series.storageID, type: 'dicom', active: true }, 'path'
				).exec();
			}).then(storage => {
				if (!storage) return Promise.reject(new Error('Associated storage not found'));
				const dir = path.join(storage.path, hash.substring(0, 2), hash.substring(2, 4), seriesUID);

				// Create series loader function
				const seriesLoader = image => {
					const fileName = pad8(image) + '.dcm';
					const filePath = path.join(dir, fileName);
					return new Promise((resolve, reject) => {
						fs.readFile(filePath, (err, data) => {
							if (err) reject(err);
							resolve(data.buffer);
						});
					});
				};

				return { seriesLoader, count }
			});
	}
}

module.exports.default = CircusDbDicomFileRepository;