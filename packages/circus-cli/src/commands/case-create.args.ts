import type { Command } from 'commander';

export default (program: Command) =>
  program
    .command('create')
    .description('Create a case from one or more series')
    .option('--project <id-or-name>', 'project ID or name')
    .option('--tags <tags>', 'comma-separated case tags')
    .argument('[series...]', 'series UID, optionally with :start:end:delta')
    .addHelpText(
      'after',
      '\nOmit the project or series to choose them interactively in a terminal.\n' +
        'Without an explicit image range, the server selects the range and order.'
    );
