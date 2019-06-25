import { FunctionService, generateUniqueId } from '@utrad-ical/circus-lib';
import Command from './Command';
import { PluginJobRegisterer } from '../job/registerer/createPluginJobRegisterer';
import parseSeries from './util/parseSeries';

const register: FunctionService<
  Command,
  { pluginJobRegisterer: PluginJobRegisterer }
> = async (options, deps) => {
  const { pluginJobRegisterer } = deps;
  return async (commandName, args) => {
    const {
      _: [pluginId, ...series],
      jobId = generateUniqueId(),
      environment = undefined,
      priority = 0
    } = args;

    // Each series definition must be in the form of
    // `seriesUid(:startImgNum(:endImgNum(:imageDelta)))`.
    const seriesList = (series as string[]).map(parseSeries);

    if (!pluginId || !series.length) {
      console.log('Usage: cui register <pluginId> <series0> [<series1> ...]');
      return;
    }

    const payload = { pluginId, series: seriesList, environment };
    await pluginJobRegisterer.register(jobId, payload, priority);
    console.log(`Registered Job, ID: ${jobId}`);
  };
};

register.dependencies = ['pluginJobRegisterer'];
