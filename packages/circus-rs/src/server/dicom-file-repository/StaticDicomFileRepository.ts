import DicomFileRepository, { SeriesLoader, SeriesLoaderInfo } from './DicomFileRepository';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
// import logger from '../Logger';

export default class StaticDicomFileRepository extends DicomFileRepository {

	private pad8(num: number): string {
		return ('00000000' + num).slice(-8);
	}

	/**
	 * Read the file list of the directory and count the DICOM files.
	 */
	protected scanDicomCount(path: string): Promise<number> {
		return new Promise((resolve, reject) => {
			let next = (num) => {
				fs.stat(`${path}/${this.pad8(num)}.dcm`, (err, stats) => {
					if (!err && stats.isFile()) {
						num++;
						next(num);
					} else {
						resolve(num - 1);
					}
				});
			};
			next(1);
		});
	}

	public getSeriesLoader(seriesUID: string): Promise<SeriesLoaderInfo> {

		let dir: string;
		if (this.config.useHash) {
			const hash = crypto.createHash('sha256');
			hash.update(seriesUID);
			const hashStr = hash.digest('hex');
			dir = path.join(
				this.config.dataDir,
				hashStr.substring(0, 2),
				hashStr.substring(2, 4),
				seriesUID
			);
		} else {
			dir = path.join(this.config.dataDir, seriesUID);
		}

		return this.scanDicomCount(dir).then(count => {
			const seriesLoader: SeriesLoader = (image: number) => {
				const fileName = this.pad8(image) + '.dcm';
				const filePath = path.join(dir, fileName);

				return new Promise<ArrayBuffer>((resolve, reject) => {
					fs.readFile(filePath, (err, data: Buffer) => {
						if (err) reject(err);
						resolve(data.buffer);
					});
				});

			};
			return { seriesLoader, count };
		});


	}
}
