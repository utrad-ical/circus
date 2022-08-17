import { Command } from 'commander';
import dedent from 'dedent';

export default (program: Command) => {
  return program
    .command('blob-post')
    .description('upload blob(s)')
    .argument('[file...]', 'the files to upload')
    .addHelpText(
      'after',
      '\n' +
        dedent`
          This command uploads one or more blobs to CIRCUS API Server.
          If no files are specified as arguments, the data is read from stdin.
          The SHA-1 hash of the blob is calculated automatically.

          Examples:
            circus-api-util blob-post < blob.bin
            circus-api-util blob-post blob1.bin blob2.bin blob3.bin
        `
    );
};
