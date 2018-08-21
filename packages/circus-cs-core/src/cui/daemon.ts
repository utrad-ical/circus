import { bootstrapDaemonController } from '../bootstrap';
import { DaemonController } from '../daemon/createDaemonController';

const printStatus = async (dc: DaemonController) => {
  const status = await dc.status();
  console.log(status);
};

export async function start(argv: any) {
  const dc = bootstrapDaemonController();
  await dc.start();
  await printStatus(dc);
}

export async function stop(argv: any) {
  const dc = bootstrapDaemonController();
  await dc.stop();
  await printStatus(dc);
}

export async function status(argv: any) {
  const dc = bootstrapDaemonController();
  await printStatus(dc);
}

export async function pm2list(argv: any) {
  const dc = bootstrapDaemonController();
  console.log(await dc.pm2list());
}

export async function pm2killall(argv: any) {
  const dc = bootstrapDaemonController();
  await dc.pm2killall();
  console.log('OK');
}
