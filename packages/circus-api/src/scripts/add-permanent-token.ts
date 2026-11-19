import type { Command } from 'commander';
import type { Models } from '../interface.ts';
import generatePermanentToken from '../utils/generatePermanentToken.ts';
import { runCommand, type CommandService } from './Command.ts';

interface Options {
  userEmailOrName: string;
  description?: string;
}

export const configure = (program: Command) =>
  program
    .command('issue')
    .description('Grant a permanent API token for a user.')
    .argument('<user>', 'login ID or email address')
    .option('-d, --description <description>', 'Description of the token.')
    .action(
      (
        userEmailOrName: string,
        { description }: Pick<Options, 'description'>
      ) => runCommand(command, { userEmailOrName, description })
    );

export const command: CommandService<{ models: Models }, Options> = async (
  _,
  { models }
) => {
  return async ({
    userEmailOrName,
    description = 'A permanent token for API access'
  }) => {
    const users = await models.user.findAll({
      $or: [{ userEmail: userEmailOrName }, { loginId: userEmailOrName }]
    });
    if (!users.length) throw new Error('The specified user was not found');
    const user = users[0];

    const result = await generatePermanentToken(
      models,
      user.userEmail,
      description
    );
    console.log('Your permanent access token is: ' + result.accessToken);
  };
};

command.dependencies = ['models'];
