import { DicomFileRepository } from '@utrad-ical/circus-lib';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { Writable } from 'stream';
import { Models } from '../interface';
import Command from './Command';
import Storage from '../storage/Storage';
import { VolumeProvider } from '@utrad-ical/circus-rs/src/server/helper/createVolumeProvider';
import { MhdPacker } from '../case/createMhdPacker';
import { EventEmitter } from 'events';
import { TaskEventEmitter } from '../createTaskManager';

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
      help: 'Export data format (isolated or combined).',
      helpArg: 'TYPE',
      type: 'string',
      default: 'isolated'
    },
    {
      names: ['zip'],
      help: 'Export as *.zip instead of *.tar.gz',
      type: 'bool'
    },
    {
      names: ['continue', 'c'],
      help: 'Do not stop on error.',
      type: 'bool'
    }
  ];
};

const waitForStream = (stream: Writable) => {
  return new Promise<void>((resolve, reject) => {
    const off = () => {
      stream.off('close', handleClose);
      stream.off('error', handleError);
    };
    const handleClose = () => {
      off();
      resolve();
    };
    const handleError = (err: Error) => {
      off();
      reject(err);
    };
    stream.on('close', handleClose);
    stream.on('error', handleError);
  });
};

export const command: Command<{
  models: Models;
  dicomFileRepository: DicomFileRepository;
  blobStorage: Storage;
  volumeProvider: VolumeProvider;
  mhdPacker: MhdPacker;
}> = async (opts, { models, blobStorage, volumeProvider, mhdPacker }) => {
  return async (options: any) => {
    const {
      out: outDir = path.join(process.cwd(), 'case-exports'),
      type = 'isolated',
      zip = false,
      continue: continueOnError = false,
      _args: caseIds
    } = options;

    if (!caseIds.length) {
      throw new Error('No case IDs specified.');
    }
    if (!['isolated', 'combined'].includes(type)) {
      throw new Error('Invalid export type.');
    }

    await fs.ensureDir(outDir);
    for (const caseId of caseIds) {
      try {
        console.log(chalk.cyan('Exporting'), caseId);
        const stream = fs.createWriteStream(
          path.join(outDir, `${caseId}.${zip ? 'zip' : 'tar.gz'}`)
        );
        const emitter: TaskEventEmitter = new EventEmitter();
        emitter.on('progress', message => console.log(message));
        emitter.on('error', message => console.log('Error:', message));
        mhdPacker.packAsMhd(emitter, stream, [caseId], {
          compressionFormat: zip ? 'zip' : 'tgz',
          labelPackType: type,
          mhdLineEnding: 'lf'
        });
        await waitForStream(stream);
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

command.dependencies = [
  'models',
  'dicomFileRepository',
  'volumeProvider',
  'blobStorage',
  'mhdPacker'
];
