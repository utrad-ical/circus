import DicomVolume from '../../common/DicomVolume';
import { PixelFormat, pixelFormatInfo } from '../../common/PixelFormat';
import { DicomMetadata } from '../../browser/interface/dicom-metadata';
import { VolumeImageSource } from '../../browser/image-source/volume-image-source';
import { ViewState } from '../view-state';
import { Viewer } from '../viewer/viewer';


export class MockImageSource extends VolumeImageSource {

	private volume: DicomVolume;

	constructor(meta: DicomMetadata) {
		super();
		this.meta = meta;
		this.meta.estimatedWindow = { level: 10, width: 100 };
		this.meta.dicomWindow = { level: 10, width: 100 };
		this.meta.voxelSize = meta.voxelSize || [0.5, 0.5, 0.5];
		this.meta.voxelCount = meta.voxelCount || [512, 512, 478];
		this.volume = this.createMockVolume(meta);
	}

	/**
	 * Prepares checkerboard volume image
	 */
	private createMockVolume(meta: DicomMetadata): DicomVolume {

		const [ width, height, depth ] = meta.voxelCount;
		const [ vx, vy, vz ] = meta.voxelSize;
		const pixelFormat = PixelFormat.Int16;
		const [ wl, ww ] = [meta.estimatedWindow.level, meta.estimatedWindow.width];

		const raw = new DicomVolume();
		raw.setDimension(width, height, depth, pixelFormat);

		const createValue = (x, y, z) => {
			let val: number;

			if (pixelFormat === PixelFormat.Binary) {
				val = ( Math.floor(x * 0.02)
					+ Math.floor(y * 0.02)
					+ Math.floor(z * 0.02) ) % 2;
			} else {
				val = ( Math.floor(x * 0.02)
					+ Math.floor(y * 0.02)
					+ Math.floor(z * 0.02) ) % 3 * 30;
			}

			return val;
		};

		for (let z = 0; z < depth; z++) {
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					raw.writePixelAt(createValue(x, y, z), x, y, z);
				}
			}
			raw.markSliceAsLoaded(z);
		}
		raw.setVoxelDimension(vx, vy, vz);
		raw.setEstimatedWindow(wl, ww);
		return raw;
	}

	protected scan(param) {
		const imageBuffer = new Uint8Array(param.size[0] * param.size[1]);
		this.volume.scanOblique(
			param.origin,
			param.u,
			param.v,
			param.size,
			imageBuffer,
			param.ww,
			param.wl
		);
		// Hack:  Use setTimeout instead of Promise.resolve
		// because the native Promise.resolve seems to to be called
		// before drag events are triggered.
		return new Promise(resolve => {
			setTimeout(() => resolve(imageBuffer), 0);
		});
	}
}
