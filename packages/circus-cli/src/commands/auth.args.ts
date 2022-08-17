import { Command } from 'commander';
import dedent from 'dedent';

export default (program: Command) => {
  return program
    .command('auth')
    .option('--logout', 'delete the stored token file')
    .description('set up your API endpoint and token')
    .addHelpText(
      'after',
      '\n' +
        dedent`
          This command sets up the endpoint and token to connect to CIRCUS API Server.
          You must run this command before you can use most other commands.
          The token file will be stored in your home directory.

          You can generate a permanent token via Web UI or via the admin CLI.

          If the "-l (--logout)" flag is set, the token file will be deleted from your home directory.

          Examples:
            circus-api-util auth
            circus-api-util auth --logout
        `
    );
};
