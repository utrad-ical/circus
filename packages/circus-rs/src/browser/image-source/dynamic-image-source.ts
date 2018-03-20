import { ViewState } from '../view-state';
import { convertSectionToIndex } from '../section-util';
import { Vector2D, Section } from '../../common/geometry';
import { ViewWindow } from '../../common/ViewWindow';
import { ImageSource } from './image-source';
import { RsHttpClient } from '../http-client/rs-http-client';
import { Viewer } from '../viewer/viewer';
import drawToImageData from './drawToImageData';
import { VolumeImageSource, DicomMetadata } from './volume-image-source';

/**
 * DynamicImageSource fetches the MPR image from RS server.
 */
export class DynamicImageSource extends VolumeImageSource {
  private rsClient: RsHttpClient;
  private series: string;

  constructor({
    rsHttpClient,
    series
  }: {
    rsHttpClient: RsHttpClient;
    series: string;
  }) {
    super();
    this.rsClient = rsHttpClient;
    this.series = series;
    this.loadSequence = (async () => {
      this.metadata = (await rsHttpClient.request(
        `series/${series}/metadata`,
        {}
      )) as DicomMetadata;
    })();
  }

  private async requestScan(
    series: string,
    section: Section,
    useInterpolation: boolean,
    window: ViewWindow,
    size: Vector2D
  ): Promise<Uint8Array> {
    const res = await this.rsClient.request(
      `series/${series}/scan`,
      {
        origin: section.origin.join(','),
        xAxis: section.xAxis.join(','),
        yAxis: section.yAxis.join(','),
        interpolation: useInterpolation ? '1' : '0',
        size: size.join(','),
        ww: window.width,
        wl: window.level
      },
      'arraybuffer'
    );
    return new Uint8Array(res);
  }

  public async draw(viewer: Viewer, viewState: ViewState): Promise<ImageData> {
    // convert from mm-coordinate to index-coordinate
    const section = viewState.section;
    const viewWindow = viewState.window;
    const outSize = viewer.getResolution();
    if (!section || !viewWindow) throw new Error('Unsupported view state.');
    const indexSection: Section = convertSectionToIndex(
      section,
      this.metadata.voxelSize
    );
    const buffer = await this.requestScan(
      this.series,
      indexSection,
      viewState.interpolationMode === 'trilinear',
      viewWindow,
      outSize
    );
    return drawToImageData(viewer, buffer);
  }
}
