import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import nullLogger from '@utrad-ical/circus-rs/src/server/helper/logger/NullLogger';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import stream from 'stream';
import circusRs from '../circusRs';
import { createBlobStorage } from '../createApp';
import { Models } from '../db/createModels';
import Command from './Command';

export const help = () => {
  return (
    'Export a specified DB case data in the specified format.\n' +
    'Usage: node circus.js export-case CASEID [CASEID ...]'
  );
};

export const options = () => {
  return [
    {
      names: ['out', 'o'],
      help: 'Output directory.',
      helpArg: 'DIR',
      type: 'string'
    },
    {
      names: ['type', 't'],
      help: 'Export data format (default=mhd).',
      helpArg: 'TYPE',
      type: 'string',
      default: 'mhd'
    },
    {
      names: ['continue', 'c'],
      help: 'Do not stop on error.',
      type: 'bool'
    },
    {
      names: ['blob-path'],
      env: 'CIRCUS_API_BLOB_DIR',
      type: 'string',
      default: './store/blobs'
    }
  ];
};

const writeStreamToFile = (file: string, stream: stream.Readable) => {
  return new Promise((resolve, reject) => {
    const outStream = fs.createWriteStream(file);
    stream.pipe(outStream);
    outStream.on('finish', resolve);
    outStream.on('error', reject);
  });
};

export const command: Command<{
  models: Models;
  dicomFileRepository: DicomFileRepository;
}> = async (opts, { models, dicomFileRepository }) => {
  return async (options: any) => {
    const {
      out: outDir = path.join(process.cwd(), 'case-exports'),
      type,
      blob_path: blobPath,
      continue: continueOnError = false,
      _args: caseIds
    } = options;

    if (!caseIds.length) {
      throw new Error('No case IDs specified.');
    }
    if (type !== 'mhd') {
      throw new Error("Currently the type argument must be 'mhd'.");
    }

    const { packAsMhd } = require('../case/packAsMhd');
    const blobStorage = await createBlobStorage(blobPath);
    const logger = (await nullLogger()) as any;
    const { volumeProvider } = await circusRs({ logger, dicomFileRepository });

    await fs.ensureDir(outDir);
    for (const caseId of caseIds) {
      try {
        console.log(chalk.cyan('Exporting'), caseId);
        const deps = {
          models,
          volumeProvider,
          blobStorage
        };
        const stream = await packAsMhd(deps, caseId);
        await writeStreamToFile(path.join(outDir, `${caseId}.zip`), stream);
        console.log(chalk.green('Exported '), caseId);
      } catch (err) {
        if (continueOnError) {
          console.error(err.message);
          continue;
        } else {
          throw err;
        }
      }
    }
  };
};

command.dependencies = ['models', 'dicomFileRepository'];
