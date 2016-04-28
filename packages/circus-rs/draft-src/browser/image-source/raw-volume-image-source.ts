'use strict';

import { ImageSource } from '../image-source';
import RawVolumeLoader from './rawvolume-loader';
import DicomVolume from '../../common/DicomVolume';

interface VolumeLoader {
	loadVolume: (series: string) => Promise<DicomVolume>;
}

export class RawVolumeImageSource extends ImageSource {

	private loader: VolumeLoader;
	private loadState: number = 0;
	private loadPromise: Promise<any>;
	private series: string;
	private volume: DicomVolume;

	constructor( loader: VolumeLoader ){
		super();
		this.loader = loader;
		this.loadPromise = Promise.resolve();
	}

	public setSeries( series: string ): void {
		if( this.series !== series ){
			this.series = series;
			this.volume = null;
			this.loadState = 0;
		}
	}

	public load():Promise<any> {
		var self = this;

		if( self.loadState === 0 ){
			self.loadState = 1;
			self.loadPromise = self.loader.loadVolume( self.series ).then( ( vol )=>{
				self.volume = vol;
				self.loadState = 2;
				self.emit( 'loaded', self.volume );
			} );
		}

		return self.loadPromise;
	}

	public draw( canvasDomElement, viewState ):Promise<any> {

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

	}
}
