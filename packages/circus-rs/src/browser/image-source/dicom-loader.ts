'use strict';

import { Promise } from 'es6-promise';
import axios = require('axios');

import { PixelFormat, pixelFormatInfo }	from '../../common/PixelFormat';
import DicomVolume						from '../../common/DicomVolume';
import { DicomMetadata }				from '../../browser/interface/dicom-metadata';

export class DicomLoader {

	private server: string;
	
	constructor( server: string = 'http://localhost:3000' ) {
		this.server = server;
	}
	
	public metadata(
		series: string
	): Promise<DicomMetadata> {
		let url = `${this.server}/metadata`;
		
		return axios.get( url, {
			params: {
				series: series
			}
		}).then( (res) => {
			return res.data;
		});
	}
	
	public scan(
		series: string,
		params: {
			origin: [number,number,number];
			u: [number,number,number];
			v: [number,number,number];
			size: [number,number];
			ww?: number;
			wl?: number;
		} = null
	): Promise<Uint8Array> {
		let url = `${this.server}/scan`;

		return axios.get( url, {
			params: {
				series: series,
				origin: params.origin.join(','),
				u: params.u.join(','),
				v: params.v.join(','),
				size: params.size.join(','),
				ww: params.ww,
				wl: params.wl
			},
			responseType: 'arraybuffer'
		} ).then( (res) => {
			return new Uint8Array( res.data );
		} );
	}
	
	public volume(
		series: string,
		meta: DicomMetadata
	): Promise<DicomVolume> {
		let url = `${this.server}/volume`;
		
		return axios.get( url, {
			params: {
				series: series
			},
			responseType: 'arraybuffer'
		} ).then( (res) => {
			let buffer: ArrayBuffer = res.data;
			let volume = new DicomVolume();
			let pixelFormat: PixelFormat = meta.pixelFormat;
			volume.setDimension(meta.voxelCount[0], meta.voxelCount[1], meta.voxelCount[2], pixelFormat);
			volume.setVoxelDimension(meta.voxelSize[0], meta.voxelSize[1], meta.voxelSize[2]);
			volume.dcm_wl = meta.dicomWindow.level;
			volume.dcm_ww = meta.dicomWindow.width;
			volume.wl = meta.estimatedWindow.level;
			volume.ww = meta.estimatedWindow.width;
			let bytesPerSlice = meta.voxelCount[0] * meta.voxelCount[1] * pixelFormatInfo(pixelFormat).bpp;
			for (let i = 0; i < meta.voxelCount[2]; i++) {
				volume.insertSingleImage(i, buffer.slice(bytesPerSlice * i, bytesPerSlice * (i+1)));
			}
			return volume;
		} ) as any as Promise<DicomVolume>;
	}
}
