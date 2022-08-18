import { Command } from 'commander';
import formatHelp from '../utils/formatHelp.js';

export default (program: Command) => {
  return program
    .command('get')
    .description('Fetch resource from CIRCUS API')
    .argument('<resource>', 'resource to fetch (URL)')
    .option('-n, --no-pretty', 'disable JSON pretty-print even on TTY')
    .option('-q, --query <query...>', 'query parameter (urlencoded)')
    .addHelpText(
      'after',
      formatHelp`
        This command makes a GET request to CIRCUS API Server.
        Output is written to stdout.

        The "-q (--query)" option can be used to add query parameters to the API.
        The value after the "=" sign will be url-encoded.
        This option can be used multiple times.

        Hint:
          It's recommended to the 'jq' utility to format or select parts of the data.

        Examples:
          # Fetch current user's preferences
          circus-api-util get preferences

          # Fetch a case and picks the latest revision's creator using jq
          circus-api-util get cases/a2b4c6e8f | jq .revisions[-1].creator

          # Perform search (get the most recently uploaded series of a male patient)
          circus-api-util get series \
            -q 'filter={"patientInfo.sex":"M"}' \
            -q 'sort={"createdAt":-1}' \
            -q limit=1
        `
    );
};
