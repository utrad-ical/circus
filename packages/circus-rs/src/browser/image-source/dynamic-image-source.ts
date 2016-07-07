'use strict';

import { Promise } from 'es6-promise';

import { DicomLoaderImageSource } from '../../browser/image-source/dicom-loader-image-source';

/**
 * DynamicImageSource fetches the MPR image from RS server.
 */
export class DynamicImageSource extends DicomLoaderImageSource {

	protected prepare() {
		this.scan = (series, param) => this.loader.scan(this.series, param);

		return new Promise((resolve, reject) => {
			this.loader.metadata(this.series)
				.then((meta) => {
					this.meta = meta;
					resolve();
				}).catch((e) => {
				reject(e);
			});
		});
	}
}
