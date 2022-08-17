import { Command } from 'commander';

export default (program: Command) => {
  return program
    .command('auth')
    .option('--logout', 'delete the stored token file')
    .description('set up your API endpoint and token');
};
