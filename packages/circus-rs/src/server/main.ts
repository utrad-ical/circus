import { createStdoutLogger, ServiceLoader } from '@utrad-ical/circus-lib';
import type { Logger } from '@utrad-ical/circus-lib';
import { once } from 'node:events';
import config from './config.ts';
import type { RsServices } from './configureServiceLoader.ts';
import configureServiceLoader from './configureServiceLoader.ts';

const main = async () => {
  const loader = new ServiceLoader<RsServices>(config);
  configureServiceLoader(loader);
  let logger: Logger | undefined;

  try {
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
      await loader.dispose();
    });
  } catch (err) {
    const startupLogger = logger ?? createStdoutLogger('rs');
    startupLogger.error({ err }, 'CIRCUS RS server failed to start');
    await loader.dispose();
    process.exit(1);
  }
};

main();
