import { Command } from 'commander';
import { config } from 'dotenv';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as url from 'node:url';
import pc from 'picocolors';
import CreateCommand from './commands/CreateCommand.js';
import createAuthorizedFetch from './createAuthorizedFetch.js';

const getVersion = async () => {
  const packageJsonPath = path.resolve(
    path.dirname(url.fileURLToPath(import.meta.url)),
    '../package.json'
  );
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  return packageJson.version;
};

const main = async () => {
  const rcFilePath = path.join(os.homedir(), '.circusapirc');

  const getFetch = (): typeof fetch => {
    config({ path: rcFilePath });
    const CIRCUS_API_TOKEN = process.env.CIRCUS_API_TOKEN;
    const CIRCUS_API_ENDPOIT = process.env.CIRCUS_API_ENDPOINT;

    if (!CIRCUS_API_TOKEN || !CIRCUS_API_ENDPOIT) {
      console.error(
        pc.red(
          'Missing environment variables to connect to CIRCUS API Server.\n'
        ) +
          'You need to create an .env file.\n' +
          'See README.md.'
      );
      throw new Error();
    }
    if (!CIRCUS_API_ENDPOIT.endsWith('/')) {
      console.error(pc.red('CIRCUS_API_ENDPOINT must end with a slash.'));
      throw new Error();
    }
    const apiToken = process.env.CIRCUS_API_TOKEN!;
    const apiEndpoint = process.env.CIRCUS_API_ENDPOINT!;
    return createAuthorizedFetch(apiToken, apiEndpoint);
  };

  const program = new Command();
  program
    .name('circus-api')
    .description('CLI for CIRCUS API Server')
    .version(await getVersion());

  const commands = ['preferences', 'dl-cases'];

  for (const command of commands) {
    const createCommand: CreateCommand = (
      await import(`./commands/${command}.js`)
    ).default;
    const cmd = createCommand({ getFetch, rcFilePath });
    cmd.configureCommand(program).action(cmd.run);
  }

  program.parse();
};

main().catch(err => {
  console.error('Error!');
  console.error(err);
});
