// main server bootstrapping

import dashdash from 'dashdash';
import createApp from './createApp';
import connectDb from './db/connectDb';
import chalk from 'chalk';
import * as path from 'path';
import createLogger from './createLogger';
import log4js from 'log4js';

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
    names: ['blob-path'],
    env: 'CIRCUS_API_BLOB_DIR',
    type: 'string',
    default: './store/blobs'
  },
  {
    names: ['dicom-path'],
    env: 'CIRCUS_API_DICOM_DIR',
    type: 'string',
    default: './store/dicom'
  }
];

const {
  debug,
  host,
  port,
  fix_user: fixUser,
  cors_origin: corsOrigin,
  blobPath,
  dicomPath
} = (() => {
  try {
    const parser = dashdash.createParser({ options });
    const opts = parser.parse(process.argv);
    if (opts.help) {
      console.log('Usage: node server.js [OPTIONS]');
      console.log('Options:\n' + parser.help({ includeEnv: true }));
      process.exit(0);
    }
    opts.blobPath = path.resolve(path.dirname(__dirname), opts.blob_path);
    opts.dicomPath = path.resolve(path.dirname(__dirname), opts.dicom_path);
    return opts;
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
})();

async function main() {
  // Establish db connection (shared throughout app)
  const db = await connectDb();
  const logger = createLogger('trace');

  if (fixUser) {
    console.warn(chalk.red('WARNING: NO AUTHENTICATION MODE!'));
    console.warn(
      chalk.red(`CIRCUS API will start using ${fixUser} as the fixed user!`)
    );
    logger.warn(`CIRCUS API will start using ${fixUser} as the fixed user!`);
  }

  const serverOptions = {
    debug: debug || process.env.NODE_ENV !== 'production',
    db,
    logger,
    fixUser,
    blobPath,
    dicomPath,
    corsOrigin
  };

  try {
    const koaApp = await createApp(serverOptions);
    koaApp.listen(port, host, err => {
      if (err) throw err;
      logger.info('CIRCUS API started.');
      logger.info(`Label path: ${blobPath}`);
      console.log(chalk.green(`Server running on port ${host}:${port}`));
      console.log(`  Label path: ${blobPath}`);
      console.log(`  DICOM path: ${dicomPath}`);
      console.log(`  CORS origin: ${corsOrigin}`);
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
}

main();
