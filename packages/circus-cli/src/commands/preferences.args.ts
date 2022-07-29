import { Command } from 'commander';

export default (program: Command) => {
  return program
    .command('preferences')
    .description("display user's preferences");
};
