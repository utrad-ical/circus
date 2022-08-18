import { Command } from 'commander';
import formatHelp from '../utils/formatHelp.js';

export default (program: Command) => {
  return program
    .command('case-addrev')
    .description('Add a new revision to specified case(s)')
    .option(
      '-e, --exec <cmd>',
      'filter command to produce the revision to save'
    )
    .option('-d, --desc <desc>', 'set revision description (message)')
    .option(
      '-D, --edit-desc',
      'specify revision description directly from editor or filter command'
    )
    .option('--force', 'skip confirmation prompt')
    .option('-f, --file', 'read list of case IDs from file')
    .option('-a, --all-revs', 'pass all revisions instead of only the latest')
    .argument(
      '<case-id...>',
      'case ID, or file containing IDs when --file is used'
    )
    .addHelpText(
      'after',
      formatHelp`
        This command will save a new revision to the specified DB case.

        If the "-e (--exec)" option is not set, an editor is launched with the latest revision as the content, so you can edit the content to create the new revision.

        If "-e (--exec)" is specified, it works as the "filter" command that processes the JSON of the latest revision. You can use any command that reads JSON from stdin and writes JSON to stdout. The 'jq' utility is a good choice for simple tasks such as adding a fixed value to attributes. For complex tasks, you can write your own script in the language of your choice.

        The input JSON passed to the filter is an object representing the latest revision of the specified case. It contains the following fields:

          - series (also contains label data)
          - attributes
          - status
          - description (ignored for new revision unless -d is set)
          - date (ignored for new revision)
          - creator (ignored for new revision)

        You can specify the new values for the first four fields. The "date" and "creator" fields output from the filter will always be ignored.

        Within the filter command, the environment variable "CIRCUS_CASE_ID" is available.

        When the filter command is set, you can also specify the "-a (--all-revs)" flag, which allows the filter to receive an array of all the revisions instead of only the latest. Note that the output JSON must still be a single revision.

        The "-d (--desc) <desc>" option lets you specify the revision description (message) directly in the command. Alternatively, you can set the "-D (--edit-desc)" flag to edit the description with an editor or filter command. If neither is set, a prompt will be shown asking for the description.

        Examples:
          # Remove all labels from all series
          circus-api-util case-addrev \
            -e "jq '.series[].labels = []'" \
            -d "Remove all labels" a2b4c6e8f

          # Change case attributes for cases specified in file
          circus-api-util case-addrev \
            -e "jq '.attributes.smoker = true'" \
            -f ./case-ids.txt

          # Use VSCode to edit a revision, also setting the description in the editor
          EDITOR="code --wait" circus-api-util case-addrev -D a2b4c6e8f
        `
    );
};
