import type { Command } from 'commander';
import * as path from 'path';
import { styleText } from 'node:util';
import type { Database, Models } from '../interface.ts';
import scanMigrationFiles from '../utils/scanMigrationFiles.ts';
import {
  printCommandError,
  runCommand,
  type CommandService
} from './Command.ts';

export const configure = (program: Command) =>
  program
    .command('migrate')
    .description('Apply pending database migrations.')
    .action(() => runCommand(command, undefined));

export const command: CommandService<{
  database: Database;
  models: Models;
}> = async (_, { database, models }) => {
  return async () => {
    const migrations = await scanMigrationFiles();
    const migrationCollection = database.db.collection('migration');

    const revDoc = await migrationCollection.find({}).toArray();
    const currentRevision = revDoc.length ? revDoc[0].revision : 0;

    console.log('Current Revision: ' + currentRevision);

    if (currentRevision === migrations.length - 1) {
      console.log('Already up to date.');
      return;
    }

    for (let i = currentRevision + 1; i in migrations; i++) {
      const file = migrations[i];
      const name = path.basename(file);
      console.log(styleText('green', 'Forwarding...'), name);
      try {
        const module = await import(file);
        await module.up(database.db, models);
        await migrationCollection.updateOne(
          {},
          { $set: { revision: i, updatedAt: new Date() } },
          { upsert: true }
        );
      } catch (error) {
        printCommandError(error, `Migration ${name} failed.`);
        process.exitCode = 1;
        return;
      }
    }
    console.log('The database is now up to date.');
  };
};

command.dependencies = ['database', 'models'];
