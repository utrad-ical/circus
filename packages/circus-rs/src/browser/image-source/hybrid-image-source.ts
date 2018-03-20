import { DynamicImageSource } from './dynamic-image-source';
import { RawVolumeImageSource } from './raw-volume-image-source';
import { ViewState } from '../view-state';
import { Viewer } from '../viewer/viewer';
import DicomVolumeLoader from './volume-loader/DicomVolumeLoader';
import { RsHttpClient } from '../http-client/rs-http-client';
import { VolumeImageSource, DicomMetadata } from './volume-image-source';

interface HybridImageSourceParams {
  volumeLoader: DicomVolumeLoader;
  rsHttpClient: RsHttpClient;
  series: string;
}

/**
 * HybridImageSource combines DynamicImageSource and RawVolumeImageSource.
 * It can draw MPR images as soon as DynamicImageSource is ready,
 * and then switch to RawVolumeImageSource when it is ready.
 */
export class HybridImageSource extends VolumeImageSource {
  private dynSource: DynamicImageSource;
  private volSource: RawVolumeImageSource;
  private volumeReady: boolean = false;

  constructor(params: HybridImageSourceParams) {
    super();
    this.volSource = new RawVolumeImageSource(params);
    this.volSource.ready().then(() => {
      this.volumeReady = true;
    });
    this.dynSource = new DynamicImageSource(params);
    this.dynSource.ready().then(() => {
      this.metadata = this.dynSource.metadata;
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
