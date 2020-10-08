// main server bootstrapping

import chalk from 'chalk';
import dashdash from 'dashdash';
import mongo from 'mongodb';
import merge from 'merge';
import createServiceLoader from './createServiceLoader';
import scanMigrationFiles from './utils/scanMigrationFiles';
import config from './config';
import util from 'util';

const options = [
  {
    names: ['help', 'h'],
    type: 'bool',
    help: 'prints this help and exit'
  },
  {
    names: ['host', 'i'],
    env: 'IP',
    type: 'string',
    helpArg: 'HOST',
    help: 'IP address to listen to'
  },
  {
    names: ['port', 'p'],
    env: 'PORT',
    type: 'number',
    helpArg: 'PORT',
    help: 'port'
  },
  {
    names: ['fix-user', 'f'],
    env: 'CIRCUS_API_FIX_USER',
    type: 'string',
    help: 'skips authentication and use this user as the current user'
  },
  {
    names: ['debug', 'd'],
    type: 'bool',
    help: 'enables debug mode endpoints'
  }
];

const parsedArgs = (() => {
  try {
    const parser = dashdash.createParser({ options });
    const opts = parser.parse(process.argv);
    if (opts.help) {
      console.log('Usage: node server.js [OPTIONS]');
      console.log('Options:\n' + parser.help({ includeEnv: true }));
      process.exit(0);
    }
    return {
      host: opts.host,
      port: opts.port,
      fixUser: opts.fix_user,
      debug: opts.debug
    };
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
})();

const getCurrentDbSchemaRevision = async (db: mongo.Db) => {
  const migrationCollection = db.collection('migration');
  const revDoc = await migrationCollection.find({}).toArray();
  const currentRevision = revDoc.length ? revDoc[0].revision : 0;
  return currentRevision;
};

const getLatestDbSchemaRevision = async () => {
  const revisions = await scanMigrationFiles();
  return revisions.length - 1;
};

const main = async () => {
  // These two options can be modified by a config file
  const patchedConfig = merge({}, config);
  Object.keys(parsedArgs).forEach(k => {
    if ((parsedArgs as any)[k] !== undefined) {
      patchedConfig.apiServer.options[k] = (parsedArgs as any)[k];
    }
  });

  const loader = await createServiceLoader(patchedConfig);
  const db = await loader.get('db');
  const logger = await loader.get('apiLogger');
  const blobStorage = await loader.get('blobStorage');
  const dicomFileRepository = await loader.get('dicomFileRepository');

  // Establish db connection (shared throughout app)

  const currentDbSchemaRevision = await getCurrentDbSchemaRevision(db);
  const latestDbSchemaRevision = await getLatestDbSchemaRevision();
  if (currentDbSchemaRevision !== latestDbSchemaRevision) {
    console.warn(
      chalk.red(
        'Warning: DB Schema revision mismatch detected!\n' +
          `Current revision: ${currentDbSchemaRevision}\n` +
          `Required revision: ${latestDbSchemaRevision}\n` +
          'Please run DB migration script.'
      )
    );
    process.exit(1);
  }

  const appOptions = patchedConfig.apiServer.options;

  if (appOptions.fixUser) {
    console.warn(chalk.red('WARNING: NO AUTHENTICATION MODE!'));
    console.warn(
      chalk.red(
        `CIRCUS API will start using ${appOptions.fixUser} as the fixed user!`
      )
    );
    logger.warn(
      `CIRCUS API will start using ${appOptions.fixUser} as the fixed user!`
    );
  }

  try {
    const koaApp = await loader.get('apiServer');
    koaApp.listen(appOptions.port, appOptions.host, (err?: Error) => {
      if (err) throw err;
      const setupInfo: { [key: string]: string | number } = {
        'Label storage': blobStorage.toString(),
        'DICOM storage': util.inspect(dicomFileRepository),
        'Plug-in results dir': appOptions.pluginResultsDir,
        'CORS origin': appOptions.corsOrigin,
        'Process ID': process.pid
      };
      logger.info('CIRCUS API started.');
      Object.keys(setupInfo).forEach(k => logger.info(`${k}: ${setupInfo[k]}`));
      Object.keys(setupInfo).forEach(k => console.log(`${k}: ${setupInfo[k]}`));
      console.log(
        chalk.green(`Server running on ${appOptions.host}:${appOptions.port}`)
      );
    });
  } catch (err) {
    console.error(chalk.red('Error during the server startup.'));
    console.error(err);
  }

  process.on('SIGINT', () => {
    console.log('CIRCUS API Server terminating...');
    logger.warn('Server terminating...');
    process.exit(0);
  });
};

main();
