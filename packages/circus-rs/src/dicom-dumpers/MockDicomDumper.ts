import logger from './../Logger';

import DicomDumper from './DicomDumper';
import { default as RawData, PixelFormat } from './../RawData';
import DicomVolume from './../DicomVolume';
import * as Promise from 'bluebird';

/**
 * MockDicomDumper creates dummy voluem data.
 */
export default class MockDicomDumper extends DicomDumper {

	public readDicom(dcmdir: string): Promise<DicomVolume> {
		let vol = this.makeMockVol();
		return Promise.resolve(vol);
	}

	/**
	 * Buffer data: block data in dcm_voxel_dump combined format
	 */
	public makeMockVol(): DicomVolume {
		let raw = new DicomVolume();
		raw.appendHeader({
			Dummy: 'Header'
		});
		let d = ('d' in this.config) ? this.config.d : 128;
		raw.setDimension(512, 512, d, PixelFormat.Int16);
		for (var z = 0; z < d; z++) {
			let sliceData = new Int16Array(512 * 512);
			for (let x = 0; x < 512; x++) {
				for (let y = 0; y < 512; y++) {
					let val = ( Math.floor(x * 0.02)
						+ Math.floor(y * 0.02)
						+ Math.floor(z * 0.02) ) % 3 * 30;
					sliceData[x + y * 512] = val;
				}
			}
			raw.insertSingleImage(z, sliceData.buffer);
		}
		raw.setVoxelDimension(0.5, 0.5, 0.5);
		raw.setEstimatedWindow(10, 100);
		return raw;
	}
}
