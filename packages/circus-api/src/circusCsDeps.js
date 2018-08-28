import {
  createDaemonController,
  createMongoQueue
} from '@utrad-ical/circus-cs-core';
import * as path from 'path';

/**
 * Creates dependencies related to CIRCUS CS Core.
 * @param {MongoClient} db
 */
export default async function circusCsDeps(db) {
  const jobManagerController = createDaemonController({
    name: 'circus-cs-job-manager',
    cwd: path.join(__dirname, '../node_modules/@utrad-ical/circus-cs-core'),
    output: path.join(__dirname, '..', 'store/logs', 'daemon-pm2-output.log'),
    error: path.join(__dirname, '..', 'store/logs', 'daemon-pm2-error.log')
  });

  const queue = await createMongoQueue({
    collection: db.collection('pluginJobQueue')
  });

  return {
    jobManagerController,
    queue
  };
}
