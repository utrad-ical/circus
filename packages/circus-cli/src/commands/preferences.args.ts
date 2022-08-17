import { Command } from 'commander';
import dedent from 'dedent';

export default (program: Command) => {
  return program
    .command('preferences')
    .description("display user's preferences")
    .addHelpText(
      'after',
      '\n' +
        dedent`
          The primary purpose of this command is to check if your token is valid.
        `
    );
};
