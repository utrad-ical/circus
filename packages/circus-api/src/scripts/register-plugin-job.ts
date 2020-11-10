import Command from './Command';
import { Models } from '../interface';
import { CsCore } from '@utrad-ical/circus-cs-core';
import { toEntry } from './toEntry';
import makeNewPluginJob from '../plugin-job/makeNewPluginJob';
import { determineUserAccessInfo } from '../privilegeUtils';

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
    'Usage: node circus register-plugin-job PluginIdOrName ' +
    '--user=UesrNameOrEmail --priority=Priority SeriesUid1 [SeriesUid2 ...]'
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
          'argument 1: plugin ID or plugin name\n' +
          'argument 2: series UID'
      );
    const [pluginIdOrName, ...seriesUids] = options._args;

    const pluginDocs = await models.plugin.findAll({
      $or: [{ pluginId: pluginIdOrName }, { pluginName: pluginIdOrName }]
    });
    if (!pluginDocs.length) throw new Error('Specified plugin does not exist.');

    const series = await Promise.all(seriesUids.map(s => toEntry(s, models)));

    if (!options.user?.length)
      throw new Error('User ID or e-mail must be specified.');
    const userDocs = await models.user.findAll({
      $or: [{ userEmail: options.user }, { loginId: options.user }]
    });
    if (!userDocs.length) throw new Error('Specified user does not exist.');
    const user = userDocs[0];

    const userPrivileges = await determineUserAccessInfo(models, user);

    const priority = options.priority ?? 0;

    const request = {
      pluginId: pluginDocs[0].pluginId,
      series
    };

    const jobId = await makeNewPluginJob(
      models,
      request,
      userPrivileges,
      user.userEmail,
      cs,
      priority
    );

    console.log(jobId);
  };
};

command.dependencies = ['models', 'core'];
