import * as fs from 'node:fs';
import { Writable } from 'node:stream';
import createSpinner from '../utils/createSpinner.js';
import CommandAction from './CommandAction.js';
import * as path from 'node:path';

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
        const stream = res.body!;
        await new Promise((resolve, reject) => {
          dest.on('error', reject);
          dest.on('close', resolve);
          stream.pipe(dest);
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
