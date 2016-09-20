import { RsHttpLoaderImageSource } from '../../browser/image-source/rs-http-loader-image-source';
import { Section } from '../../common/geometry/Section';
import { ViewWindow } from '../view-state';
import { Vector2D } from '../../common/geometry/Vector';

/**
 * DynamicImageSource fetches the MPR image from RS server.
 */
export class DynamicImageSource extends RsHttpLoaderImageSource {
	protected scan(section: Section, window: ViewWindow, outSize: Vector2D): Promise<Uint8Array> {
		return this.loader.scan(this.series, section, window, outSize);
	}
}
