import type { Command } from 'commander';
import type { Models } from '../interface.ts';
import { runCommand, type CommandService } from './Command.ts';

interface Options {
  all?: boolean;
}

export const configure = (program: Command) =>
  program
    .command('clear')
    .description('Remove access tokens for all users.')
    .option('-a, --all', 'Also delete permanent API tokens.')
    .action((options: Options) => runCommand(command, options));

export const command: CommandService<{ models: Models }, Options> = async (
  _,
  { models }
) => {
  return async ({ all }) => {
    const where = all ? {} : { permanentTokenId: null };
    const res = await models.token.deleteMany(where);
    console.log(`Deleted ${res.deletedCount} access token(s).`);
    if (!all) {
      console.log('Use --all flag to also delete permanent tokens.');
    }
  };
};

command.dependencies = ['models'];
