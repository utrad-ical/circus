import { Command } from 'commander';
import dedent from 'dedent';

export default (program: Command) => {
  return program
    .command('blob-get')
    .description('download blob(s)')
    .option('-o, --out <dir>', 'output to directory')
    .argument('<hash...>', 'hash of the blob')
    .addHelpText(
      'after',
      '\n' +
        dedent`
          This command downloads one or more blobs from CIRCUS API Server.
          If the "-o (--out)" flag is not set, the blob is output to stdout.

          Examples:
            circus-api-util blob-get --out=. a2b4c6e8f 28a33f46
            circus-api-util blob-get a2b4c6e8f > blob.bin
        `
    );
};
