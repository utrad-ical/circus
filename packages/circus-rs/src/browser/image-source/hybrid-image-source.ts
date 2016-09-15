import { ImageSource } from './image-source';
import { DynamicImageSource } from './dynamic-image-source';
import { RawVolumeImageSource } from './raw-volume-image-source';
import { ViewState } from '../view-state';
import { Viewer } from '../viewer/viewer';
import { VolumeImageSource } from './volume-image-source';

/**
 * HybridImageSource combines DynamicImageSource and RawVolumeImageSource.
 * It can draw MPR images as soon as DynamicImageSource is ready,
 * and then switch to RawVolumeImageSource when it is ready.
 */
export class HybridImageSource extends ImageSource {

	private dynSource: DynamicImageSource = null;
	private volSource: RawVolumeImageSource = null;
	private volumeReady: boolean = false;

	constructor(params) {
		super();
		this.volSource = new RawVolumeImageSource(params);
		this.volSource.ready().then(() => {
			this.volumeReady = true;
		});
		this.dynSource = new DynamicImageSource(params);
	}

	public draw(viewer: Viewer, viewState: ViewState): Promise<ImageData> {
		const source: VolumeImageSource = this.volumeReady ? this.volSource : this.dynSource;
		return source.draw(viewer, viewState);
	}

	public ready(): Promise<any> {
		return this.dynSource.ready();
	}

	public initialState(viewer: Viewer): ViewState {
		return this.dynSource.initialState(viewer);
	}

}
