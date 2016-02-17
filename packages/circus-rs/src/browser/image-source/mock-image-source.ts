'use strict';

import { ImageSource } from '../image-source';
import MockDicomDumper from '../../server/dicom-dumpers/MockDicomDumper';
import DicomVolume from '../../common/DicomVolume';
import { PixelFormat } from '../../common/PixelFormat';

export class MockImageSource extends ImageSource {

	private volume: DicomVolume;
	private config: any;

	constructor( config ){
		super();
		this.config = config;
	}
	
	public ready():Promise<any> {
		var self = this;
		if( self.volume ) return Promise.resolve();
		return ( new MockDicomDumper( this.config ) ).readDicom('no path').then( (vol) => {
			self.volume = vol;
		} );
	}
	
	public draw( canvasDomElement, viewState ):Promise<any> {
		
		let self = this;
		let context = canvasDomElement.getContext('2d');
		let center = viewState.getCenter();
		
		return this.ready().then( () =>{
		
			let [ canvasWidth, canvasHeight ] = viewState.getSize();
			
			let imageBuffer = new Uint8Array( canvasWidth * canvasHeight );
			
			// console.log( '******************' );
			// console.log( viewState.getOrigin() );
			// console.log( viewState.getUnitX() );
			// console.log( viewState.getUnitY() );
			// console.log( viewState.getSize() );
			// console.log( '******************' );
			
			this.volume.scanOblique(
				viewState.getOrigin(),
				viewState.getUnitX(),
				viewState.getUnitY(),
				[ canvasWidth, canvasHeight ],
				imageBuffer /*,
				viewState.getWindowLevel(),
				viewState.getWindowWidth()*/
			);
			
			var imageData = context.createImageData( canvasWidth, canvasHeight );
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
		
	}
}
