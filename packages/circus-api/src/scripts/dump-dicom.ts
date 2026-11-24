import type { Command } from 'commander';
import { runCommand, type CommandService } from './Command.ts';
import fs from 'node:fs/promises';
import type { DicomTagReader } from '../interface.ts';

export const configure = (program: Command) =>
  program
    .command('dump-dicom <file>')
    .description(
      'Print the contents of a DICOM file using the CIRCUS tag reader.'
    )
    .action((file: string) => runCommand(command, file));

export const command: CommandService<
  { dicomTagReader: DicomTagReader },
  string
> = async (_, { dicomTagReader }) => {
  return async file => {
    const buf = await fs.readFile(file);
    const result = await dicomTagReader(buf.buffer as ArrayBuffer);
    console.log(result);
  };
};

command.dependencies = ['dicomTagReader'];
