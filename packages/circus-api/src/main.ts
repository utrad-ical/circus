// main server bootstrapping

import { once } from 'node:events';
import { createStdoutLogger } from '@utrad-ical/circus-lib';
import type { Logger } from '@utrad-ical/circus-lib';
import dashdash from 'dashdash';
import merge from 'merge';
import type * as mongo from 'mongodb';
import config from './config/index.ts';
import createServiceLoader from './createServiceLoader.ts';
import scanMigrationFiles from './utils/scanMigrationFiles.ts';

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
      console.log('Usage: node server.ts [OPTIONS]');
      console.log('Options:\n' + parser.help({ includeEnv: true }));
      process.exit(0);
    }
    return {
      host: opts.host,
      port: opts.port,
      fixUser: opts.fix_user,
      debug: opts.debug
    };
  } catch (err) {
    createStdoutLogger('api').error(
      { err },
      'Invalid server options. See --help.'
    );
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
  const patchedConfig = merge({}, config);
  Object.keys(parsedArgs).forEach(k => {
    if ((parsedArgs as any)[k] !== undefined) {
      patchedConfig.apiServer.options[k] = (parsedArgs as any)[k];
    }
  });

  let startupLogger: Logger | undefined;
  try {
    const loader = await createServiceLoader(patchedConfig);
    const logger = await loader.get('logger');
    startupLogger = logger;
    logger.info('CIRCUS API server starting');

    const database = await loader.get('database');
    const currentRevision = await getCurrentDbSchemaRevision(database.db);
    const requiredRevision = await getLatestDbSchemaRevision();
    if (currentRevision !== requiredRevision) {
      logger.error(
        { currentRevision, requiredRevision },
        'Database schema revision mismatch. Run the database migration script.'
      );
      process.exit(1);
    }

    const appOptions = patchedConfig.apiServer.options;
    if (appOptions.fixUser) {
      logger.warn('CIRCUS API is running with authentication disabled');
    }

    const server = await loader.get('apiServer');
    const listening = once(server, 'listening');
    server.listen(appOptions.port, appOptions.host);
    await listening;
    const address = server.address();
    logger.info(
      {
        host: appOptions.host,
        port: typeof address === 'object' ? address?.port : appOptions.port,
        labelStorage: patchedConfig.blobStorage?.type ?? 'MemoryStorage',
        dicomStorage:
          patchedConfig.dicomFileRepository?.type ??
          'StaticDicomFileRepository',
        pluginResultsDir: appOptions.pluginResultsPath,
        corsOrigin: appOptions.corsOrigin
      },
      'CIRCUS API server listening'
    );

    process.on('SIGINT', () => {
      logger.info('CIRCUS API server terminating');
      process.exit(0);
    });
  } catch (err) {
    (startupLogger ?? createStdoutLogger('api')).error(
      { err },
      'CIRCUS API server failed to start'
    );
    process.exit(1);
  }
};

main();
