import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { styleText } from 'node:util';
import { printCommandError } from './Command.ts';
import { configure as addPermanentToken } from './add-permanent-token.ts';
import { configure as clearToken } from './clear-token.ts';
import { configure as dbCheck } from './db-check.ts';
import { configure as dumpDicom } from './dump-dicom.ts';
import { configure as generatePasswordHash } from './generate-password-hash.ts';
import { configure as migrate } from './migrate.ts';
import { configure as refreshSeriesParameters } from './refresh-series-parameters.ts';
import { configure as registerCadPlugin } from './register-cad-plugin.ts';
import { configure as ulid } from './ulid.ts';

const removedCommands = new Map([
  ['export-case', 'case export'],
  ['import-series', 'series import'],
  ['register-case', 'case create'],
  ['register-plugin-job', 'job create']
]);

const main = async (argv: string[]) => {
  const requestedCommand = argv[0] === 'help' ? argv[1] : argv[0];
  const replacement = requestedCommand && removedCommands.get(requestedCommand);
  if (replacement) {
    console.error(
      `'circus ${requestedCommand}' has been removed. Use 'circus-cli ${replacement}'.`
    );
    process.exitCode = 1;
    return;
  }

  const { version } = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
  );
  const program = new Command()
    .name('circus')
    .description('CIRCUS server administration')
    .version(version);

  addPermanentToken(program);
  clearToken(program);
  dbCheck(program);
  dumpDicom(program);
  generatePasswordHash(program);
  migrate(program);
  refreshSeriesParameters(program);
  registerCadPlugin(program);
  ulid(program);

  if (!argv.length) {
    program.outputHelp();
    return;
  }
  await program.parseAsync(argv, { from: 'user' });
};

try {
  await main(process.argv.slice(2));
} catch (error) {
  console.error(styleText('red', 'ERROR:', { stream: process.stderr }));
  printCommandError(error);
  process.exitCode = 1;
}
