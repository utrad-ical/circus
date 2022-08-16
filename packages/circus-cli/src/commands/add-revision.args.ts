import { Command } from 'commander';
import dedent from 'dedent';

export default (program: Command) => {
  return program
    .command('add-revision')
    .description('add a new revision to specified case(s)')
    .requiredOption(
      '-e, --exec [command]',
      'command to process the latest revision'
    )
    .option(
      '-d, --desc [desc]',
      'change revision description (message), overwrites processed JSON'
    )
    .option(
      '-n, --dry-run',
      'do not actually add the revision, just print the processed JSON'
    )
    .option('-f, --file', 'read list of case IDs from file')
    .option(
      '-a, --all',
      '[unimplemented] pass all revisions instead of only the latest'
    )
    .argument(
      '<case-id...>',
      'case ID, or file containing IDs when --file is used'
    )
    .addHelpText(
      'after',
      '\n' +
        dedent`
          This command will add a new revision to an existing DB case,
          based on the latest revision.
          Pass a command (-e) that processes the JSON of the latest revision.
          The 'jq' utility is a good choice for this, but you can write any
          script that reads JSON from stdin and writes JSON to stdout.

          Input JSON contains the following fields, all of which can be modified:

            - series
            - description
            - attributes
            - status

          The following environment variables are avaialble to the command:

            - CIRCUS_CASE_CREATOR
            - CIRCUS_CASE_CREATED_AT

          Examples:

            # Remove all labels from all series
            circus-api-util make-revision -e "
              jq '.series[].labels = []'
            " -d "Remove all labels" a2b4c6e8f

            # Change case attributes
            circus-api-util make-revision -e "
              jq '.attributes.smoker = false'
            " -d "Change case attributes" a2b4c6e8f
          `
    );
};
