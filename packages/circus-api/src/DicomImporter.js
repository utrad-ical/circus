import * as path from 'path';
import randomstring from 'randomstring';
import fs from 'fs-extra';
import * as cp from 'child_process';
import { multirange } from 'multi-integer-range';

export function exec(command, args) {
	return new Promise((resolve, reject) => {
		cp.execFile(command, args, (err, stdout) => {
			if (err) reject(err); else resolve(stdout);
		});
	});
}

export default class DicomImporter {
	constructor(storage, models, opts = {}) {
		const { utility } = opts;
		this.models = models;
		this.storage = storage;
		this.utility = utility;
	}

	/**
	 * @param {string} file Full path for the target file
	 */
	async readDicomTagsFromFile(file) {
		if (!file) throw new TypeError('File not specified');
		const out = await exec(this.utility, ['dump', '--stdout', file]);
		return JSON.parse(out);
	}

	/**
	 * @param {Buffer} fileContent
	 */
	async readDicomTags(fileContent) {
		const tmpFile = path.join(
			__dirname, '..', 'store',
			randomstring.generate({ length: 32, charset: 'hex' }) + '.dcm'
		);
		try {
			await fs.writeFile(tmpFile, fileContent);
			return this.readDicomTagsFromFile(tmpFile);
		} finally {
			await fs.unlink(tmpFile);
		}
	}

	parseBirthDate(str) {
		const m = /^(\d\d\d\d)(\d\d)(\d\d)$/.exec(str);
		if (m) return `${m[1]}-${m[2]}-${m[3]}`;
		return undefined;
	}

	buildNewDocument(tags) {
		const doc = {
			seriesUid: tags.seriesInstanceUID,
			studyUid: tags.studyInstanceUID,
			width: parseInt(tags.width),
			height: parseInt(tags.height),
			images: tags.instanceNumber,
			seriesDate: new Date(), // TODO: Fix this!!!
			modality: tags.modality,
			seriesDescription: tags.seriesDescription,
			bodyPart: tags.bodyPart,
			stationName: tags.stationName,
			modelName: tags.modelName,
			manufacturer: tags.manufacturer,
			storageId: 0,
			patientInfo: {
				patientId: tags.patientID,
				patientName: tags.patientName,
				age: parseInt(tags.age),
				birthDate: this.parseBirthDate(tags.birthDate),
				sex: tags.sex,
				size: parseFloat(tags.size),
				weight: parseFloat(tags.weight)
			},
			parameters: {},
			domain: 'default'
		};
		return doc;
	}

	/**
	 * @param {Buffer} fileContent
	 */
	async importFromFile(file) {
		// Read the DICOM file
		const tags = await this.readDicomTagsFromFile(file);
		const fileContent = await fs.readFile(file);
		const seriesUid = tags.seriesInstanceUID;

		// Check if there is already a series with the same series UID
		const series = await this.models.series.findById(seriesUid);

		if (series) {
			// Add image number
			const mr = multirange(series.images);
			mr.append(parseInt(tags.instanceNumber));
			await this.models.series.modifyOne(
				seriesUid,
				{ images: mr.toString() }
			);
		} else {
			// Insert as a new series
			const doc = this.buildNewDocument(tags);
			await this.models.series.insert(doc);
		}

		const key = `${tags.seriesInstanceUID}/${tags.instanceNumber}`;
		await this.storage.write(key, fileContent);
	}
}