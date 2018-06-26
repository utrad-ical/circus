import createDaemonController from './functions/createDaemonController';
import config from './config';

export default function bootstrapDaemonController() {
  const startOptions = config.daemon.startOptions;
  const controller = createDaemonController(startOptions);
  return controller;
}
