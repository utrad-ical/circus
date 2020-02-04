import chalk from 'chalk';
import * as fs from 'fs-extra';
import glob from 'glob-promise';
import * as path from 'path';
import { DicomImporter } from '../createDicomImporter';
import Command from './Command';
import zipIterator from '../utils/zipIterator';

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
      let stat;
      try {
        stat = await fs.stat(pathArg);
      } catch (err) {
        const message =
          err.code === 'ENOENT'
            ? `${pathArg} is not a file nor a directory.`
            : `Error while trying to access ${pathArg}.`;
        console.error(chalk.red(message));
        continue;
      }
      let files: string[];
      if (stat.isFile()) {
        files = [pathArg];
      } else if (stat.isDirectory()) {
        files = await glob(path.join(pathArg, '**/*.dcm'));
      }
      for (const file of files!) {
        console.log(`Importing: ${file}`);
        const fileContent = await fs.readFile(file);

        const isZip =
          fileContent
            .slice(0, 4)
            .compare(new Uint8Array([0x50, 0x4b, 0x03, 0x04])) === 0;

        if (isZip) {
          const zip = zipIterator(fileContent, /./);
          for await (const fileInZip of zip) {
            await dicomImporter.importDicom(fileInZip, domain);
            count++;
          }
        } else {
          // Import as a regular file
          await dicomImporter.importDicom(fileContent.buffer, domain);
          count++;
        }
      }

      console.log(chalk.green('Import finished.'));
      console.log(`Imported ${count} file(s).`);
    }
  };
};

command.dependencies = ['dicomImporter'];
