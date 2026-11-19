import type { Command } from 'commander';
import formatHelp from '../utils/formatHelp.ts';

export const setSharedOptions = (program: Command) => {
  return program
    .argument('<resource>', 'resource to post (URL)')
    .option('-b, --bin', 'data is binary')
    .option('-y, --yaml', 'read data from YAML file');
};

export const setSharedHelp = (program: Command, verb: string) => {
  return program.addHelpText(
    'after',
    formatHelp`
        This sends a ${verb.toUpperCase()} request, like "circus-cli api post --${verb}".

        Run "circus-cli api post --help" for details and examples.
      `
  );
};

export default (program: Command) => {
  const p = program.command('post').description('Post data to CIRCUS API');
  return setSharedOptions(p)
    .option('-p, --put', 'use PUT instead of POST')
    .option('-P, --patch', 'use PATCH instead of POST')
    .addHelpText(
      'after',
      formatHelp`
        This command makes a POST (or PUT/PATCH) request to CIRCUS API Server.
        The posted data (request body) will be read from stdin.

        Most endpoints of CIRCUS API expects JSON data as the input.
        The input data can be specified in one of the following formats:

          - JSON
          - JSON5 (JSON with comments, see https://json5.org/)
          - YAML (when the "-y (--yaml)" option is used)

        When the endpoint expects a binary (application/octet-stream), set the "-b (--bin)" option.

        Examples:
          # Starts the plug-in job manager (requires admin privilege)
          echo '{"status":"running"}' | circus-cli api put admin/plugin-job-manager/switch

          # Creates a new mylist
          echo '{"name":"favs", "resourceType":"series", "public":false}' > req.json
          circus-cli api post mylists < req.json
      `
    );
};
