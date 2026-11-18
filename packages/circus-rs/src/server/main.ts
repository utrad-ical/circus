import { createStdoutLogger, ServiceLoader } from '@utrad-ical/circus-lib';
import type { Logger } from '@utrad-ical/circus-lib';
import { ConfigLoadError } from '@utrad-ical/circus-lib/config';
import { once } from 'node:events';
import loadRsConfig from './config.ts';
import type { RsServices } from './configureServiceLoader.ts';
import configureServiceLoader from './configureServiceLoader.ts';

const main = async () => {
  let loader: ServiceLoader<RsServices> | undefined;
  let logger: Logger | undefined;

  try {
    const config = await loadRsConfig();
    loader = new ServiceLoader<RsServices>(config);
    configureServiceLoader(loader);
    logger = await loader.get('logger');
    logger.info('CIRCUS RS server starting');
    const { port } = config.rsServer.options;
    const server = await loader.get('rsServer');
    const listening = once(server, 'listening');
    server.listen(port, '0.0.0.0');
    await listening;
    const address = server.address();
    logger.info(
      { port: typeof address === 'object' ? address?.port : port },
      'CIRCUS RS server listening'
    );
    server.on('close', async () => {
      await loader?.dispose();
    });
  } catch (err) {
    const startupLogger = logger ?? createStdoutLogger('rs');
    startupLogger.error(
      { err },
      err instanceof ConfigLoadError
        ? err.message
        : 'CIRCUS RS server failed to start'
    );
    await loader?.dispose();
    process.exit(1);
  }
};

main();
