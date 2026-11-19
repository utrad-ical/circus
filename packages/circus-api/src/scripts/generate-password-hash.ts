import type { Command } from 'commander';
import inquirer from 'inquirer';
import password from 'node-php-password';
import { runCommand, type CommandService } from './Command.ts';

export const configure = (program: Command) =>
  program
    .command('generate-password-hash')
    .description("Generate a hash compatible with PHP's password_hash().")
    .action(() => runCommand(command, undefined));

export const command: CommandService<{}> = async () => {
  return async () => {
    const res = await inquirer.prompt([
      {
        type: 'password',
        name: 'pwd1',
        message: 'Input raw password:'
      },
      {
        type: 'password',
        name: 'pwd2',
        message: 'Retype the same password'
      }
    ]);

    const { pwd1, pwd2 } = res;
    if (pwd1 !== pwd2) {
      throw new Error('Password mismatch.');
    }

    console.log(password.hash(pwd1));
  };
};
