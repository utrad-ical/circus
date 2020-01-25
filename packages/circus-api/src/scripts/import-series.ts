import {
  MemoryDicomFileRepository,
  StaticDicomFileRepository
} from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import glob from 'glob-promise';
import * as path from 'path';
import { Models } from '../db/createModels';
import DicomImporter from '../DicomImporter';
import Command from './Command';

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

function bootstrapDicomImporter(models: Models) {
  if (!process.env.DICOM_UTILITY)
    throw new Error('DICOM_UTILITY env is not set');

  const dicomPath = process.env.CIRCUS_DICOM_DIR;
  const dicomRepository = dicomPath
    ? new StaticDicomFileRepository({ dataDir: dicomPath })
    : new MemoryDicomFileRepository({});

  return new DicomImporter(dicomRepository, models, {
    utility: process.env.DICOM_UTILITY
  });
}

const importSeries = async (
  models: Models,
  files: string[],
  domain: string
) => {
  const importer = bootstrapDicomImporter(models);

  const paths = files.map(p => path.resolve(process.cwd(), p));
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
      await importer.importFromFile(file, domain);
      count++;
    }
  }
  console.log(chalk.green('Import finished.'));
  console.log(`Imported ${count} file(s).`);
};

export const command: Command<{ models: Models }> = async (opt, { models }) => {
  return async (options: any) => {
    const domain = options.domain;
    if (!domain) throw new Error('Domain must be specified.');
    const files = options._args;
    if (!files.length) throw new Error('Import target must be specified.');
    await importSeries(models, files, domain);
  };
};

command.dependencies = ['models'];
