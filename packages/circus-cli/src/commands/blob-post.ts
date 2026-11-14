import { promises as fs } from 'node:fs';
import { buffer } from 'node:stream/consumers';
import { fetchWithSpinner } from '../utils/createAuthorizedFetch.ts';
import sha1 from '../utils/sha1.ts';
import type { CommandAction } from './CommandAction.ts';

const action: CommandAction = ({ getFetch }) => {
  return async (files: string[]) => {
    const fetch = getFetch();

    const upload = async (data: Buffer, src: string) => {
      const hash = sha1(data);
      await fetchWithSpinner(
        fetch,
        `Uploading from ${src}, hash: ${hash}`,
        `blob/${hash}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: data
        }
      );
    };

    if (files.length === 0) {
      const data = await buffer(process.stdin);
      await upload(data, 'stdin');
    } else {
      for (const file of files) {
        const data = await fs.readFile(file);
        await upload(data, file);
      }
    }
  };
};

export default action;
