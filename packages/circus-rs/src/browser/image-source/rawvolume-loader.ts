import { Promise } from 'es6-promise';
import DicomVolume from '../../common/DicomVolume';
import { PixelFormat, pixelFormatInfo } from '../../common/PixelFormat';
import axios = require('axios');

export default class RawDataLoader {
	private server: string = '';

	constructor({ server = 'http://localhost:3000' } = {}) {
		this.server = server;
	}

	public loadVolume(series: string): Promise<DicomVolume> {
		let url = `${this.server}/metadata`;
		let meta;
		return axios.get(url, { params: {series} }).then(res => {
			meta = res.data;
			let url = `${this.server}/volume`;
			return axios.get(url, { params: {series}, responseType: 'arraybuffer'});
		}).then(res => {
			let buffer: ArrayBuffer = res.data;
			let volume = new DicomVolume();
			let pixelFormat: PixelFormat = meta.pixelFormat;
			volume.setDimension(meta.voxelCount[0], meta.voxelCount[1], meta.voxelCount[2], pixelFormat);
			volume.setVoxelDimension(meta.voxelSize[0], meta.voxelSize[1], meta.voxelSize[2]);
			volume.dcm_wl = meta.window_level_dicom;
			volume.dcm_ww = meta.window_width_dicom;
			let bytesPerSlice = meta.x * meta.y * pixelFormatInfo(pixelFormat).bpp;
			for (let i = 0; i < meta.z; i++) {
				volume.insertSingleImage(i, buffer.slice(bytesPerSlice * i, bytesPerSlice * (i+1)));
			}
			return volume;
		}) as any as Promise<DicomVolume>;
	}
}
