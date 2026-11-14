import { Command } from 'commander';
import formatHelp from '../utils/formatHelp.js';

export default (program: Command) => {
  return program
    .command('auth')
    .description('Set up your API endpoint and token')
    .option('--logout', 'delete the stored token file')
    .addHelpText(
      'after',
      formatHelp`
        This command sets up the endpoint and token to connect to CIRCUS API Server.
        You must run this command before you can use most other commands.
        The token file will be stored in your home directory.

        You can generate a permanent token via Web UI or via the admin CLI.

        If the "-l (--logout)" flag is set, the token file will be deleted from your home directory.

        Examples:
          # Set up the endpoint and token
          circus-api-util auth

          # Remove token file
          circus-api-util auth --logout
      `
    );
};
