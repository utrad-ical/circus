import { Command } from 'commander';

export default (program: Command) => {
  return program.command('mylist-show').description('show all mylists');
};
