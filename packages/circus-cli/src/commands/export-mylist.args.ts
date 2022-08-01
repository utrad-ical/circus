import { Command } from 'commander';

export default (program: Command) => {
  return program
    .command('export-mylist')
    .description('export resource IDs of your mylist')
    .argument('[id]', 'ID of the mylist');
};
