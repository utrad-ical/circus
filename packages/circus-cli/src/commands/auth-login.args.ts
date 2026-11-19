import type { Command } from 'commander';
import formatHelp from '../utils/formatHelp.ts';

export default (program: Command) => {
  return program
    .command('login')
    .description('Set up your API endpoint and token')
    .addHelpText(
      'after',
      formatHelp`
        This command sets up the endpoint and token to connect to CIRCUS API Server.
        You must run this command before you can use most other commands.
        The token file will be stored in your home directory.

        You can generate a permanent token via Web UI or via the admin CLI.

        Run "circus-cli auth logout" to remove the saved connection settings.
      `
    );
};
