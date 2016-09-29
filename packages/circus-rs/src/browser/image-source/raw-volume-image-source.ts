import DicomVolume from '../../common/DicomVolume';
import { RsHttpLoaderImageSource } from '../../browser/image-source/rs-http-loader-image-source';
import { ViewState } from '../view-state';
import { convertSectionToIndex } from '../section-util';
import { Vector2D, Section } from '../../common/geometry';

import setImmediate from '../util/set-immediate';

/**
 * RawVolumeImageSource holds an entire 3D volume in memory and
 * renders MPR image form the volume.
 */
export class RawVolumeImageSource extends RsHttpLoaderImageSource {

	private volume: DicomVolume;

	protected scan(viewState: ViewState, outSize: Vector2D): Promise<Uint8Array> {
		const imageBuffer = new Uint8Array(outSize[0] * outSize[1]);

		// convert from mm-coordinate to index-coordinate
		const mmSection = viewState.section;
		const indexSection: Section = convertSectionToIndex(mmSection, this.voxelSize());

		this.volume.scanObliqueSection(
			indexSection,
			outSize,
			imageBuffer,
			viewState.interpolationMode === 'trilinear',
			viewState.window.width,
			viewState.window.level
		);

		// If we use Promise.resolve directly, the then-calleback is called
		// before any stacked UI events are handled.
		// Use the polyfilled setImmediate to delay it.
		// Cf. http://stackoverflow.com/q/27647742/1209240
		return new Promise(resolve => {
			setImmediate(() => resolve(imageBuffer));
		});
		// return Promise.resolve(imageBuffer);
	}

	protected onMetaLoaded(): Promise<void> {
		// Loads the entire volume, which can take many seconds
		return this.loader.volume(this.series, this.meta)
			.then(volume => this.volume = volume);
	}

}
