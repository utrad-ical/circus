import * as minimist from 'minimist';
import * as chalk from 'chalk';

const commands: { [key: string]: any } = {
  register: {
    help: 'Registeres a new job.'
  },
  list_queue: {
    help: 'Lists queue items.'
  },
  check_env: {
    help: 'Performs a system integrity check.'
  },
  start: {
    help: 'Starts the job manager.',
    module: './daemon'
  },
  stop: {
    help: 'Stops the job manager.',
    module: './daemon'
  },
  status: {
    help: 'Shows the status of the job manager.',
    module: './daemon'
  },
  pm2list: {
    help: 'Shows job manager process detail.',
    module: './daemon'
  },
  pm2killall: {
    help: 'Force-kills job manager processes.',
    module: './daemon'
  },
  help: {
    help: 'Prints this help message.'
  }
};

async function main() {
  const argv = process.argv.slice(2);
  const commandName = argv.shift();
  const args = minimist(argv);

  if (!commandName || commandName === 'help') {
    console.log('Available commands:');
    Object.keys(commands).forEach(key =>
      console.log(`  ${chalk.bold.cyan(key)}: ${commands[key].help}`)
    );
    return;
  }
  if (!(commandName in commands)) {
    console.error(`Unknown command: "${commandName}".`);
    return;
  }

  const command = commands[commandName];

  const callFunc: (args: any) => Promise<void> = command.module
    ? (await import(command.module))[commandName]
    : (await import(`./${commandName}`)).default;

  try {
    await callFunc(args);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
