import type { DynamicMprImageSourceOptions } from './DynamicMprImageSource.ts';
import DynamicMprImageSource from './DynamicMprImageSource.ts';
import type { RawVolumeMprImageSourceOptions } from './RawVolumeMprImageSource.ts';
import RawVolumeMprImageSource from './RawVolumeMprImageSource.ts';
import type ViewState from '../ViewState.ts';
import type Viewer from '../viewer/Viewer.ts';
import MprImageSource from './MprImageSource.ts';
import type MprImageSourceWithDicomVolume from './MprImageSourceWithDicomVolume.ts';
import type { DrawResult } from './ImageSource.ts';

interface HybridImageSourceOptions
  extends RawVolumeMprImageSourceOptions, DynamicMprImageSourceOptions {}

/**
 * HybridImageSource combines DynamicMprImageSource and RawVolumeMprImageSource.
 * It can draw MPR images as soon as the former gets ready,
 * and then switch to RawVolumeMprImageSource when it is ready.
 */
export default class HybridMprImageSource
  extends MprImageSource
  implements MprImageSourceWithDicomVolume
{
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

  public getLoadedDicomVolume() {
    return this.volSource.getLoadedDicomVolume();
  }

  public draw(
    viewer: Viewer,
    viewState: ViewState,
    abortSignal: AbortSignal
  ): Promise<DrawResult> {
    const source: MprImageSource = this.volumeReady
      ? this.volSource
      : this.dynSource;
    return source.draw(viewer, viewState, abortSignal);
  }

  public ready(): Promise<any> {
    return this.dynSource.ready();
  }

  public initialState(viewer: Viewer): ViewState {
    return this.dynSource.initialState(viewer);
  }
}
