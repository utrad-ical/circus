import type { Command } from 'commander';

export default (program: Command) =>
  program
    .command('logout')
    .description('Delete the file containing the saved API endpoint and token');
