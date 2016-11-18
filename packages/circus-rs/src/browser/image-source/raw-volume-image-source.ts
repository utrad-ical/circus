import DicomVolume from '../../common/DicomVolume';
import { PixelFormat, pixelFormatInfo } from '../../common/PixelFormat';
import { DicomMetadata } from './volume-image-source';
import { RsHttpLoaderImageSource, RsHttpLoaderOptions } from '../../browser/image-source/rs-http-loader-image-source';
import { ViewState } from '../view-state';
import { convertSectionToIndex } from '../section-util';
import { Vector2D, Section } from '../../common/geometry';
import AsyncLruCache from '../../common/AsyncLruCache';
import { RsHttpClient } from '../http-client/rs-http-client';

import setImmediate from '../util/set-immediate';

/**
 * RawVolumeImageSource holds an entire 3D volume in memory and
 * renders MPR image form the volume.
 */
export class RawVolumeImageSource extends RsHttpLoaderImageSource {

	/**
	 * Cache of DicomVolume, used to share large volume data across multiple instances.
	 */
	private static sharedCache: AsyncLruCache<DicomVolume>;

	private volume: DicomVolume;

	/**
	 * Loader function passed to the AsyncLruCache.
	 */
	private static loadVolume(series: string, meta: DicomMetadata, loader: RsHttpClient): Promise<DicomVolume> {
		return loader.request(`series/${series}/volume`, {}, 'arraybuffer')
			.then(buffer => {
				const pixelFormat: PixelFormat = meta.pixelFormat;
				const volume = new DicomVolume(meta.voxelCount, pixelFormat);
				volume.setVoxelSize(meta.voxelSize);
				volume.dcm_wl = meta.dicomWindow.level;
				volume.dcm_ww = meta.dicomWindow.width;
				volume.wl = meta.estimatedWindow.level;
				volume.ww = meta.estimatedWindow.width;
				const bytesPerSlice = meta.voxelCount[0] * meta.voxelCount[1] * pixelFormatInfo(pixelFormat).bpp;
				for (let i = 0; i < meta.voxelCount[2]; i++) {
					volume.insertSingleImage(i, buffer.slice(bytesPerSlice * i, bytesPerSlice * (i + 1)));
				}
				return volume;
			});
	}

	constructor({ client, series }: RsHttpLoaderOptions) {
		super({ client, series });
		if (!RawVolumeImageSource.sharedCache) {
			RawVolumeImageSource.sharedCache = new AsyncLruCache(RawVolumeImageSource.loadVolume);
		}
	}

	protected scan(viewState: ViewState, outSize: Vector2D): Promise<Uint8Array> {
		const imageBuffer = new Uint8Array(outSize[0] * outSize[1]);

		// convert from mm-coordinate to index-coordinate
		const mmSection = viewState.section;
		const viewWindow = viewState.window;
		if (!mmSection || !viewWindow) throw new Error('Unsupported view state');

		const indexSection: Section = convertSectionToIndex(mmSection, this.voxelSize());

		this.volume.scanObliqueSection(
			indexSection,
			outSize,
			imageBuffer,
			viewState.interpolationMode === 'trilinear',
			viewWindow.width,
			viewWindow.level
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
		return RawVolumeImageSource.sharedCache.get(this.series, this.meta, this.loader)
			.then(volume => this.volume = volume);
	}

}
