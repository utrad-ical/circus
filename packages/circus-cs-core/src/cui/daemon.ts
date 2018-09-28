import createDaemonController, {
  DaemonController
} from '../daemon/createDaemonController';
import { Configuration } from '../config/Configuration';

const printStatus = async (dc: DaemonController) => {
  const status = await dc.status();
  console.log(status);
};

export async function start(config: Configuration, argv: any) {
  const dc = createDaemonController(config);
  await dc.start();
  await printStatus(dc);
}

export async function stop(config: Configuration, argv: any) {
  const dc = createDaemonController(config);
  await dc.stop();
  await printStatus(dc);
}

export async function status(config: Configuration, argv: any) {
  const dc = createDaemonController(config);
  await printStatus(dc);
}

export async function pm2list(config: Configuration, argv: any) {
  const dc = createDaemonController(config);
  console.log(await dc.pm2list());
}

export async function pm2killall(config: Configuration, argv: any) {
  const dc = createDaemonController(config);
  await dc.pm2killall();
  console.log('OK');
}
