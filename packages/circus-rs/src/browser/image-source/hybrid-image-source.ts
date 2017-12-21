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
export class HybridImageSource extends VolumeImageSource {
  private dynSource: DynamicImageSource;
  private volSource: RawVolumeImageSource;
  private volumeReady: boolean = false;

  public scan(param): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array(0)); // never called
  }

  constructor(params) {
    super();
    this.volSource = new RawVolumeImageSource(params);
    this.volSource.ready().then(() => {
      this.volumeReady = true;
    });
    this.dynSource = new DynamicImageSource(params);
    this.dynSource.ready().then(() => {
      this.meta = this.dynSource.meta;
    });
  }

  public draw(viewer: Viewer, viewState: ViewState): Promise<ImageData> {
    const source: VolumeImageSource = this.volumeReady
      ? this.volSource
      : this.dynSource;
    return source.draw(viewer, viewState);
  }

  public ready(): Promise<any> {
    return this.dynSource.ready();
  }

  public initialState(viewer: Viewer): ViewState {
    return this.dynSource.initialState(viewer);
  }
}
