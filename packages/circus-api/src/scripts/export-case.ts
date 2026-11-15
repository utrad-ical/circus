import { styleText } from 'node:util';
import fs from 'fs-extra';
import path from 'path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type Command from './Command.ts';
import type { MhdPacker } from '../case/createMhdPacker.ts';

export const help = () => {
  return (
    'Export a specified DB case data in the specified format.\n' +
    'Usage: circus export-case CASEID [CASEID ...]'
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

export const command: Command<{
  mhdPacker: MhdPacker;
}> = async (opts, { mhdPacker }) => {
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
        console.log(styleText('cyan', 'Exporting'), caseId);
        const prepared = await mhdPacker.prepare([{ caseId }], false);
        const stream = mhdPacker.pack(prepared, {
          fullOriginalVolume: false,
          compressionFormat: zip ? 'zip' : 'tgz',
          labelPackType: type,
          mhdLineEnding: 'lf'
        });
        await pipeline(
          Readable.fromWeb(stream as any),
          fs.createWriteStream(
            path.join(outDir, `${caseId}.${zip ? 'zip' : 'tar.gz'}`)
          )
        );
        console.log(styleText('green', 'Exported '), caseId);
      } catch (err: any) {
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

command.dependencies = ['mhdPacker'];
