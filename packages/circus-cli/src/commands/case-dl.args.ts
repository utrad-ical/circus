import { Command } from 'commander';
import { int } from '../utils/commander-utils.js';
import formatHelp from '../utils/formatHelp.js';

export default (program: Command) => {
  return program
    .command('case-dl')
    .description('Download CIRCUS DB cases in MHD format')
    .option('-o, --outdir <dir>', 'output directory (default: CWD)')
    .option('-f, --file', 'read list of case IDs from file')
    .option('-c, --combined', 'export combined label files')
    .option('-l, --crlf', 'use CRLF instead of LF for line endings')
    .option('-z, --zip', 'use zip compression instead of tgz')
    .option(
      '-p, --per-task <num>',
      'number of cases downloaded as a batch',
      int({ min: 1, max: 100 }),
      10
    )
    .argument(
      '<case-id...>',
      'case ID, or file containing IDs when --file is used'
    )
    .addHelpText(
      'after',
      formatHelp`
        This command lets you download CIRCUS DB cases in MHD format.
        The downloaded cases are stored in the output directory with names like "batch-1.tgz".

        One archive file may contain the data of more than one case.
        Use the "-p (--per-task)" option to control the number of cases downloaded as a batch.

        Examples:
          # Download one case
          circus-api-util case-dl -o ~/data a2b4c6e8f

          # Download cases whose IDs are in a file
          circus-api-util case-dl --file case-ids.txt
      `
    );
};
