'use strict';

import { Promise }	from 'es6-promise';

import DicomVolume					from '../../common/DicomVolume';
import { DicomLoaderImageSource }	from '../../browser/image-source/dicom-loader-image-source';

export class HybridImageSource extends DicomLoaderImageSource {

	private volume: DicomVolume;

	protected prepare(){
		this.scan = ( series, param ) => this.loader.scan( this.series, param );
		
		return new Promise( ( resolve, reject ) => {
			this.loader.metadata( this.series )
				.then( ( meta ) => {
					this.meta = meta;
					resolve();
					
					return this.loader.volume( this.series, this.meta ).then( ( volume: DicomVolume ) => {
						this.volume = volume;
						this.scan = ( series, param ) => {
						
							let imageBuffer = new Uint8Array( param.size[0] * param.size[1] );
							this.volume.scanOblique(
								param.origin,
								param.u,
								param.v,
								param.size,
								imageBuffer,
								param.ww,
								param.wl
							);
							
							return Promise.resolve( imageBuffer );
						};
					} );
					
				} ).catch( ( e ) => {
					reject(e);
				} )
		} );		
	}
	
}
