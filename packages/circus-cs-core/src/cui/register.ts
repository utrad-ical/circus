import { JobSeries } from '../interface';
import isDicomUid from '../util/isDicomUid';
import { FunctionService } from '@utrad-ical/circus-lib';
import Command from './Command';
import { PluginJobRegisterer } from '../job/registerer/createPluginJobRegisterer';

function parseSeries(str: string): JobSeries {
  const [seriesUid, start, end, delta = '1'] = str.split(':');
  const asInt = (str: string | undefined) => {
    if (typeof str === 'string') {
      if (/^[0-9]+$/.test(str)) return parseInt(str, 10);
      throw new Error('Invalid argument.');
    }
    return undefined;
  };

  if (!isDicomUid(seriesUid)) {
    throw new SyntaxError(
      `Series ${seriesUid} does not seem to be a valid DICOM UID.`
    );
  }

  // Todo: Use shared validators and interfaces in lib
  const seriesEntry: any = { seriesUid };
  if (start !== undefined && end !== undefined) {
    seriesEntry.partialVolumeDescriptor = {
      start: asInt(start),
      end: asInt(end),
      delta: asInt(delta)
    };
  }
  return seriesEntry;
}

const register: FunctionService<
  Command,
  { pluginJobRegisterer: PluginJobRegisterer }
> = async (options, deps) => {
  const { pluginJobRegisterer } = deps;
  return async (commandName, args) => {
    try {
      // Todo: use shared id creator
      const newJobId = () => new Date().getTime().toString();
      const {
        _: [pluginId, ...series],
        jobId = newJobId(),
        environment = undefined,
        priority = 0
      } = args;

      // Each series definition must be in the form of
      // `seriesUid(:startImgNum(:endImgNum(:imageDelta)))`.
      const seriesList = series.map(parseSeries);

      if (!pluginId || !series.length) {
        console.log('Usage: cui register <pluginId> <series0> [<series1> ...]');
        return;
      }

      const payload = { pluginId, series: seriesList, environment };
      await pluginJobRegisterer.register(jobId, payload, priority);
      console.log(`Registered Job, ID: ${jobId}`);
    } finally {
      // await dispose();
    }
  };
};

register.dependencies = ['pluginJobRegisterer'];
