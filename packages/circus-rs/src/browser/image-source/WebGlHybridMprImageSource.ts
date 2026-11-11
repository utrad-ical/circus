import type { DynamicMprImageSourceOptions } from './DynamicMprImageSource.ts';
import DynamicMprImageSource from './DynamicMprImageSource.ts';
import type { WebGlRawVolumeMprImageSourceOptions } from './WebGlRawVolumeMprImageSource.ts';
import WebGlRawVolumeMprImageSource from './WebGlRawVolumeMprImageSource.ts';
import type ViewState from '../ViewState.ts';
import type Viewer from '../viewer/Viewer.ts';
import MprImageSource from './MprImageSource.ts';
import type MprImageSourceWithDicomVolume from './MprImageSourceWithDicomVolume.ts';
import type { DrawResult } from './ImageSource.ts';

interface WebGlHybridImageSourceOptions
  extends WebGlRawVolumeMprImageSourceOptions, DynamicMprImageSourceOptions {}

/**
 * WebGlHybridMprImageSource combines DynamicMprImageSource and WebGlRawVolumeMprImageSource.
 * It can draw MPR images as soon as the former gets ready,
 * and then switch to WebGlRawVolumeMprImageSource when it is ready.
 */
export default class WebGlHybridMprImageSource
  extends MprImageSource
  implements MprImageSourceWithDicomVolume
{
  private dynSource: DynamicMprImageSource;
  private volSource: WebGlRawVolumeMprImageSource;
  private volumeReady: boolean = false;

  constructor(imageSourceOptions: WebGlHybridImageSourceOptions) {
    super();
    this.volSource = new WebGlRawVolumeMprImageSource(imageSourceOptions);
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
