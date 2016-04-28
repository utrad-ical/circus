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
			this.meta = res.data;
			this.emit('loaded');
		});
	}
	
	public then ( f ){
		this.promise = this.promise.then(f);
		return this.promise;
	}

	public draw( canvasDomElement, viewState ):Promise<any> {
		
		this.promise = this.promise.then( () => {
			
			let size = [ canvasDomElement.getAttribute('width'), canvasDomElement.getAttribute('height') ];
			let u = viewState.section.xAxis.map( (i) => i / size[0] );
			let v = viewState.section.yAxis.map( (i) => i / size[1] );
			
			return axios.get( `${this.server}/scan`, {
				params: {
					series: this.series,
					origin: viewState.section.origin.join(','),
					u: u.join(','),
					v: v.join(','),
					size: size.join(','),
					ww: viewState.window.width,
					wl: viewState.window.level
				},
				responseType: 'arraybuffer'
			} );
		} ).then( (res) => {
			return new Uint8Array( res.data );
		} ).then( ( buffer ) => {
			
			let context = canvasDomElement.getContext('2d');
			let size = [ canvasDomElement.getAttribute('width'), canvasDomElement.getAttribute('height') ].map( i => Math.round(i) );
			
			let pixelFormat: PixelFormat = this.meta.pixelFormat;
			let imageData = context.createImageData( size[0], size[1] );
			
			let srcidx = 0, pixel, dstidx;
			for (var y = 0; y < size[1]; y++) {
				for (var x = 0; x < size[0]; x++) {
					pixel = buffer[srcidx];
					dstidx = srcidx << 2; // meaning multiply 4
					imageData.data[dstidx] = pixel;
					imageData.data[dstidx + 1] = pixel;
					imageData.data[dstidx + 2] = pixel;
					imageData.data[dstidx + 3] = 0xff;
					srcidx++;
				}
			}
			context.putImageData( imageData, 0, 0 );
		} );
		return this.promise;
	}
}
