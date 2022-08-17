import { Command } from 'commander';
import dedent from 'dedent';

export default (program: Command) => {
  return program
    .command('mylist-show')
    .description('show all mylists')
    .addHelpText(
      'after',
      '\n' +
        dedent`
          This command lists the user's mylists.

          Tip:
            After retreiving the myListId with this command, you can get the list of resource IDs like so:

            circus-api-util get mylists/<myListId> | jq -r .resourceIds[]
        `
    );
};
