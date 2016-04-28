import DicomDumper from './DicomDumper';
import { PixelFormat } from '../../common/PixelFormat';
import DicomVolume from '../../common/DicomVolume';
import { Promise } from 'es6-promise';

/**
 * MockDicomDumper creates dummy voluem data.
 */
export default class MockDicomDumper extends DicomDumper {

	public readDicom(dcmdir: string): Promise<DicomVolume> {
		let vol = this.makeMockVol();
		if (/404/.test(dcmdir)) return Promise.reject('Not found');
		return Promise.resolve(vol);
	}

	/**
	 * Buffer data: block data in dcm_voxel_dump combined format
	 */
	public makeMockVol(): DicomVolume {
		let raw = new DicomVolume();
		let {
			width = 512, height = 512, depth = 128,
			pixelFormat = PixelFormat.Int16,
			vx = 0.5, vy = 0.5, vz = 0.5 } = this.config;
		raw.setDimension(width, height, depth, pixelFormat);
		let val: number;
		for (var z = 0; z < depth; z++) {
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					if (pixelFormat === PixelFormat.Binary) {
						val = ( Math.floor(x * 0.02)
							+ Math.floor(y * 0.02)
							+ Math.floor(z * 0.02) ) % 2;
					} else {
						val = ( Math.floor(x * 0.02)
							+ Math.floor(y * 0.02)
							+ Math.floor(z * 0.02) ) % 3 * 30;
					}
					raw.writePixelAt(val, x, y, z);
				}
			}
			raw.markSliceAsLoaded(z);
		}
		raw.setVoxelDimension(vx, vy, vz);
		raw.setEstimatedWindow(10, 100);
		return raw;
	}
}
