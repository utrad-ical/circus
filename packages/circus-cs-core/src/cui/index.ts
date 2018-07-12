import * as minimist from 'minimist';
import chalk from 'chalk';

const commands: { [key: string]: any } = {
  register: {
    help: 'Registeres a new job.'
  },
  'list-queue': {
    help: 'Lists queue items.'
  },
  'check-env': {
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
  monitor: {
    help: 'Monitor job status.'
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
      console.log(`  ${chalk.cyan(key)}: ${commands[key].help}`)
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
    console.log(chalk.red('Error:'));
    console.error(e.message);
    process.exit(1);
  }
}

main();
