import { fetchWithSpinner } from '../utils/createAuthorizedFetch.js';
import CommandAction from './CommandAction.js';
import { promises as fs } from 'node:fs';
import sha1 from '../utils/sha1.js';
import rawBody from 'raw-body';

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
      const data = await rawBody(process.stdin, { limit: '20mb' });
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
