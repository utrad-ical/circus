import { Command } from 'commander';
import dedent from 'dedent';

export default (program: Command) => {
  return program
    .command('case-addrev')
    .description('add a new revision to specified case(s)')
    .option(
      '-e, --exec <cmd>',
      'filter command to produce the revision to save'
    )
    .option('-d, --desc [desc]', 'set revision description (message)')
    .option('--force', "don't prompt for confirmation")
    .option('-f, --file', 'read list of case IDs from file')
    .option('-a, --all-revs', 'pass all revisions instead of only the latest')
    .argument(
      '<case-id...>',
      'case ID, or file containing IDs when --file is used'
    )
    .addHelpText(
      'after',
      '\n' +
        dedent`
          This command will save a new revision to the specified DB case.

          If the "-e (--exec)" option is not set, an editor is launched with the latest revision as the content, so you can edit the content to create the new revision.

          If "-e (--exec)" is specified, it works as the "filter" command that processes the JSON of the latest revision. You can use any command that reads JSON from stdin and writes JSON to stdout. The 'jq' utility is a good choice for simple tasks such as adding a fixed value to attributes. For complex tasks, you can write your own script in the language of your choice.

          The input JSON passed to the filter is an object representing the latest revision of the specified case. It contains the following fields:

            - series (also contains label data)
            - attributes
            - status
            - description (ignored for new revision unless -d is set)
            - createdAt (ignored for new revision)
            - creator (ignored for new revision)

          You can specify the new values for the first four fields. The "createdAt" and "creator" fields output from the filter will always be ignored.

          The "-a (--all-revs)" option allows the filter command to receive all the revisions instead of only the latest. Note that your output JSON must still be a single revision.

          The "-d" option specifies how to determine the description of the new revision. If "-d" is not set, a prompt will be shown to enter the description. If the "-d" is used with an actual string, that string will be used as the description (overwriting the "description" field from the output JSON). If "-d" is used without a string, the description will be read from the output JSON.

          The following environment variables are avaialble to the command:

            - CIRCUS_CASE_ID

          Examples:

            # Remove all labels from all series
            circus-api-util case-addrev -e "jq '.series[].labels = []'" -d "Remove all labels" a2b4c6e8f

            # Change case attributes for cases specified in file
            circus-api-util case-addrev -e "jq '.attributes.smoker = true'" -f ./case-ids.txt

            # Use 'vipe' as a filter to directly edit the revision with an editor
            circus-api-util case-addrev -e vipe -d a2b4c6e8f
          `
    );
};
