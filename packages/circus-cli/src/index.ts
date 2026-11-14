#!/usr/bin/env node

import { Command } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { styleText } from 'node:util';
import type { CommandAction } from './commands/CommandAction.ts';
import createAuthorizedFetch, {
  type AuthorizedFetch
} from './utils/createAuthorizedFetch.ts';

import auth from './commands/auth.ts';
import authArgs from './commands/auth.args.ts';
import blobGet from './commands/blob-get.ts';
import blobGetArgs from './commands/blob-get.args.ts';
import blobPost from './commands/blob-post.ts';
import blobPostArgs from './commands/blob-post.args.ts';
import caseAddrev from './commands/case-addrev.ts';
import caseAddrevArgs from './commands/case-addrev.args.ts';
import caseDl from './commands/case-dl.ts';
import caseDlArgs from './commands/case-dl.args.ts';
import get from './commands/get.ts';
import getArgs from './commands/get.args.ts';
import mylistShow from './commands/mylist-show.ts';
import mylistShowArgs from './commands/mylist-show.args.ts';
import patch from './commands/patch.ts';
import patchArgs from './commands/patch.args.ts';
import post from './commands/post.ts';
import postArgs from './commands/post.args.ts';
import put from './commands/put.ts';
import putArgs from './commands/put.args.ts';

const commands: [(program: Command) => Command, CommandAction][] = [
  [authArgs, auth],
  [getArgs, get],
  [postArgs, post],
  [putArgs, put],
  [patchArgs, patch],
  [caseAddrevArgs, caseAddrev],
  [caseDlArgs, caseDl],
  [blobPostArgs, blobPost],
  [blobGetArgs, blobGet],
  [mylistShowArgs, mylistShow]
];

const getVersion = () => {
  const packageJsonPath = path.join(import.meta.dirname, '../package.json');
  return JSON.parse(readFileSync(packageJsonPath, 'utf8')).version as string;
};

const rcFilePath = path.join(os.homedir(), '.circusapirc');

const getFetch = (): AuthorizedFetch => {
  // Existing environment variables take precedence over the file
  if (existsSync(rcFilePath)) process.loadEnvFile(rcFilePath);
  const { CIRCUS_API_TOKEN, CIRCUS_API_ENDPOINT } = process.env;

  if (!CIRCUS_API_TOKEN || !CIRCUS_API_ENDPOINT) {
    throw new Error(
      'Connection options have not been configured yet.\n' +
        'You need to create a .circusapirc file.\n' +
        'See README.md.'
    );
  }
  if (!CIRCUS_API_ENDPOINT.endsWith('/')) {
    throw new Error(
      'Connection options are configured incorrectly.\n' +
        'CIRCUS_API_ENDPOINT must end with a slash.'
    );
  }
  return createAuthorizedFetch(CIRCUS_API_TOKEN, CIRCUS_API_ENDPOINT);
};

const program = new Command();
program
  .name('circus-cli')
  .description('CLI for CIRCUS API Server')
  .version(getVersion())
  .configureHelp({
    styleTitle: str => styleText('cyan', str, { validateStream: false }),
    styleOptionTerm: str => styleText('bold', str, { validateStream: false }),
    styleCommandDescription: str =>
      styleText(['yellow', 'bold'], str, { validateStream: false })
  })
  .showHelpAfterError(
    `(Use ${styleText('yellow', '--help', { stream: process.stderr })} for additional information)`
  );

for (const [configureCommand, action] of commands) {
  configureCommand(program).action(async (...args) => {
    try {
      await action({ getFetch, rcFilePath })(...args);
    } catch (err: any) {
      console.error(styleText('bgRed', 'Error', { stream: process.stderr }));
      console.error(styleText('red', err.message, { stream: process.stderr }));
      process.exitCode = 1;
    }
  });
}

await program.parseAsync();
