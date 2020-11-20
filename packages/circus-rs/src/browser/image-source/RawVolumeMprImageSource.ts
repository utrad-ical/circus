import DicomVolume from '../../common/DicomVolume';
import DicomVolumeLoader from './volume-loader/DicomVolumeLoader';
import ViewState from '../ViewState';
import { convertSectionToIndex } from '../section-util';
import { Section } from '../../common/geometry';
import setImmediate from '../util/setImmediate';
import Viewer from '../viewer/Viewer';
import drawToImageData from './drawToImageData';
import MprImageSource from './MprImageSource';
import { Vector3 } from 'three';

export interface RawVolumeMprImageSourceOptions {
  volumeLoader: DicomVolumeLoader;
}

/**
 * RawVolumeMprImageSource holds an entire 3D volume in memory and
 * renders MPR image form the volume.
 */
export default class RawVolumeMprImageSource extends MprImageSource {
  private volume: DicomVolume | undefined;

  constructor({ volumeLoader }: RawVolumeMprImageSourceOptions) {
    super();
    this.loadSequence = (async () => {
      this.metadata = await volumeLoader.loadMeta();
      this.volume = await volumeLoader.loadVolume();
    })();
  }

  public async readyEntireVolume() {
    await this.loadSequence!;
  }

  public getEntireVolume() {
    if (!this.volume) throw new Error('The entire volume is not loaded yet');
    return this.volume;
  }

  public draw(viewer: Viewer, viewState: ViewState): Promise<ImageData> {
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
    const imageData = drawToImageData(viewer, outSize, mprOutput);

    // If we use Promise.resolve directly, the then-calleback is called
    // before any stacked UI events are handled.
    // Use the polyfilled setImmediate to delay it.
    // Cf. http://stackoverflow.com/q/27647742/1209240
    return new Promise(resolve => {
      setImmediate(() => resolve(imageData));
    });
  }
}
