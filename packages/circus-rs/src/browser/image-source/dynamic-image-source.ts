'use strict';

import { RsHttpLoaderImageSource } from '../../browser/image-source/rs-http-loader-image-source';

/**
 * DynamicImageSource fetches the MPR image from RS server.
 */
export class DynamicImageSource extends RsHttpLoaderImageSource {
	protected scan(param) {
		return this.loader.scan(this.series, param);
	}
}
