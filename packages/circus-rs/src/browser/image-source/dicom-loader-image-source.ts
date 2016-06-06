'use strict';

import { Promise } from 'es6-promise';
import axios = require('axios');

import { DicomMetadata }				from '../../browser/interface/dicom-metadata';
import { ImageSource }					from '../../browser/image-source/image-source';
import { DicomLoader }					from '../../browser/image-source/dicom-loader';

export abstract class DicomLoaderImageSource extends ImageSource {

	protected loader: DicomLoader;
	protected series: string;
	protected meta: DicomMetadata;
	
	protected readyPromise: Promise<any>;
	protected scan: ( string, any ) => Promise<Uint8Array>;
	
	protected abstract prepare(): Promise<any>;
	 // 		this.scan = ( series, param ) => this.loader.scan( this.series, param );

	
	constructor({ server = 'http://localhost:3000', series = null } = {}) {
		super();
		
		this.loader = new DicomLoader( server );
		this.series = series;
		
		if( series === null ){
			this.readyPromise = Promise.reject('parameter series is required');
		}else{
			this.readyPromise = this.prepare();
		}
	}
	
	public ready(){
		return this.readyPromise;
	}
	
	public draw( canvasDomElement, viewState ):Promise<any> {
	
		let context = canvasDomElement.getContext('2d');
		let vpWidth = Number( canvasDomElement.getAttribute('width') );
		let vpHeight = Number( canvasDomElement.getAttribute('height') );
		let section = viewState.section;
		
		return this.ready().then( () => {
			
			let win = viewState.window || this.meta.estimatedWindow;
			
			let scanParam = {
				origin: section.origin as [ number, number, number ],
				u: section.xAxis.map( i => i / vpWidth ) as [ number, number, number ],
				v: section.yAxis.map( i => i / vpHeight ) as [ number, number, number ],
				size: [ vpWidth, vpHeight ] as [ number, number ],
				ww: Number( win.width ),
				wl: Number( win.level )
			};
			
			return this.scan( this.series, scanParam );
			
		} ).then( ( buffer: Uint8Array ) => {
			
			let imageData = context.createImageData( vpWidth, vpHeight );
			
			let srcidx = 0, pixel, dstidx;
			for (var y = 0; y < vpHeight; y++) {
				for (var x = 0; x < vpWidth; x++) {
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
	}
	
	// public estimateWindow(){
		// return {
			// level: this.meta.estimatedWindow.level,
			// width: this.meta.estimatedWindow.width
		// };
	// }
	// public dicomWindow(){
		// return {
			// level: this.meta.dicomWindow.level,
			// width: this.meta.dicomWindow.width
		// };
	// }

	// public voxelSize(): Vector3D {
		// return this.meta.voxelSize;
	// }
	
	// public voxelCount(): Vector3D {
		// return this.meta.voxelCount;
	// }
	
	public getDimension(): [ number, number ,number ] {
		return this.meta.voxelCount;
	}
}
