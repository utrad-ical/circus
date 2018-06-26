import * as minimist from 'minimist';
import register from './register';
import list_queue from './list_queue';
import check_env from './check_env';
import { start, stop, status, pm2list, pm2killall } from './daemon';

const commands: { [key: string]: (argv: any) => Promise<void> } = {
  register,
  list_queue,
  check_env,
  start,
  stop,
  status,
  pm2list,
  pm2killall
};

async function main() {
  const argv = process.argv.slice(2);
  const command = argv.shift();
  const args = minimist(argv);
  const callFunc = command ? commands[command] : undefined;

  if (!callFunc) {
    if (command) {
      console.error(`"${command}" is not supported.`);
    } else {
      console.log('Available commands:');
      Object.keys(commands).forEach(i => console.log(' - ' + i));
    }
    return;
  }

  try {
    await callFunc(args);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
