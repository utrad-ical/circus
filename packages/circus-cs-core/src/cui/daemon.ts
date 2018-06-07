import * as daemon from "../functions/daemon-ctl";

export async function start(argv: any) {
  await wrap(daemon.start);
  console.log("Started");
}

export async function stop(argv: any) {
  await wrap(daemon.stop);
  console.log("Stopped");
}

export async function status(argv: any) {
  await wrap(daemon.status);
}

export async function pm2list(argv: any) {
  await wrap(daemon.pm2list);
}

export async function pm2killall(argv: any) {
  await wrap(daemon.pm2killall);
  console.log("OK");
}

async function wrap(func: Function) {
  try {
    const result = await func();
    if (result) console.log(result);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
