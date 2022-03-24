import { Models } from '../interface';
import { SeriesEntry } from '../typings/circus';

interface PluginJobRequest {
  pluginId: string;
  series: SeriesEntry[];
}

const duplicateJobExists = async (
  models: Models,
  request: PluginJobRequest
) => {
  const { pluginId, series } = request;

  const filter: any = {
    $and: [{ status: { $ne: 'invalidated' } }, { status: { $ne: 'failed' } }],
    pluginId: pluginId,
    series: { $size: series.length }
  };

  for (let volId = 0; volId < series.length; volId++) {
    filter[`series.${volId}.seriesUid`] = series[volId].seriesUid;
    filter[`series.${volId}.partialVolumeDescriptor.start`] =
      series[volId].partialVolumeDescriptor.start;
    filter[`series.${volId}.partialVolumeDescriptor.end`] =
      series[volId].partialVolumeDescriptor.end;
    filter[`series.${volId}.partialVolumeDescriptor.delta`] =
      series[volId].partialVolumeDescriptor.delta;
  }

  return await models.pluginJob.findAsCursor(filter).hasNext();
};

export default duplicateJobExists;
