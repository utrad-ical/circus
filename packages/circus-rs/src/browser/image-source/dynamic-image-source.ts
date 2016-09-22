import { RsHttpLoaderImageSource } from '../../browser/image-source/rs-http-loader-image-source';
import { ViewState } from '../view-state';
import { convertSectionToIndex } from '../section-util';
import { Vector2D, Section } from '../../common/geometry';

/**
 * DynamicImageSource fetches the MPR image from RS server.
 */
export class DynamicImageSource extends RsHttpLoaderImageSource {
	protected scan(viewState: ViewState, outSize: Vector2D): Promise<Uint8Array> {
		// convert from mm-coordinate to index-coordinate
		const indexSection: Section = convertSectionToIndex(viewState.section, this.voxelSize());
		return this.loader.scan(
			this.series,
			indexSection,
			viewState.interpolationMode === 'trilinear',
			viewState.window,
			outSize
		);
	}
}
