import { Command } from 'commander';
import formatHelp from '../utils/formatHelp.js';

export default (program: Command) => {
  return program
    .command('blob-post')
    .description('Upload blob(s)')
    .argument('[file...]', 'the files to upload')
    .addHelpText(
      'after',
      formatHelp`
        This command uploads one or more blobs to CIRCUS API Server.
        If no files are specified as arguments, the data is read from stdin.
        The SHA-1 hash of each blob is calculated automatically.

        Examples:
          # Upload one file via stdin
          circus-api-util blob-post < blob.bin

          # Upload three files
          circus-api-util blob-post blob1.bin blob2.bin blob3.bin
      `
    );
};
