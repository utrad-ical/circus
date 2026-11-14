import * as fs from 'node:fs';
import * as path from 'node:path';
import { Readable, type Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import createSpinner from '../utils/createSpinner.ts';
import type { CommandAction } from './CommandAction.ts';

const action: CommandAction = ({ getFetch }) => {
  return async (hashes: string[], options: { out?: string }) => {
    const fetch = getFetch();
    const { out } = options;

    if (!out && hashes.length > 1) {
      throw new Error('Must specify --out when downloading multiple blobs');
    }

    const download = async (hash: string, dest: Writable) => {
      const spinner = out
        ? createSpinner(`Downloading blob ${hash} to ${out}`)
        : null;
      try {
        const res = await fetch(`blob/${hash}`);
        await pipeline(Readable.fromWeb(res.body!), dest, {
          end: dest !== process.stdout
        });
        spinner?.stop(`Downloaded blob ${hash} to ${out}`);
      } catch (err: any) {
        spinner?.stop('error', true);
        throw err;
      }
    };

    if (out) {
      console.log(`Downloading ${hashes.length} blobs to ${out}...`);
      for (const hash of hashes) {
        await download(hash, fs.createWriteStream(path.resolve(out, hash)));
      }
    } else {
      await download(hashes[0], process.stdout);
    }
  };
};

export default action;
