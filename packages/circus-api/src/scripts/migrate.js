import * as path from 'path';
import chalk from 'chalk';

import connectDb from '../db/connectDb';
import createValidator from '../createValidator';
import createModels from '../db/createModels';
import scanMigrationFiles from '../utils/scanMigrationFiles';

export function help() {
  console.log('Performs DB migration.');
}

async function migrate(db) {
  const migrations = await scanMigrationFiles();
  const validator = await createValidator();

  const models = await createModels(db, validator);
  const migrationCollection = db.collection('migration');

  const revDoc = await migrationCollection.find({}).toArray();
  const currentRevision = revDoc.length ? revDoc[0].revision : 0;

  console.log('Current Revision: ' + currentRevision);

  if (currentRevision === migrations.length - 1) {
    console.log('Up to date.');
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
  }
}

export async function exec() {
  let db;
  try {
    db = await connectDb();
    await migrate(db);
  } catch (err) {
    console.error(err);
  } finally {
    if (db) await db.close();
  }
}
