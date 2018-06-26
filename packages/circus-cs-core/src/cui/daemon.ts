import * as daemon from '../functions/daemon-ctl';

export async function start(argv: any) {
  await callAndPrint(daemon.start);
  console.log('Started');
}

export async function stop(argv: any) {
  await callAndPrint(daemon.stop);
  console.log('Stopped');
}

export async function status(argv: any) {
  await callAndPrint(daemon.status);
}

export async function pm2list(argv: any) {
  await callAndPrint(daemon.pm2list);
}

export async function pm2killall(argv: any) {
  await callAndPrint(daemon.pm2killall);
  console.log('OK');
}

async function callAndPrint(func: Function) {
  const result = await func();
  if (result) console.log(result);
}
