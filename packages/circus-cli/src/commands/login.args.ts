import { Command } from 'commander';

export default (program: Command) => {
  return program
    .command('login')
    .description('set up your API endpoint and token');
};
