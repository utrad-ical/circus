import { PluginJobRequest, PluginDefinition, JobSeries } from '../interface';
import { QueueSystem } from '../queue/queue';
import { DicomFileRepository } from '@utrad-ical/circus-dicom-repository';
import MultiRange from 'multi-integer-range';

function checkSeriesImageRange(
  imagesInSeries: MultiRange,
  series: JobSeries
): void {
  if (typeof series.startImgNum === 'undefined') return;
  if (typeof series.startImgNum !== 'number') {
    throw new TypeError('Invalid startImgNum');
  }
  const wantedImages = new MultiRange();
  const endImgNum =
    Number(series.endImgNum) || (imagesInSeries.max() as number);
  const imageDelta = Number(series.imageDelta) || 1;
  for (let i = series.startImgNum; i <= endImgNum; i += imageDelta) {
    wantedImages.append(i);
  }
  if (!wantedImages.length() || !imagesInSeries.has(wantedImages)) {
    throw new RangeError(
      `Series ${series.seriesUid} does not contain enough images ` +
        'specified by startImgNum, endImgNum, imageDelta.\n' +
        `Images in the series: ${imagesInSeries.toString()}`
    );
  }
}

/**
 * Register a new job after data check for the payload
 */
export default async function registerJob(
  jobId: string,
  payload: PluginJobRequest,
  priority: number = 0,
  deps: {
    queue: QueueSystem<PluginJobRequest>;
    pluginDefinitions: PluginDefinition[];
    repository: DicomFileRepository;
  }
): Promise<void> {
  const { queue, pluginDefinitions, repository } = deps;

  // Ensure jobId is alphanumerical.
  if (!/^[a-zA-Z0-9.]+$/.test(jobId)) {
    throw new Error('Invalid Job ID format.');
  }

  // Ensure the specified plug-in exists
  if (!pluginDefinitions.some(p => p.pluginId === payload.pluginId)) {
    throw new TypeError('No such plug-in installed.');
  }

  // Ensure all the specified series exist and each series has
  // enough images to process
  const seriesList = payload.series;
  if (!Array.isArray(seriesList) || !seriesList.length) {
    throw new TypeError('No series specified.');
  }
  for (let series of seriesList) {
    const loader = await repository.getSeries(series.seriesUid);
    const imagesInSeries = new MultiRange(loader.images);
    // Check the series exists
    if (!imagesInSeries.length()) {
      throw new Error(`Series ${series.seriesUid} not found.`);
    }
    checkSeriesImageRange(imagesInSeries, series);
  }

  // All check passed.
  await queue.enqueue(jobId, payload, priority);
}
