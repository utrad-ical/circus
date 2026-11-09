import type ViewState from '../ViewState.ts';
import { convertSectionToIndex } from '../section-util.ts';
import type { Vector2D, Section } from '../../common/geometry/index.ts';
import type { ViewWindow } from '../../common/ViewWindow.ts';
import type RsHttpClient from '../http-client/RsHttpClient.ts';
import type Viewer from '../viewer/Viewer.ts';
import drawToImageData from './drawToImageData.ts';
import MprImageSource from './MprImageSource.ts';
import type { DicomVolumeMetadata } from './volume-loader/DicomVolumeLoader.ts';
import { Vector3 } from 'three';
import type { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import type { EstimateWindowType } from './volume-loader/rs-loader-utils.ts';
import { createRequestParams } from './volume-loader/rs-loader-utils.ts';

export interface DynamicMprImageSourceOptions {
  rsHttpClient: RsHttpClient;
  seriesUid: string;
  partialVolumeDescriptor?: PartialVolumeDescriptor;
  estimateWindowType?: EstimateWindowType;
}

/**
 * DynamicImageSource fetches the MPR image from RS server.
 */
export default class DynamicMprImageSource extends MprImageSource {
  private rsHttpClient: RsHttpClient;
  private seriesUid: string;
  private partialVolumeDescriptor?: PartialVolumeDescriptor;

  constructor({
    rsHttpClient,
    seriesUid,
    partialVolumeDescriptor,
    estimateWindowType
  }: DynamicMprImageSourceOptions) {
    super();
    this.rsHttpClient = rsHttpClient;
    this.seriesUid = seriesUid;
    this.partialVolumeDescriptor = partialVolumeDescriptor;
    this.loadSequence = (async () => {
      this.metadata = (await rsHttpClient.request(
        `series/${seriesUid}/metadata`,
        createRequestParams(partialVolumeDescriptor, estimateWindowType)
      )) as DicomVolumeMetadata;
    })();
  }

  private async requestScan(
    series: string,
    section: Section,
    useInterpolation: boolean,
    window: ViewWindow,
    size: Vector2D,
    abortSignal: AbortSignal
  ): Promise<Uint8Array> {
    const res = await this.rsHttpClient.request(
      `series/${series}/scan`,
      {
        ...(this.partialVolumeDescriptor ?? {}),
        origin: section.origin.join(','),
        xAxis: section.xAxis.join(','),
        yAxis: section.yAxis.join(','),
        interpolation: useInterpolation ? '1' : '0',
        size: size.join(','),
        ww: window.width,
        wl: window.level
      },
      'arraybuffer',
      abortSignal
    );
    return new Uint8Array(res);
  }

  public async draw(
    viewer: Viewer,
    viewState: ViewState,
    abortSignal: AbortSignal
  ): Promise<ImageData> {
    // convert from mm-coordinate to index-coordinate
    if (viewState.type !== 'mpr') throw new Error('Unsupported view state.');
    const section = viewState.section;
    const viewWindow = viewState.window;
    const outSize = viewer.getResolution();
    const metadata = this.metadata!;
    const indexSection: Section = convertSectionToIndex(
      section,
      new Vector3().fromArray(metadata!.voxelSize)
    );
    const buffer = await this.requestScan(
      this.seriesUid,
      indexSection,
      viewState.interpolationMode === 'trilinear',
      viewWindow,
      outSize,
      abortSignal
    );
    return drawToImageData(outSize, buffer);
  }
}
