import chalk from 'chalk';
import * as path from 'path';
import { DicomImporter } from '../createDicomImporter';
import Command from './Command';
import directoryIterator from '../utils/directoryIterator';

export const help = () => {
  return (
    'Imports DICOM series from file/directory.\n' +
    'Usage: node circus.js import-series --domain=DOMAIN [target...]'
  );
};

export const options = () => {
  return [
    {
      names: ['domain', 'd'],
      help: 'Import domain.',
      helpArg: 'DOMAIN',
      type: 'string'
    }
  ];
};

export const command: Command<{
  dicomImporter: DicomImporter;
}> = async (opt, { dicomImporter }) => {
  return async (options: any) => {
    const domain = options.domain;
    if (!domain) throw new Error('Domain must be specified.');
    const files = options._args;
    if (!files.length) throw new Error('Import target must be specified.');
    const paths = files.map((p: string) => path.resolve(process.cwd(), p));
    if (!paths.length) {
      console.log(chalk.red('No file or directory specified.'));
      return;
    }

    let count = 0;
    for (const pathArg of paths) {
      try {
        for await (const entry of directoryIterator(pathArg)) {
          if (entry.type === 'fs') {
            console.log(`Importing: ${entry.name}`);
          } else {
            console.log(`Importing ${entry.name} in ${entry.zipName}`);
          }
          await dicomImporter.importDicom(entry.buffer, domain);
          count++;
        }
      } catch (err) {
        const message =
          err.code === 'ENOENT'
            ? `${pathArg} is not a file nor a directory.`
            : `Error while trying to access ${pathArg}.`;
        console.error(chalk.red(message));
        continue;
      }

      console.log(chalk.green('Import finished.'));
      const fStr = count === 1 ? 'file' : 'files';
      console.log(`Imported ${count} ${fStr}.`);
    }
  };
};

command.dependencies = ['dicomImporter'];
