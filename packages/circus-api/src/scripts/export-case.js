import connectDb from '../db/connectDb';
import createValidator from '../createValidator';
import createModels from '../db/createModels';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { createBlobStorage, createDicomFileRepository } from '../createApp';
import circusRs from '../circusRs';
import nullLogger from '@utrad-ical/circus-rs/src/server/helper/logger/NullLogger';

export const help = optionText => {
  console.log('Export a specified DB case data in the specified format.');
  console.log('Usage: node circus.js export-case CASEID [CASEID ...]');
  console.log(optionText);
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
    },
    {
      names: ['dicom-path'],
      env: 'CIRCUS_DICOM_DIR',
      type: 'string',
      default: './store/dicom'
    }
  ];
};

const writeStreamToFile = (file, stream) => {
  return new Promise((resolve, reject) => {
    const outStream = fs.createWriteStream(file);
    stream.pipe(outStream);
    outStream.on('finish', resolve);
    outStream.on('error', reject);
  });
};

export const exec = async options => {
  const {
    out: outDir = path.join(process.cwd(), 'case-exports'),
    type,
    blob_path: blobPath,
    dicom_path: dicomPath,
    continue: continueOnError = false,
    _args: caseIds
  } = options;

  if (!caseIds.length) {
    throw new Error('No case IDs specified.');
  }
  if (type !== 'mhd') {
    throw new Error("Currently the type argument must be 'mhd'.");
  }

  const { db, dbConnection } = await connectDb();
  const validator = await createValidator();
  const models = await createModels(db, validator);
  const { packAsMhd } = require('../case/packAsMhd');
  const blobStorage = await createBlobStorage(blobPath);
  const dicomFileRepository = await createDicomFileRepository(dicomPath);
  const logger = await nullLogger();
  const { volumeProvider } = await circusRs({ logger, dicomFileRepository });

  await fs.ensureDir(outDir);
  try {
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
  } finally {
    await dbConnection.close();
  }
};
