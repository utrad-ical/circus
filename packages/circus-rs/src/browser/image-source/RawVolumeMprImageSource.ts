import DicomVolume from '../../common/DicomVolume';
import DicomVolumeLoader, { DicomVolumeProgressiveLoader } from './volume-loader/DicomVolumeLoader';
import ViewState from '../ViewState';
import { convertSectionToIndex } from '../section-util';
import { Section } from '../../common/geometry';
import setImmediate from '../util/setImmediate';
import Viewer from '../viewer/Viewer';
import drawToImageData from './drawToImageData';
import MprImageSource from './MprImageSource';
import { Vector3 } from 'three';
import MprImageSourceWithDicomVolume from './MprImageSourceWithDicomVolume';
import { DrawResult } from './ImageSource';

export interface RawVolumeMprImageSourceOptions {
  volumeLoader: DicomVolumeProgressiveLoader;
  // Specify the interval of updating draft image in ms.
  // If zero is specified, do not return a draft image.
  // Default value is 300 [ms]
  draftInterval?: number;
}

/**
 * RawVolumeMprImageSource holds an entire 3D volume in memory and
 * renders MPR image form the volume.
 */
export default class RawVolumeMprImageSource
  extends MprImageSource
  implements MprImageSourceWithDicomVolume {
  private volume: DicomVolume | undefined;
  private fullyLoaded: boolean = false;

  private draftInterval: number = 0;

  constructor({ volumeLoader, draftInterval }: RawVolumeMprImageSourceOptions) {
    super();

    draftInterval = draftInterval || 300;

    this.loadSequence = (async () => {
      this.draftInterval = draftInterval;
      this.metadata = await volumeLoader.loadMeta();
      volumeLoader.loadVolume().then(() => this.fullyLoaded = true);
      this.volume = volumeLoader.getVolume()!;
      if (!draftInterval) await volumeLoader.loadVolume();
    })();
  }

  public getLoadedDicomVolume() {
    return this.fullyLoaded && this.volume || undefined;
  }

  public draw(viewer: Viewer, viewState: ViewState, abortSignal: AbortSignal): Promise<DrawResult> {
    const outSize = viewer.getResolution();
    const mprOutput = new Uint8Array(outSize[0] * outSize[1]);
    const metadata = this.metadata!;
    const volume = this.volume!;

    // convert from mm-coordinate to index-coordinate
    if (viewState.type !== 'mpr') throw new Error('Unsupported view state');
    const mmSection = viewState.section;
    const viewWindow = viewState.window;

    const indexSection: Section = convertSectionToIndex(
      mmSection,
      new Vector3().fromArray(metadata.voxelSize)
    );

    volume.scanObliqueSection(
      indexSection,
      outSize,
      mprOutput,
      viewState.interpolationMode === 'trilinear',
      viewWindow.width,
      viewWindow.level
    );
    const imageData = drawToImageData(outSize, mprOutput);

    const next = async () => {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), this.draftInterval));
      return await this.draw(viewer, viewState, abortSignal);
    };

    const drawResult: DrawResult = this.fullyLoaded
      ? imageData
      : { draft: imageData, next };

    // If we use Promise.resolve directly, the then-calleback is called
    // before any stacked UI events are handled.
    // Use the polyfilled setImmediate to delay it.
    // Cf. http://stackoverflow.com/q/27647742/1209240
    return new Promise(resolve => {
      setImmediate(() => resolve(drawResult));
    });
  }
}
