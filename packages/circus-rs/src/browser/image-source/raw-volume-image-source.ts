'use strict';

import DicomVolume from '../../common/DicomVolume';
import { RsHttpLoaderImageSource } from '../../browser/image-source/rs-http-loader-image-source';

/**
 * RawVolumeImageSource holds an entire 3D volume in memory and
 * renderes MPR image form the volume.
 */
export class RawVolumeImageSource extends RsHttpLoaderImageSource {

	private volume: DicomVolume;

	protected scan(param) {
		const imageBuffer = new Uint8Array(param.size[0] * param.size[1]);
		this.volume.scanOblique(
			param.origin,
			param.u,
			param.v,
			param.size,
			imageBuffer,
			param.ww,
			param.wl
		);

		// Hack:  Use setTimeout instead of Promise.resolve
		// because the native Promise.resolve seems to to be called
		// before drag events are triggered.
		return new Promise(resolve => {
			setTimeout(() => resolve(imageBuffer), 0);
		});
		// return Promise.resolve(imageBuffer);
	}

	protected onMetaLoaded() {
		// Loads the entire volume, which can take many seconds
		return this.loader.volume(this.series, this.meta)
			.then(volume => this.volume = volume);
	}

}
