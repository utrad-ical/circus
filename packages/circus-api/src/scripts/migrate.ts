import * as path from 'path';
import chalk from 'chalk';
import { DisposableDb } from '../db/connectDb';
import { Models } from '../db/createModels';
import scanMigrationFiles from '../utils/scanMigrationFiles';
import Command from './Command';

export const help = () => {
  return 'Performs DB migration.';
};

export const command: Command<{ db: DisposableDb; models: Models }> = async (
  opts,
  { db, models }
) => {
  return async () => {
    const migrations = await scanMigrationFiles();
    const migrationCollection = db.collection('migration');

    const revDoc = await migrationCollection.find({}).toArray();
    const currentRevision = revDoc.length ? revDoc[0].revision : 0;

    console.log('Current Revision: ' + currentRevision);

    if (currentRevision === migrations.length - 1) {
      console.log('Already up to date.');
      return;
    }

    for (let i = currentRevision + 1; i in migrations; i++) {
      const file = migrations[i];
      const module = require(file);
      const name = path.basename(file);
      console.log(chalk.green('Forwarding...'), name);
      try {
        await module.up(db, models);
        await migrationCollection.updateOne(
          {},
          { $set: { revision: i, updatedAt: new Date() } },
          { upsert: true }
        );
      } catch (err) {
        console.error(chalk.red('Error: ', name));
        console.error(err.message);
        if (err.errors) console.error(err.errors);
        break;
      }
      console.log('The database is now up to date.');
    }
  };
};

command.dependencies = ['db', 'models'];
