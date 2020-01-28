// main server bootstrapping

import chalk from 'chalk';
import dashdash from 'dashdash';
import log4js from 'log4js';
import mongo from 'mongodb';
import path from 'path';
import createApp from './createApp';
import createServiceLoader from './createServiceLoader';
import scanMigrationFiles from './utils/scanMigrationFiles';
import config from './config';
import util from 'util';

const options = [
  {
    names: ['help', 'h'],
    type: 'bool',
    help: 'print this help and exit'
  },
  {
    names: ['host', 'i'],
    env: 'IP',
    type: 'string',
    helpArg: 'HOST',
    help: 'IP address to listen to (default: localhost)',
    default: 'localhost'
  },
  {
    names: ['fix-user', 'f'],
    env: 'CIRCUS_API_FIX_USER',
    type: 'string',
    help: 'Skip authentication and use this user as the current user',
    default: false
  },
  {
    names: ['port', 'p'],
    env: 'PORT',
    type: 'number',
    helpArg: 'PORT',
    help: 'port (default: 8080)',
    default: 8080
  },
  {
    names: ['cors-origin', 'o'],
    env: 'CIRCUS_API_CORS_ALLOW_ORIGIN',
    type: 'string',
    help: 'Accept CORS origin'
  },
  {
    names: ['debug', 'd'],
    type: 'bool',
    help: 'force debug mode'
  },
  {
    names: ['dicom-image-server-url'],
    env: 'DICOM_IMAGE_SERVER_URL',
    type: 'string',
    default: 'http://localhost:8080/rs'
  }
];

const {
  debug,
  host,
  port,
  fix_user: fixUser,
  cors_origin: corsOrigin,
  dicom_image_server_url: dicomImageServerUrl
} = (() => {
  try {
    const parser = dashdash.createParser({ options });
    const opts = parser.parse(process.argv);
    if (opts.help) {
      console.log('Usage: node server.js [OPTIONS]');
      console.log('Options:\n' + parser.help({ includeEnv: true }));
      process.exit(0);
    }
    return opts;
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
  const serverOptions = {
    debug: debug || process.env.NODE_ENV !== 'production',
    fixUser,
    pluginResultsPath: config.jobReporter.options.pluginResultsDir,
    corsOrigin,
    dicomImageServerUrl
  };

  const loader = await createServiceLoader(config);
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
  }

  if (fixUser) {
    console.warn(chalk.red('WARNING: NO AUTHENTICATION MODE!'));
    console.warn(
      chalk.red(`CIRCUS API will start using ${fixUser} as the fixed user!`)
    );
    logger.warn(`CIRCUS API will start using ${fixUser} as the fixed user!`);
  }

  try {
    const koaApp = await createApp(serverOptions, loader);
    koaApp.listen(port, host, (err?: Error) => {
      if (err) throw err;
      const setupInfo: { [key: string]: string | number } = {
        'Label storage': blobStorage.toString(),
        'DICOM storage': util.inspect(dicomFileRepository),
        'Plug-in results path': serverOptions.pluginResultsPath,
        'CORS origin': corsOrigin,
        'Process ID': process.pid
      };
      logger.info('CIRCUS API started.');
      Object.keys(setupInfo).forEach(k => logger.info(`${k}: ${setupInfo[k]}`));
      Object.keys(setupInfo).forEach(k => console.log(`${k}: ${setupInfo[k]}`));
      console.log(chalk.green(`Server running on port ${host}:${port}`));
    });
  } catch (err) {
    console.error(chalk.red('Error during the server startup.'));
    console.error(err);
  }

  process.on('SIGINT', () => {
    console.log('CIRCUS API Server terminating...');
    logger.warn('Server terminating...');
    log4js.shutdown(err => {
      if (err) console.error('Logger shutdown failed', err);
      process.exit(err ? 1 : 0);
    });
  });
};

main();
