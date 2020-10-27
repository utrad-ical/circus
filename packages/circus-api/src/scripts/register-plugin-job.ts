import Command from './Command';
import { Models } from '../interface';
import { CsCore } from '@utrad-ical/circus-cs-core';
import generateUniqueId from '../utils/generateUniqueId';
import { toEntry } from './toEntry';
import duplicateJobExists from '../api/duplicateJobExists';

export const options = () => {
  return [
    {
      names: ['user'],
      help: 'User name or Email adress.',
      helpArg: 'USER',
      type: 'string'
    },
    {
      names: ['priority'],
      help: 'Job execution priority.',
      helpArg: 'PRIORITY',
      type: 'number'
    }
  ];
};

export const help = () => {
  return (
    'Create a new plugin-job.\n' +
    'Usage: node circus register-plugin-job PluginIdOrName --user=UesrNameOrEmail --priority=Priority SeriesUid1 [SeriesUid2 ...]'
  );
};

interface Args {
  _args: string[];
  user?: string;
  priority?: number;
}

export const command: Command<{ models: Models; cs: CsCore }> = async (
  _,
  { models, cs }
) => {
  return async (options: Args) => {
    if (options._args.length < 2)
      throw new Error(
        'Required arguments must be specified.\n' +
          'argument 1: pluginId ID or plugin name\n' +
          'argument 2: series UID'
      );
    const [pluginIdOrName, ...seriesUids] = options._args;

    const pluginDocs = await models.plugin.findAll({
      $or: [{ pluginId: pluginIdOrName }, { pluginIdName: pluginIdOrName }]
    });
    if (!pluginDocs.length) throw new Error('Specified plugin does not exist.');
    const plugin = await (() => {
      try {
        return cs.plugin.get(pluginDocs[0].pluginId);
      } catch (err) {
        throw new Error(err);
      }
    })()!;

    const series = await Promise.all(seriesUids.map(s => toEntry(s, models)));

    if (!options.user?.length)
      throw new Error('User ID or e-mail must be specified.');
    const userDocs = await models.user.findAll({
      $or: [{ userEmail: options.user }, { loginId: options.user }]
    });
    if (!userDocs.length) throw new Error('Specified user does not exist.');
    const user = userDocs[0];

    const jobId = generateUniqueId();

    const request = { series, pluginId: plugin.pluginId };

    if (await duplicateJobExists(models, request))
      throw new Error('There is a duplicate job that is already registered.');

    await cs.job.register(jobId, request, options.priority);

    await models.pluginJob.insert({
      jobId,
      pluginId: plugin.pluginId,
      series,
      userEmail: user.userEmail,
      status: 'in_queue',
      errorMessage: null,
      results: null,
      startedAt: null,
      feedbacks: [],
      finishedAt: null
    });

    console.log(jobId);
  };
};

command.dependencies = ['models', 'cs'];
