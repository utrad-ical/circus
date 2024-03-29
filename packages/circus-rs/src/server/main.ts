import { ServiceLoader } from '@utrad-ical/circus-lib';
import config from './config';
import configureServiceLoader, { RsServices } from './configureServiceLoader';

const main = async () => {
  console.log('CIRCUS RS is starting up...');
  const loader = new ServiceLoader<RsServices>(config);
  configureServiceLoader(loader);
  const { port } = config.rsServer.options;
  const rsLogger = await loader.get('rsLogger');
  const app = await loader.get('rsServer');

  try {
    const server = app.listen(port, '0.0.0.0');
    server.on('listening', () => {
      const message = `Server running on port ${port}`;
      rsLogger.info(message);
      console.log(message);
    });
    server.on('close', async () => {
      await loader.dispose();
    });
  } catch (e) {
    console.error('Server failed to start');
    console.error(e);
    rsLogger.error(e);
    await loader.dispose();
    process.exit(1);
  }
};

main();
