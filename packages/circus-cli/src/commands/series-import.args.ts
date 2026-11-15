import type { Command } from 'commander';
import { int } from '../utils/commander-utils.ts';
import formatHelp from '../utils/formatHelp.ts';

export default (program: Command) => {
  return program
    .command('series-import')
    .description('Import DICOM files into CIRCUS DB')
    .option(
      '-d, --domain <domain>',
      'domain of the imported series (asked if omitted)'
    )
    .option(
      '-b, --batch-size <num>',
      'number of files sent as a batch (default: all at once)',
      int({ min: 1 })
    )
    .argument('<path...>', 'DICOM file, directory, or zip/tar.gz archive')
    .addHelpText(
      'after',
      formatHelp`
        This command uploads DICOM files to CIRCUS API Server, which imports them while receiving.

        Without the "-d (--domain)" option, you can choose one of your domains.

        Directories are searched recursively.
        Zip and tar.gz archives are sent as they are and extracted by the server.
        The other files are sent together in a tar.gz archive made on the fly.
        Files that are not DICOM are skipped by the server and reported.

        Use the "-b (--batch-size)" option to split the upload into several requests.
        An archive counts as one file.

        The exit code is 1 if some files could not be imported.

        Examples:
          # Upload a directory of DICOM files
          circus-cli series-import -d my.domain ~/dicom/series1

          # Upload zip files, 10 at a time
          circus-cli series-import -d my.domain -b 10 *.zip
      `
    );
};
