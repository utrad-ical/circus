import { Configuration } from './Configuration';
import prepareHelperModules, { disposeHelperModules } from './helper/prepareHelperModules';
import createServer from './createServer';

async function main(): Promise<void> {
  console.log('CIRCUS RS is starting up...');

  const config = require('./config').default as Configuration;
  const { port } = config;
  const modules = await prepareHelperModules(config);
  const { logger } = modules;
  const app = createServer(config, modules);

  try {
    const server = app.listen(port, '0.0.0.0');
    server.on('listening', () => {
      const message = `Server running on port ${port}`;
      logger.info(message);
      console.log(message);
    });
    server.on('close', async () => {
      await disposeHelperModules(modules);
    });
  } catch (e) {
    console.error('Server failed to start');
    console.error(e);
    logger.error(e);
    await disposeHelperModules(modules);
    process.exit(1);
  }
}

main();
