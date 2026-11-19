// main server bootstrapping

import { once } from 'node:events';
import { parseArgs } from 'node:util';
import { createStdoutLogger } from '@utrad-ical/circus-lib';
import type { Logger } from '@utrad-ical/circus-lib';
import { ConfigLoadError } from '@utrad-ical/circus-lib/config';
import merge from 'merge';
import type * as mongo from 'mongodb';
import loadApiConfig from './config/index.ts';
import createServiceLoader from './createServiceLoader.ts';
import scanMigrationFiles from './utils/scanMigrationFiles.ts';

const parsedArgs = (() => {
  try {
    const { values } = parseArgs({
      options: {
        help: { type: 'boolean', short: 'h' },
        host: { type: 'string', short: 'i' },
        port: { type: 'string', short: 'p' },
        'fix-user': { type: 'string', short: 'f' },
        debug: { type: 'boolean', short: 'd' }
      }
    });
    const portValue = values.port ?? process.env.PORT;
    if (portValue?.trim() === '') {
      throw new Error(
        `${values.port === undefined ? 'PORT' : '--port'} cannot be empty.`
      );
    }
    const port = portValue === undefined ? undefined : Number(portValue);
    if (Number.isNaN(port)) throw new Error('Port must be a number.');

    if (values.help) {
      console.log(`Usage: node server.ts [OPTIONS]

Options:
  -h, --help             Show this help and exit
  -i, --host <HOST>      Address to listen on (env: IP)
  -p, --port <PORT>      Port to listen on (env: PORT)
  -f, --fix-user <USER>  Skip authentication and use this user (env: CIRCUS_API_FIX_USER)
  -d, --debug            Enable debug endpoints`);
      process.exit(0);
    }
    return {
      host: values.host ?? process.env.IP,
      port,
      fixUser: values['fix-user'] ?? process.env.CIRCUS_API_FIX_USER,
      debug: values.debug
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${message.replace(/\.$/, '')}. See --help.`);
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
  let startupLogger: Logger | undefined;
  try {
    const patchedConfig = merge({}, await loadApiConfig());
    Object.keys(parsedArgs).forEach(k => {
      if ((parsedArgs as any)[k] !== undefined) {
        patchedConfig.apiServer.options[k] = (parsedArgs as any)[k];
      }
    });
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
      err instanceof ConfigLoadError
        ? err.message
        : 'CIRCUS API server failed to start'
    );
    process.exit(1);
  }
};

main();
