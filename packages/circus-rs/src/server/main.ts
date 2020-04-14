import { Configuration } from './Configuration';
import prepareHelperModules, {
  disposeHelperModules
} from './helper/prepareHelperModules';
import createServer from './createServer';

const main = async () => {
  console.log('CIRCUS RS is starting up...');

  const config = require('./config').default as Configuration;
  const { port } = config.rsServer.options;
  const deps = await prepareHelperModules(config);
  const { rsLogger } = deps;
  const app = await createServer(config, deps);

  try {
    const server = app.listen(port, '0.0.0.0');
    server.on('listening', () => {
      const message = `Server running on port ${port}`;
      rsLogger.info(message);
      console.log(message);
    });
    server.on('close', async () => {
      // await disposeHelperModules(deps);
    });
  } catch (e) {
    console.error('Server failed to start');
    console.error(e);
    rsLogger.error(e);
    // await disposeHelperModules(deps);
    process.exit(1);
  }
};

main();
