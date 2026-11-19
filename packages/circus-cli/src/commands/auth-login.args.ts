import type { Command } from 'commander';
import formatHelp from '../utils/formatHelp.ts';

export default (program: Command) => {
  return program
    .command('login')
    .description('Set up your API endpoint and token')
    .addHelpText(
      'after',
      formatHelp`
        This command verifies the API endpoint and token before saving them
        to the token file in your home directory.

        You can generate a permanent token via Web UI or via the admin CLI.

        Run "circus-cli auth logout" to remove the saved connection settings.
      `
    );
};
