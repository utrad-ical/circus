import ViewState from '../ViewState';
import { convertSectionToIndex } from '../section-util';
import { Vector2D, Section } from '../../common/geometry';
import { ViewWindow } from '../../common/ViewWindow';
import { RsHttpClient } from '../http-client/rs-http-client';
import Viewer from '../viewer/Viewer';
import drawToImageData from './drawToImageData';
import MprImageSource from './MprImageSource';
import { DicomVolumeMetadata } from './volume-loader/DicomVolumeLoader';

/**
 * DynamicImageSource fetches the MPR image from RS server.
 */
export default class DynamicMprImageSource extends MprImageSource {
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
      )) as DicomVolumeMetadata;
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
    if (viewState.type !== 'mpr') throw new Error('Unsupported view state.');
    const section = viewState.section;
    const viewWindow = viewState.window;
    const outSize = viewer.getResolution();
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
