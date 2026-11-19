import type { Command } from 'commander';
import formatHelp from '../utils/formatHelp.ts';

export default (program: Command) => {
  return program
    .command('show')
    .description('Show all mylists')
    .addHelpText(
      'after',
      formatHelp`
        This command lists the user's mylists.

        Hint:
          After retreiving the myListId with this command, you can get the list of resource IDs like so:

          circus-cli api get mylists/<myListId> | jq -r .resourceIds[]
      `
    );
};
