import arg from 'arg';
import inquirer from 'inquirer';
import { createCircusCadPlugin } from './main.mjs';

function parseArgumentsIntoOptions(rawArgs) {
  const args = arg(
    {
      '--install': Boolean,
      '-i': '--install'
    },
    {
      argv: rawArgs.slice(2)
    }
  );
  return {
    install: args['--install'] || false
  };
}

async function promptForMissingOptions(options) {
  const defaultTemplate = 'TypeScript';
  const questions = [];
  if (!options.install) {
    questions.push({
      type: 'confirm',
      name: 'install',
      message: 'Install dependencies',
      default: true
    });
  }

  const answers = await inquirer.prompt(questions);
  return {
    ...options,
    template: defaultTemplate,
    install: options.install || answers.install
  };
}

export async function cli(args) {
  let options = parseArgumentsIntoOptions(args);
  options = await promptForMissingOptions(options);
  await createCircusCadPlugin(options);
}
