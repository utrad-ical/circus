import stringify from 'json-stringify-pretty-compact';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fetchWithSpinner } from '../utils/createAuthorizedFetch.ts';
import type { CommandAction } from './CommandAction.ts';

interface Options {
  pretty: boolean;
  query: string[];
}

const action: CommandAction = ({ getFetch }) => {
  return async (resource: string, option: Options) => {
    const { pretty, query: queries = [] } = option;

    if (queries.length) {
      const queryStr = queries
        .map(q => {
          const [key, value] = q.split('=', 2);
          return `${key}=${encodeURIComponent(value)}`;
        })
        .join('&');
      resource += (resource.includes('?') ? '&' : '?') + queryStr;
    }

    const fetch = getFetch();

    const res = pretty
      ? await fetchWithSpinner(fetch, `Fetching ${resource}`, resource)
      : await fetch(resource);

    if (
      process.stdout.isTTY &&
      res.headers.get('content-type')?.startsWith('application/json') &&
      pretty
    ) {
      const json = await res.json();
      process.stdout.write(stringify(json) + '\n');
    } else {
      await pipeline(Readable.fromWeb(res.body!), process.stdout, {
        end: false
      });
      process.stdout.write('\n');
    }
  };
};

export default action;
