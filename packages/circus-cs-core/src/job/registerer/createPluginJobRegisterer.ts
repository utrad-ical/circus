import {
  DicomFileRepository,
  isValidPartialVolumeDescriptor,
  rangeHasPartialVolume
} from '@utrad-ical/circus-lib';
import MultiRange from 'multi-integer-range';
import { FunctionService } from '@utrad-ical/circus-lib';
import * as circus from '../../interface';

export interface PluginJobRegisterer {
  register(
    jobId: string,
    payload: circus.PluginJobRequest,
    priority?: number
  ): Promise<void>;
}

/**
 * Register a new job after data check for the payload
 */
const createPluginJobRegisterer: FunctionService<
  PluginJobRegisterer,
  {
    queue: circus.PluginJobRequestQueue;
    pluginDefinitionAccessor: circus.PluginDefinitionAccessor;
    dicomFileRepository: DicomFileRepository;
  }
> = async (options, deps) => {
  const { queue, pluginDefinitionAccessor, dicomFileRepository } = deps;

  async function register(
    jobId: string,
    payload: circus.PluginJobRequest,
    priority: number = 0
  ): Promise<void> {
    // Ensure jobId is alphanumerical.
    if (!/^[a-zA-Z0-9.]+$/.test(jobId)) {
      throw new Error('Invalid Job ID format.');
    }

    // Ensure the specified plug-in exists
    await pluginDefinitionAccessor.get(payload.pluginId);

    // Ensure all the specified series exist and each series has
    // enough images to process
    const seriesList = payload.series;
    if (!Array.isArray(seriesList) || !seriesList.length) {
      throw new TypeError('No series specified.');
    }
    for (const series of seriesList) {
      const loader = await dicomFileRepository.getSeries(series.seriesUid);
      const imagesInSeries = new MultiRange(loader.images);
      // Check the series exists
      if (!imagesInSeries.length()) {
        throw new Error(`Series ${series.seriesUid} not found.`);
      }
      if (!isValidPartialVolumeDescriptor(series.partialVolumeDescriptor)) {
        throw new Error(
          `Series ${series.seriesUid} has invalid partial volume descriptor.`
        );
      }
      if (
        !rangeHasPartialVolume(imagesInSeries, series.partialVolumeDescriptor)
      ) {
        throw new RangeError(
          `Series ${series.seriesUid} does not contain enough images ` +
            'specified by the partialVolumeDescriptor.\n' +
            `Images in the series: ${imagesInSeries.toString()}`
        );
      }
    }

    // All check passed.
    await queue.enqueue(jobId, payload, priority);
  }

  return { register };
};

createPluginJobRegisterer.dependencies = [
  'queue',
  'pluginDefinitionAccessor',
  'dicomFileRepository'
];

export default createPluginJobRegisterer;
