#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import fetch from 'node-fetch';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as url from 'node:url';
import pc from 'picocolors';
import CommandAction from './commands/CommandAction.js';
import createAuthorizedFetch from './utils/createAuthorizedFetch.js';

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
      throw new Error(
        'Connection options have not been configured yet.\n' +
          'You need to create a .circusapirc file.\n' +
          'See README.md.'
      );
    }
    if (!CIRCUS_API_ENDPOIT.endsWith('/')) {
      throw new Error(
        'Connection options are configured incorrectly.\n' +
          'CIRCUS_API_ENDPOINT must end with a slash.'
      );
    }
    const apiToken = process.env.CIRCUS_API_TOKEN!;
    const apiEndpoint = process.env.CIRCUS_API_ENDPOINT!;
    return createAuthorizedFetch(apiToken, apiEndpoint);
  };

  const program = new Command();
  program
    .name('circus-api-util')
    .description('CLI for CIRCUS API Server')
    .version(await getVersion());

  const commands = [
    'auth',
    'get',
    'case-addrev',
    'case-dl',
    'blob-post',
    'blob-get',
    'mylist-show'
  ];

  for (const command of commands) {
    const configureCommand: (program: Command) => Command = (
      await import(`./commands/${command}.args.js`)
    ).default;
    const cmd = configureCommand(program);
    cmd.action(async (...args) => {
      const action: CommandAction = (await import(`./commands/${command}.js`))
        .default;
      try {
        await action({ getFetch, rcFilePath })(...args);
      } catch (err: any) {
        console.error(pc.bgRed('Error'));
        console.error(pc.red(err.message));
      }
    });
  }

  program.parse();
};

main().catch(err => {
  console.error('Error!');
  console.error(err);
});
