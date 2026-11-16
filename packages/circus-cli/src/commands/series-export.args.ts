import type { Command } from 'commander';
import formatHelp from '../utils/formatHelp.ts';

export default (program: Command) => {
  return program
    .command('series-export')
    .description('Download series as the input volumes of CIRCUS CS plug-ins')
    .option('-o, --out <file>', 'output file (default: <series UID>.tar.gz)')
    .option('-z, --zip', 'use zip compression instead of tgz')
    .argument('[series...]', 'series UID, optionally with :start:end:delta')
    .addHelpText(
      'after',
      formatHelp`
        This command downloads series in the format given to CIRCUS CS plug-ins
        (0.mhd, 0.raw, 0.json, 1.mhd, ...) as a tar.gz or zip archive.

        Each series can have the range of images to use, as "uid:start:end:delta".
        Without it, the first range of the series is used. Up to 10 series.

        Without series, you can choose them interactively.

        Examples:
          # Download one series
          circus-cli series-export 1.2.840.113619.2.55

          # Download two series, using every other image of the first one
          circus-cli series-export 1.2.840.113619.2.55:1:31:2 1.2.840.113619.2.56
      `
    );
};
