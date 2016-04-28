'use strict';

import { Promise } from 'es6-promise';
import axios = require('axios');

import DicomVolume from '../../common/DicomVolume';
import { ImageSource } from '../image-source';
import { PixelFormat, pixelFormatInfo } from '../../common/PixelFormat';

import RawDataLoader from './rawvolume-loader';

interface VolumeLoader {
	loadVolume: (series: string) => Promise<DicomVolume>;
}

export class RawVolumeImageSource extends ImageSource {

	private server: string;
	private series: string;
	private meta: any;
	private volume: DicomVolume;
	
	private promise: Promise<any>;
	private loader: VolumeLoader;
	private loadState: number = 0;
	private loadPromise: Promise<any>;

	constructor({ server = 'http://localhost:3000', series = null } = {}) {
		super();
		this.server = server;
		this.series = series;
		this.promise = axios.get( `${this.server}/metadata`, { params: {series} }).then(res => {
			this.meta = res.data;
		});

		this.volume = null;
		this.loadState = 0;
		this.loader = new RawDataLoader( {
			server: this.server
		} );
	}

	public load():Promise<any> {
		this.promise = this.promise.then( () => {
			if( this.loadState === 0 ){
				this.loadState = 1;
				this.loader.loadVolume( this.series ).then( ( vol )=>{
					this.volume = vol;
					this.loadState = 2;
					this.emit( 'loaded', this.volume );
				} );
			}else{
				return Promise.reject('Already loading');
			}
		} );
		return this.promise;
	}

	public draw( canvasDomElement, viewState ):Promise<any> {

		this.promise = this.promise.then( () =>{
			
			let size = [ canvasDomElement.getAttribute('width'), canvasDomElement.getAttribute('height') ];
			let u = viewState.section.xAxis.map( (i) => i / size[0] );
			let v = viewState.section.yAxis.map( (i) => i / size[1] );
			
			let imageBuffer = new Uint8Array( size[0] * size[1] );
			this.volume.scanOblique(
				viewState.section.origin,
				u,
				v,
				size as any,
				imageBuffer,
				viewState.window.width,
				viewState.window.level
			);
			
			return Promise.resolve( imageBuffer );
			
		} ).then( (buffer) => {
			
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
	public xdraw( canvasDomElement, viewState ):Promise<any> {

		this.promise = this.promise.then( () =>{
			
			let context = canvasDomElement.getContext('2d');

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

			let imageData = context.createImageData( canvasWidth, canvasHeight );
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
		} );
		return this.promise;
	}
}
