'use strict';

import { ImageSource } from '../image-source';
import MockDicomDumper from '../../server/dicom-dumpers/MockDicomDumper';
import DicomVolume from '../../common/DicomVolume';
import { PixelFormat } from '../../common/PixelFormat';

export class MockImageSource extends ImageSource {

	private volume: DicomVolume;
	private config: any;
	private promise: Promise<any>;

	constructor( config ){
		super();
		this.config = config;
		this.promise = ( new MockDicomDumper( this.config ) ).readDicom('no path').then( (vol) => {
			this.volume = vol;
		} );
	}
	
	public draw( canvasDomElement, viewState ):Promise<any> {
		
		this.promise = this.promise.then( () => {
			let context = canvasDomElement.getContext('2d');
			let size = [ canvasDomElement.getAttribute('width'), canvasDomElement.getAttribute('height') ].map( i => Math.round(i) );
			let o = viewState.section.origin;
			let u = viewState.section.xAxis.map( (i) => i / size[0] );
			let v = viewState.section.yAxis.map( (i) => i / size[1] );
			
			let imageBuffer = new Uint8Array( size[0] * size[1] );
			this.volume.scanOblique( o, u, v, [ size[0], size[1] ], imageBuffer, viewState.window.width, viewState.window.level );
			
			let imageData = context.createImageData( size[0], size[1] );
			let srcidx = 0, dstidx, pixel;
			for (let y = 0; y < size[1]; y++) {
				for (let x = 0; x < size[0]; x++) {
					pixel = imageBuffer[srcidx];
					dstidx = srcidx << 2; // meaning mul 4
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
