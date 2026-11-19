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
  ['export-case', 'circus-cli case export'],
  ['import-series', 'circus-cli series import'],
  ['register-case', 'circus-cli case create'],
  ['register-plugin-job', 'circus-cli job create'],
  ['db-check', 'circus db check'],
  ['migrate', 'circus db migrate'],
  ['refresh-series-parameters', 'circus series refresh-parameters'],
  ['register-cad-plugin', 'circus plugin register'],
  ['add-permanent-token', 'circus token issue'],
  ['clear-token', 'circus token clear'],
  ['dump-dicom', 'circus util dump-dicom'],
  ['generate-password-hash', 'circus util hash-password'],
  ['ulid', 'circus util ulid']
]);

const main = async (argv: string[]) => {
  const requestedCommand = argv[0] === 'help' ? argv[1] : argv[0];
  const replacement = requestedCommand && removedCommands.get(requestedCommand);
  if (replacement) {
    console.error(
      `'circus ${requestedCommand}' has been removed. Use '${replacement}'.`
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
    .version(version)
    .configureHelp({
      styleTitle: str => styleText('cyan', str, { validateStream: false }),
      styleOptionTerm: str => styleText('bold', str, { validateStream: false }),
      styleCommandDescription: str =>
        styleText(['yellow', 'bold'], str, { validateStream: false })
    })
    .showHelpAfterError(
      `(Use ${styleText('yellow', '--help', { stream: process.stderr })} for additional information)`
    );

  const db = program
    .command('db')
    .description('Check and migrate the database');
  dbCheck(db);
  migrate(db);

  const series = program
    .command('series')
    .description('Maintain stored DICOM series');
  refreshSeriesParameters(series);

  const plugin = program
    .command('plugin')
    .description('Manage installed plug-ins');
  registerCadPlugin(plugin);

  const token = program.command('token').description('Manage access tokens');
  addPermanentToken(token);
  clearToken(token);

  const util = program
    .command('util')
    .description('Run local diagnostic and utility commands');
  dumpDicom(util);
  generatePasswordHash(util);
  ulid(util);

  if (!argv.length) {
    program.outputHelp();
    return;
  }
  await program.parseAsync(argv, { from: 'user' });
};

try {
  await main(process.argv.slice(2));
} catch (error) {
  printCommandError(error);
  process.exitCode = 1;
}
