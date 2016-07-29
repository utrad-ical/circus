import logger from '../Logger';
import DicomDumper from './DicomDumper';
import DicomVolume  from '../../common/DicomVolume';
import { PixelFormat } from '../../common/PixelFormat';

import fs = require('fs');

import * as extractor from './DicomPixelExtractor';

/**
 * DICOM dumper implemented in pure JS.
 * It may be slow but works anywhere against most uncompressed DICOM files.
 */
export default class PureJsDicomDumper extends DicomDumper {

	protected readSingleDicomImageFile(path: string): Promise<extractor.DicomInfo> {
		return new Promise((resolve, reject) => {
			fs.readFile(path, (err, con) => {
				if (err) {
					reject(err);
					return;
				}
				let ta = new Uint8Array(con);
				let parser = new extractor.DicomPixelExtractor();
				resolve(parser.extract(ta));
			});
		});
	}

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

	public readDicom(dcmdir: string): Promise<DicomVolume> {
		let raw = new DicomVolume();
		let lastSliceLocation: number;
		let pitch: number = undefined;
		let seriesMinValue: number = null;
		let seriesMaxValue: number = null;
		raw.setEstimatedWindow(50, 75);

		return this.scanDicomCount(dcmdir).then(count => {
			let loader: Promise<any> = Promise.resolve(null);
			for (let i = 1; i <= count; i++) {
				// TODO: Remove this closure after TS1.8 release
				// https://github.com/Microsoft/TypeScript/issues/3915
				(i => {
					loader = loader.then(() => {
						// logger.debug(`reading ${i}`);
						return this.readSingleDicomImageFile(`${dcmdir}/${this.pad8(i)}.dcm`);
					}).then(result => {
						// logger.debug(`inserting ${i} with ${result.pixelData.byteLength} bytes of data`);
						if (i === 1) {
							if ('x00180088' in result.dataset.elements) {
								// [0018, 0088] Spacing between slices
								pitch = result.dataset.floatString('x00180088');
								raw.setVoxelDimension(result.pixelSpacing[0], result.pixelSpacing[1], pitch);
							}
							raw.appendHeader({
								modality: result.modality,
								rescaleSlope: result.rescale.slope,
								rescaleIntercept: result.rescale.intercept
							});
							raw.dcm_wl = result.window.level;
							raw.dcm_ww = result.window.width;
							raw.setDimension(result.columns, result.rows, count, result.pixelFormat);
						} else if (i > 1 && pitch === undefined) {
							pitch = Math.abs(lastSliceLocation - result.sliceLocation);
							raw.setVoxelDimension(result.pixelSpacing[0], result.pixelSpacing[1], pitch);
						}
						seriesMinValue = Math.min(seriesMinValue, result.minValue);
						seriesMaxValue = Math.max(seriesMinValue, result.maxValue);
						lastSliceLocation = result.sliceLocation;
						raw.insertSingleImage(i - 1, result.pixelData);
						return true;
					});
				})(i);
			}
			return loader;
		}).then(() => {
			if (raw.getHeader('modality') === 'CT') {
				let slope = raw.getHeader('rescaleSlope');
				let intercept = raw.getHeader('rescaleIntercept');
				// logger.debug(`Apply rescale: slope=${slope}, intercept=${intercept}`);
				raw.convert(PixelFormat.Int16, originalValue => {
					return originalValue * slope + intercept;
				});
				seriesMinValue = seriesMinValue * slope + intercept;
				seriesMaxValue = seriesMaxValue * slope + intercept;
			}
			// Specific to CIRCUS RS: Apply rescale only when the modality is CT
			let estimatedWidth = Math.floor(seriesMaxValue - seriesMinValue + 1);
			let estimatedLevel = Math.floor(seriesMinValue + estimatedWidth / 2);
			raw.setEstimatedWindow(estimatedLevel, estimatedWidth);
			return raw;
		});
	}
}
