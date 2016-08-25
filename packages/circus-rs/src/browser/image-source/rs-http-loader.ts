import axios = require('axios');

import { PixelFormat, pixelFormatInfo } from '../../common/PixelFormat';
import DicomVolume  from '../../common/DicomVolume';
import { DicomMetadata } from '../../browser/interface/dicom-metadata';

/**
 * Simple HTTP wrapper that connects to the CIRCUS RS server and returns the response
 * in the appropriate format.
 */
export class RsHttpLoader {

	private server: string;

	constructor(server: string = 'http://localhost:3000') {
		this.server = server;
	}

	public request(command: string, params: any, responseType: string = 'json'): Promise<any> {
		const url = `${this.server}/${command}`;
		return axios.get(url, { params, responseType }).then(res => res.data) as any as Promise<any>;
	}

	public metadata(series: string): Promise<DicomMetadata> {
		return this.request('metadata', { series });
	}

	public scan(series: string,
		params: {
			origin: [number, number, number];
			u: [number, number, number];
			v: [number, number, number];
			size: [number, number];
			ww?: number;
			wl?: number;
		} = null
	): Promise<Uint8Array> {
		return this.request(
			'scan',
			{
				series: series,
				origin: params.origin.join(','),
				u: params.u.join(','),
				v: params.v.join(','),
				size: params.size.join(','),
				ww: params.ww,
				wl: params.wl
			},
			'arraybuffer'
		).then(res => new Uint8Array(res));
	}

	public volume(series: string, meta: DicomMetadata): Promise<DicomVolume> {
		return this.request('volume', { series }, 'arraybuffer')
			.then(buffer => {
				const volume = new DicomVolume();
				const pixelFormat: PixelFormat = meta.pixelFormat;
				volume.setDimension(meta.voxelCount[0], meta.voxelCount[1], meta.voxelCount[2], pixelFormat);
				volume.setVoxelDimension(meta.voxelSize[0], meta.voxelSize[1], meta.voxelSize[2]);
				volume.dcm_wl = meta.dicomWindow.level;
				volume.dcm_ww = meta.dicomWindow.width;
				volume.wl = meta.estimatedWindow.level;
				volume.ww = meta.estimatedWindow.width;
				const bytesPerSlice = meta.voxelCount[0] * meta.voxelCount[1] * pixelFormatInfo(pixelFormat).bpp;
				for (let i = 0; i < meta.voxelCount[2]; i++) {
					volume.insertSingleImage(i, buffer.slice(bytesPerSlice * i, bytesPerSlice * (i + 1)));
				}
				return volume;
			});
	}
}
