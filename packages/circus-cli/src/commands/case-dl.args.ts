import type { Command } from 'commander';
import { int } from '../utils/commander-utils.ts';
import formatHelp from '../utils/formatHelp.ts';

export default (program: Command) => {
  return program
    .command('case-dl')
    .description('Download CIRCUS DB cases in MHD format')
    .option('-o, --outdir <dir>', 'output directory (default: CWD)')
    .option('-f, --file', 'read list of case IDs from file')
    .option(
      '-s, --entire-series',
      'export all the images of the series instead of the partial volume'
    )
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

        By default, each volume is the partial volume of the case, which the labels fit.
        With "-s (--entire-series)", each volume has all the images of the series,
        and the labels stay in the partial volume ("originalSeriesMeta" in data.json
        has the image numbers of the series).

        Examples:
          # Download one case
          circus-cli case-dl -o ~/data a2b4c6e8f

          # Download cases whose IDs are in a file
          circus-cli case-dl --file case-ids.txt
      `
    );
};
