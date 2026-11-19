import type { Command } from 'commander';
import { int } from '../utils/commander-utils.ts';

export default (program: Command) =>
  program
    .command('create')
    .description('Register a plug-in job for one or more series')
    .option('--plugin <id-or-name>', 'plug-in ID or name')
    .option('--priority <integer>', 'job priority (default: 0)', int())
    .argument('[series...]', 'series UID, optionally with :start:end:delta')
    .addHelpText(
      'after',
      '\nOmit the plug-in or series to choose them interactively in a terminal.\n' +
        'Without an explicit image range, the server selects the range and order.'
    );
