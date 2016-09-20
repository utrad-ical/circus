import DicomVolume from '../../common/DicomVolume';
import { RsHttpLoaderImageSource } from '../../browser/image-source/rs-http-loader-image-source';
import { ViewWindow } from '../view-state';
import { Vector2D, Section } from '../../common/geometry';

/**
 * RawVolumeImageSource holds an entire 3D volume in memory and
 * renders MPR image form the volume.
 */
export class RawVolumeImageSource extends RsHttpLoaderImageSource {

	private volume: DicomVolume;

	protected scan(section: Section, window: ViewWindow, outSize: Vector2D): Promise<Uint8Array> {
		const imageBuffer = new Uint8Array(outSize[0] * outSize[1]);
		this.volume.scanObliqueSection(
			section,
			outSize,
			imageBuffer,
			window.width,
			window.level
		);

		// Hack: Use setTimeout instead of Promise.resolve
		// because the native Promise.resolve seems to to be called
		// before drag events are triggered.
		return new Promise(resolve => {
			setTimeout(() => resolve(imageBuffer), 0);
		});
		// return Promise.resolve(imageBuffer);
	}

	protected onMetaLoaded(): Promise<void> {
		// Loads the entire volume, which can take many seconds
		return this.loader.volume(this.series, this.meta)
			.then(volume => this.volume = volume);
	}

}
