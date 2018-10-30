import DynamicMprImageSource from './DynamicMprImageSource';
import RawVolumeMprImageSource from './RawVolumeMprImageSource';
import ViewState from '../ViewState';
import Viewer from '../viewer/Viewer';
import DicomVolumeLoader from './volume-loader/DicomVolumeLoader';
import RsHttpClient from '../http-client/RsHttpClient';
import MprImageSource from './MprImageSource';
import PartialVolumeDescriptor from '../../common/PartialVolumeDescriptor';

interface HybridImageSourceOptions {
  volumeLoader: DicomVolumeLoader;
  rsHttpClient: RsHttpClient;
  seriesUid: string;
  partialVolumeDescriptor?: PartialVolumeDescriptor;
}

/**
 * HybridImageSource combines DynamicMprImageSource and RawVolumeMprImageSource.
 * It can draw MPR images as soon as the former gets ready,
 * and then switch to RawVolumeMprImageSource when it is ready.
 */
export default class HybridMprImageSource extends MprImageSource {
  private dynSource: DynamicMprImageSource;
  private volSource: RawVolumeMprImageSource;
  private volumeReady: boolean = false;

  constructor(imageSourceOptions: HybridImageSourceOptions) {
    super();
    this.volSource = new RawVolumeMprImageSource(imageSourceOptions);
    this.volSource.ready().then(() => {
      this.volumeReady = true;
    });
    this.dynSource = new DynamicMprImageSource(imageSourceOptions);
    this.dynSource.ready().then(() => {
      this.metadata = this.dynSource.metadata;
    });
  }

  public draw(viewer: Viewer, viewState: ViewState): Promise<ImageData> {
    const source: MprImageSource = this.volumeReady
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
