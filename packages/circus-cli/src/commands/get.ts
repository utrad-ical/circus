import { fetchWithSpinner } from '../utils/createAuthorizedFetch.js';
import CommandAction from './CommandAction.js';
import stringify from 'json-stringify-pretty-compact';

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
      const body = res.body!;
      body.pipe(process.stdout);
      await new Promise<void>((resolve, reject) => {
        body.on('error', reject);
        body.on('end', () => {
          process.stdout.write('\n');
          resolve();
        });
      });
    }
  };
};

export default action;
