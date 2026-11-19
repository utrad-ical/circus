import type { Command } from 'commander';

export default (program: Command) =>
  program
    .command('status')
    .description('Check the API connection and show account access');
