import { VolumeImageSource } from './volume-image-source';
import { RsHttpClient } from '../http-client/rs-http-client';

export type RsHttpLoaderOptions = {
	client: RsHttpClient,
	series: string
};

/**
 * RsHttpLoaderImageSource is a base class of ImageSource classes which
 * need access to the CIRCUS RS server to render volume-based images.
 * It fetches the scanned MPR data either from the RS server via HTTP or from the loaded volume,
 * and then draws the scanned MPR image onto the specified canvas.
 */
export abstract class RsHttpLoaderImageSource extends VolumeImageSource {

	protected loader: RsHttpClient;
	protected series: string;
	protected prepareLoader: Promise<void>;

	constructor(options: RsHttpLoaderOptions) {
		super();
		const { client, series } = options;
		if (!(client instanceof RsHttpClient)) throw new TypeError('RsHttpClient not set');
		if (typeof series !== 'string') throw new TypeError('Series not specified');
		this.loader = client;
		this.series = series;
		this.prepareLoader = this.prepare();
	}

	public ready(): Promise<void> {
		return this.prepareLoader;
	}

	/**
	 * Does the actual preparation.
	 * It determines the initial view state.
	 */
	public prepare(): Promise<void> {
		if (!this.series) return Promise.reject('Series is required');
		return this.loader.request(`series/${this.series}/metadata`, {})
			.then(meta => {
				this.meta = meta;
				return this.onMetaLoaded();
			});
	}

	/**
	 * Subclasses can do additional initialization/loading by this.
	 * this.meta is guaranteed to be non-null inside this.
	 */
	protected onMetaLoaded(): Promise<any> {
		return Promise.resolve();
	}

}
