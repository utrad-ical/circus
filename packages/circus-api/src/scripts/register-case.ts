import Command from './Command';
import { TransactionManager } from '../interface';
import makeNewCase from '../case/makeNewCase';
import { determineUserAccessInfo } from '../privilegeUtils';
import { toEntry } from './toEntry';

export const options = () => {
  return [
    {
      names: ['user'],
      help: 'User name or Email adress.',
      helpArg: 'USER',
      type: 'string'
    },
    {
      names: ['tags'],
      help: '',
      helpArg: 'TAGS',
      type: 'string'
    }
  ];
};

export const help = () => {
  return (
    'Create a new clinical case to DB.\n' +
    'Usage: node circus register-case ProjectIdOrName --user=UesrNameOrEmail {--tags=tag1,tag2} SeriesUid1 [SeriesUid2 ...]'
  );
};

interface Args {
  _args: string[];
  user?: string;
  tags?: string;
}

export const command: Command<{ transactionManager: TransactionManager }> =
  async (_, { transactionManager }) => {
    return async (options: Args) => {
      await transactionManager.withTransaction(async models => {
        if (options._args.length < 2)
          throw new Error(
            'Required arguments must be specified.\n' +
              'argument 1: project ID or project name\n' +
              'argument 2: series UID'
          );
        const [projectIdOrName, ...seriesUids] = options._args;

        const projectDocs = await models.project.findAll({
          $or: [
            { projectId: projectIdOrName },
            { projectName: projectIdOrName }
          ]
        });
        if (!projectDocs.length)
          throw new Error('Specified project does not exist.');
        const project = projectDocs[0];

        const series = await Promise.all(
          seriesUids.map(s => toEntry(s, models))
        );

        if (!options.user?.length)
          throw new Error('User ID or e-mail must be specified.');
        const userDocs = await models.user.findAll({
          $or: [{ userEmail: options.user }, { loginId: options.user }]
        });
        if (!userDocs.length) throw new Error('Specified user does not exist.');
        const user = userDocs[0];

        const userPrivileges = await determineUserAccessInfo(models, user);

        const tags =
          options.tags?.split(',').map((s: string) => s.trim()) ?? [];

        const caseId = await makeNewCase(
          models,
          user,
          userPrivileges,
          project,
          series,
          tags
        );

        console.log(caseId);
      });
    };
  };

command.dependencies = ['transactionManager'];
