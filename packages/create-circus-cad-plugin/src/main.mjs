// reference: https://www.twilio.com/blog/how-to-build-a-cli-with-node-js
import chalk from 'chalk';
import fs from 'fs';
import ncp from 'ncp';
import path from 'path';
import { promisify } from 'util';
import Listr from 'listr';
import { execa } from 'execa';

const access = promisify(fs.access);
const copy = promisify(ncp);

async function copyTemplateFiles(options) {
  return copy(options.templateDirectory, options.targetDirectory, {
    clobber: false
  });
}

async function installDependencies(directory) {
  try {
    await execa('npm', ['install'], { cwd: directory });
    console.log(chalk.green.bold('Dependencies installed successfully.'));
  } catch (error) {
    console.error(chalk.red.bold('Failed to install dependencies:'), error);
    process.exit(1);
  }
}

export async function createCircusCadPlugin(options) {
  options = {
    ...options,
    targetDirectory: options.targetDirectory || process.cwd()
  };

  const currentFileUrl = import.meta.url;
  const templateDir = path.resolve(
    new URL(currentFileUrl).pathname,
    '../../templates',
    options.template.toLowerCase()
  );
  options.templateDirectory = templateDir;

  try {
    await access(templateDir, fs.constants.R_OK);
  } catch (err) {
    console.error('%s Invalid template name', chalk.red.bold('ERROR'));
    process.exit(1);
  }

  const tasks = new Listr([
    {
      title: 'Copy project files',
      task: () => copyTemplateFiles(options)
    },
    {
      title: 'Install dependencies',
      task: () => installDependencies(options.targetDirectory),
      enabled: () => options.install
    }
  ]);

  await tasks.run();

  console.log('%s Project ready', chalk.green.bold('Done'));
  return true;
}
