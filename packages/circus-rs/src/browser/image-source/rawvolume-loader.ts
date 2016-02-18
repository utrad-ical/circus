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
			// TODO: "bytes_per_voxel" is flawed. Fix this eventually.
			let pixelFormat = meta.bytes_per_voxel === 2 ? PixelFormat.UInt16 : PixelFormat.UInt8;
			let px = pixelFormatInfo(PixelFormat.UInt16);
			volume.setDimension(meta.x, meta.y, meta.z, px.bpp);
			volume.setVoxelDimension(meta.voxel_x, meta.voxel_y, meta.voxel_z);
			volume.dcm_wl = meta.window_level_dicom;
			volume.dcm_ww = meta.window_width_dicom;
			let bytesPerSlice = meta.x * meta.y * px.bpp;
			for (let i = 0; i < meta.z; i++) {
				volume.insertSingleImage(i, buffer.slice(bytesPerSlice * i, bytesPerSlice * (i+1)));
			}
			return volume;
		}) as any as Promise<DicomVolume>;
	}
}
