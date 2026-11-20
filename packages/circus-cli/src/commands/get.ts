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
    const { query: queries = [] } = option;
    const pretty = option.pretty && process.stdout.isTTY;

    if (queries.length) {
      const queryStr = queries
        .map(q => {
          const i = q.indexOf('=');
          if (i < 0) throw new Error(`Invalid query (must be key=value): ${q}`);
          return `${q.slice(0, i)}=${encodeURIComponent(q.slice(i + 1))}`;
        })
        .join('&');
      resource += (resource.includes('?') ? '&' : '?') + queryStr;
    }

    const fetch = getFetch();

    const res = pretty
      ? await fetchWithSpinner(fetch, `Fetching ${resource}`, resource)
      : await fetch(resource);
    if (res.body === null) return;

    if (
      pretty &&
      res.headers.get('content-type')?.startsWith('application/json')
    ) {
      const json = await res.json();
      process.stdout.write(stringify(json) + '\n');
    } else {
      await pipeline(Readable.fromWeb(res.body), process.stdout, {
        end: false
      });
      // Keep piped or redirected output byte-for-byte
      if (process.stdout.isTTY) process.stdout.write('\n');
    }
  };
};

export default action;
