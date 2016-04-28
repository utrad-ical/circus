'use strict';

import { Promise } from 'es6-promise';
import axios = require('axios');

import DicomVolume from '../../common/DicomVolume';
import { ImageSource } from '../image-source';
import { PixelFormat, pixelFormatInfo } from '../../common/PixelFormat';

export class DynamicImageSource extends ImageSource {

	private server: string;
	private series: string;
	private promise: Promise<any>;
	private meta: any;

	constructor({ server = 'http://localhost:3000', series = null } = {}) {
		super();
		this.server = server;
		this.series = series;
		
		this.promise = axios.get( `${this.server}/metadata`, { params: {series} }).then(res => {
			console.log( res );
			this.meta = res.data;
		});
	}
	
	public then ( f ){
		return this.promise.then(f);
	}

	public draw( canvasDomElement, viewState ):Promise<any> {
		
		this.promise = this.promise.then( () => {
			
			let size = [ canvasDomElement.getAttribute('width'), canvasDomElement.getAttribute('height') ];
			let u = viewState.section.xAxis.map( (i) => i / size[0] );
			let v = viewState.section.yAxis.map( (i) => i / size[1] );
			
			return axios.get( `${this.server}/oblique`, {
				params: {
					series: this.series,
					origin: viewState.section.origin,
					u: u,
					v: v,
					ww: viewState.window.width,
					wl: viewState.window.level
				},
				responseType: 'arraybuffer'
			} );
		} ).then( (res) =>{
			
			console.log( res );
			/*
			let buffer: ArrayBuffer = res.data;
			let pixelFormat: PixelFormat = this.meta.pixelFormat;
			
			let imageData = context.createImageData( canvasWidth, s );
			for (var y = 0; y < canvasHeight; y++) {
				for (var x = 0; x < canvasWidth; x++) {
					var srcidx = (canvasWidth * y + x);
					var pixel = imageBuffer[srcidx];
					var dstidx = srcidx << 2; // meaning mul 4
					imageData.data[dstidx] = pixel;
					imageData.data[dstidx + 1] = pixel;
					imageData.data[dstidx + 2] = pixel;
					imageData.data[dstidx + 3] = 0xff;
				}
			}
			context.putImageData( imageData, 0, 0 );
			
			*/
		} );
		
		return this.promise;
		/*
			let volume = new DicomVolume();
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
		
		

		let context = canvasDomElement.getContext('2d');
		return this.load().then( () =>{

			let [ canvasWidth, canvasHeight ] = viewState.getSize();

			let origin = viewState.getOrigin().map( i=>Math.floor(i) );
			let imageBuffer = new Uint8Array( canvasWidth * canvasHeight );
			
			this.volume.scanOblique(
				origin,
				viewState.getUnitX(),
				viewState.getUnitY(),
				[ canvasWidth, canvasHeight ],
				imageBuffer,
				viewState.getWindowWidth(),
				viewState.getWindowLevel()
			);

		} );
		*/

	}
}
