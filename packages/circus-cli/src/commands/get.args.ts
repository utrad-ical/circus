import { Command } from 'commander';
import dedent from 'dedent';

export default (program: Command) => {
  return program
    .command('get')
    .description('feach resource from CIRCUS API')
    .argument('<resource>', 'resource to fetch')
    .option('-n, --no-pretty', 'disable pretty-print even on TTY')
    .option('-q, --query <query...>', 'query parameter (urlencoded)')
    .addHelpText(
      'after',
      '\n' +
        dedent`
          This command makes a GET request to CIRCUS API Server.
          Output is written to stdout.

          The "-q (--query)" option can be used to add query parameters to the API.
          The value after the "=" sign will be url-encoded.

          Hint:
            Use the 'jq' utility to format or select parts of the data.

          Examples:
            # fetch current user's preferences
            circus-api-util get preferences

            # fetch a case and picks the latest revision's creator using jq
            circus-api-util get cases/a2b4c6e8f | jq .revisions[-1].creator

            # perform search (get the most recently uploaded series of a male patient)
            circus-api-util get series \
              -q 'filter={"patientInfo.sex":"M"}' \
              -q 'sort={"createdAt":-1}' \
              -q limit=1

        `
    );
};
