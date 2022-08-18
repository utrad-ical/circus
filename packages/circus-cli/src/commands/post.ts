import * as jsyaml from 'js-yaml';
import JSON5 from 'json5';
import { Readable } from 'node:stream';
import rawBody from 'raw-body';
import { fetchWithSpinner } from '../utils/createAuthorizedFetch.js';
import CommandAction from './CommandAction.js';

export interface SharedOptions {
  bin?: boolean;
  yaml?: boolean;
}

interface Options extends SharedOptions {
  put?: boolean;
  patch?: boolean;
}

const action: CommandAction = ({ getFetch }) => {
  return async (resource: string, options: Options) => {
    const { bin, yaml, put, patch } = options;
    const fetch = getFetch();

    if (put && patch)
      throw new Error("You cannot set both '-p' and '-P' flags");
    if (bin && yaml) throw new Error("You cannot set both '-b' and '-y' flags");

    const body = await (async () => {
      if (bin) {
        return process.stdin as Readable;
      } else {
        const inputStr = await rawBody(process.stdin, 'utf8');
        const data = yaml ? jsyaml.load(inputStr) : JSON5.parse(inputStr);
        return JSON.stringify(data);
      }
    })();

    console.log({ body });

    const method = put ? 'PUT' : patch ? 'PATCH' : 'POST';
    const verbStr = put ? 'Putting to' : patch ? 'Patching to' : 'Posting';
    const contentType = bin ? 'application/octet-stream' : 'application/json';

    const res = await fetchWithSpinner(
      fetch,
      `${verbStr} ${resource}`,
      resource,
      { method, headers: { 'Content-Type': contentType }, body }
    );

    if (res.ok) {
      console.log(
        `Request finished successfully. Status: ${res.status} ${res.statusText}`
      );
      if (res.headers.get('Content-Type')?.startsWith('application/json')) {
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
      }
    }
  };
};

export default action;
