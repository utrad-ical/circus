#!/usr/bin/env node

import { confirm, input, password, select } from '@inquirer/prompts';
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { styleText } from 'node:util';
import type { CommandAction } from './commands/CommandAction.ts';
import { getConfigPath, loadCliConnection } from './utils/cliConfig.ts';
import createAuthorizedFetch, {
  type AuthorizedFetch
} from './utils/createAuthorizedFetch.ts';

import authLogin from './commands/auth-login.ts';
import authLoginArgs from './commands/auth-login.args.ts';
import authLogout from './commands/auth-logout.ts';
import authLogoutArgs from './commands/auth-logout.args.ts';
import blobGet from './commands/blob-get.ts';
import blobGetArgs from './commands/blob-get.args.ts';
import blobPost from './commands/blob-post.ts';
import blobPostArgs from './commands/blob-post.args.ts';
import caseAddrev from './commands/case-addrev.ts';
import caseAddrevArgs from './commands/case-addrev.args.ts';
import caseCreate from './commands/case-create.ts';
import caseCreateArgs from './commands/case-create.args.ts';
import caseExport from './commands/case-export.ts';
import caseExportArgs from './commands/case-export.args.ts';
import get from './commands/get.ts';
import getArgs from './commands/get.args.ts';
import jobCreate from './commands/job-create.ts';
import jobCreateArgs from './commands/job-create.args.ts';
import mylistShow from './commands/mylist-show.ts';
import mylistShowArgs from './commands/mylist-show.args.ts';
import patch from './commands/patch.ts';
import patchArgs from './commands/patch.args.ts';
import post from './commands/post.ts';
import postArgs from './commands/post.args.ts';
import put from './commands/put.ts';
import putArgs from './commands/put.args.ts';
import seriesImport from './commands/series-import.ts';
import seriesImportArgs from './commands/series-import.args.ts';
import seriesExport from './commands/series-export.ts';
import seriesExportArgs from './commands/series-export.args.ts';

const commandGroups: {
  name: string;
  description: string;
  commands: [(parent: Command) => Command, CommandAction][];
}[] = [
  {
    name: 'api',
    description: 'Send requests to CIRCUS API',
    commands: [
      [getArgs, get],
      [postArgs, post],
      [putArgs, put],
      [patchArgs, patch]
    ]
  },
  {
    name: 'auth',
    description: 'Manage saved API connection settings',
    commands: [
      [authLoginArgs, authLogin],
      [authLogoutArgs, authLogout]
    ]
  },
  {
    name: 'case',
    description: 'Create, revise, and export cases',
    commands: [
      [caseCreateArgs, caseCreate],
      [caseAddrevArgs, caseAddrev],
      [caseExportArgs, caseExport]
    ]
  },
  {
    name: 'job',
    description: 'Manage plug-in jobs',
    commands: [[jobCreateArgs, jobCreate]]
  },
  {
    name: 'series',
    description: 'Import DICOM data and export series volumes',
    commands: [
      [seriesImportArgs, seriesImport],
      [seriesExportArgs, seriesExport]
    ]
  },
  {
    name: 'blob',
    description: 'Download and upload binary data',
    commands: [
      [blobGetArgs, blobGet],
      [blobPostArgs, blobPost]
    ]
  },
  {
    name: 'mylist',
    description: 'Work with mylists',
    commands: [[mylistShowArgs, mylistShow]]
  }
];

const getVersion = () => {
  const packageJsonPath = path.join(import.meta.dirname, '../package.json');
  return JSON.parse(readFileSync(packageJsonPath, 'utf8')).version as string;
};

const configPath = getConfigPath();

const getFetch = (): AuthorizedFetch => {
  const connection = loadCliConnection(configPath);
  if (!connection) {
    throw new Error(
      `No saved connection found at ${configPath}. Run "circus-cli auth login" to save a connection.`
    );
  }
  const { endpoint, token } = connection;
  return createAuthorizedFetch(token, endpoint);
};

const prompts = { confirm, input, password, select };
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

for (const { name, description, commands } of commandGroups) {
  const group = program.command(name).description(description);
  for (const [configureCommand, action] of commands) {
    configureCommand(group).action(async (...args) => {
      try {
        await action({
          getFetch,
          configPath,
          prompts,
          isInputTTY: Boolean(process.stdin.isTTY)
        })(...args);
      } catch (err: any) {
        console.error(styleText('bgRed', 'Error', { stream: process.stderr }));
        console.error(
          styleText('red', err.message, { stream: process.stderr })
        );
        process.exitCode = 1;
      }
    });
  }
}

await program.parseAsync();
