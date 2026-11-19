import type { Command } from 'commander';
import generateUniqueId from '../utils/generateUniqueId.ts';
import { runCommand, type CommandService } from './Command.ts';

export const configure = (program: Command) =>
  program
    .command('ulid')
    .description('Generate and print a new ID.')
    .action(() => runCommand(command, undefined));

export const command: CommandService<{}> = async () => {
  return async () => {
    console.log(generateUniqueId());
  };
};
