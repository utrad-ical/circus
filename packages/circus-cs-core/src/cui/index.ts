import minimist from 'minimist';
import chalk from 'chalk';
import config from '../config';
import path from 'path';
import configureServiceLoader from '../configureServiceLoader';
import Command from './Command';
import { ServiceLoader } from '@utrad-ical/circus-lib';

const commands: { [key: string]: any } = {
  register: {
    help: 'Registers a new job.'
  },
  'list-queue': {
    help: 'Lists queue items.'
  },
  'list-plugins': {
    help: 'Lists available plug-ins.'
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
  },
  'run-plugin': {
    help: 'Run a plug-in directly without using any queue system.'
  },
  config: {
    help: 'Prints this current config.'
  }
};

async function boot(commandName: string | undefined, args: any) {
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

  const loader = configureServiceLoader(new ServiceLoader(config));
  const module: string = commands[commandName].module || commandName;
  loader.registerModule('command', path.join(__dirname, module));

  try {
    const callFunc = (await loader.get('command')) as Command;
    await callFunc(commandName, args);
    await loader.dispose();
  } catch (e) {
    console.log(chalk.red('Error:'));
    console.error(e);
    process.exit(1);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const commandName = argv.shift();
  const args = minimist(argv);

  await boot(commandName, args);
}

main();
