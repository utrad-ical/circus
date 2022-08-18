import { Command } from 'commander';
import formatHelp from '../utils/formatHelp.js';

export default (program: Command) => {
  return program
    .command('blob-get')
    .description('Download blob(s)')
    .option('-o, --out <dir>', 'output to directory')
    .argument('<hash...>', 'hash of the blob')
    .addHelpText(
      'after',
      formatHelp`
        This command downloads one or more blobs from CIRCUS API Server.
        If the "-o (--out)" flag is not set, the blob is output to stdout.

        Examples:
          # Download two blobs to current dir
          circus-api-util blob-get --out=. a2b4c6e8f 28a33f46

          # Download one blob as data.bin
          circus-api-util blob-get a2b4c6e8f > data.bin
      `
    );
};
