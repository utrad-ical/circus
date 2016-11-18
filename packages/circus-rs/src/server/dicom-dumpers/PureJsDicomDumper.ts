import DicomDumper from './DicomDumper';
import DicomVolume  from '../../common/DicomVolume';
import { PixelFormat } from '../../common/PixelFormat';

import * as extractor from './DicomPixelExtractor';
import { SeriesLoaderInfo, SeriesLoader } from '../dicom-file-repository/DicomFileRepository';

/**
 * DICOM dumper implemented in pure JS.
 * It may be slow but works anywhere against most uncompressed DICOM files.
 */
export default class PureJsDicomDumper extends DicomDumper {

	protected readSingleDicomImageFile(seriesLoader: SeriesLoader, image: number): Promise<extractor.DicomInfo> {
		return seriesLoader(image).then(buffer => {
			let ta = new Uint8Array(buffer);
			let parser = new extractor.DicomPixelExtractor();
			return parser.extract(ta);
		});
	}

	public readDicom(seriesLoaderInfo: SeriesLoaderInfo): Promise<DicomVolume> {
		let raw: DicomVolume;
		let lastSliceLocation: number;
		let pitch: number | undefined = undefined;
		let seriesMinValue: number = Infinity;
		let seriesMaxValue: number = -Infinity;

		const { count, seriesLoader } = seriesLoaderInfo;

		return Promise.resolve().then(() => {
			let loader: Promise<any> = Promise.resolve(null);
			for (let i = 1; i <= count; i++) {
				loader = loader.then(() => {
					// logger.debug(`reading ${i}`);
					return this.readSingleDicomImageFile(seriesLoader, i);
				}).then(result => {
					// logger.debug(`inserting ${i} with ${result.pixelData.byteLength} bytes of data`);
					if (i === 1) {
						if ('x00180088' in result.dataset.elements) {
							// [0018, 0088] Spacing between slices
							pitch = result.dataset.floatString('x00180088');
							raw.setVoxelSize([result.pixelSpacing[0], result.pixelSpacing[1], pitch]);
						}
						raw.appendHeader({
							modality: result.modality,
							rescaleSlope: result.rescale.slope,
							rescaleIntercept: result.rescale.intercept
						});
						if (result.window !== null) {
							raw.dcm_wl = result.window.level;
							raw.dcm_ww = result.window.width;
						}
						raw = new DicomVolume([result.columns, result.rows, count], result.pixelFormat);
						raw.setEstimatedWindow(50, 75);
					} else if (i > 1 && pitch === undefined) {
						pitch = Math.abs(lastSliceLocation - result.sliceLocation);
						raw.setVoxelSize([result.pixelSpacing[0], result.pixelSpacing[1], pitch]);
					}
					seriesMinValue = Math.min(seriesMinValue, result.minValue);
					seriesMaxValue = Math.max(seriesMinValue, result.maxValue);
					lastSliceLocation = result.sliceLocation;
					raw.insertSingleImage(i - 1, result.pixelData);
					return true;
				});
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
