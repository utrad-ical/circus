import { Command } from 'commander';

export default (program: Command) => {
  return program
    .command('mylist-export')
    .description('export resource IDs of specified mylist')
    .argument('<list-id>', 'ID of the mylist');
};
