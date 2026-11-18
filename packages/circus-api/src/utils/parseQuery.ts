export type QueryParameters = Record<string, string | string[] | undefined>;

const maxQueryParameters = 1000; // Matches the previous querystring parser.

export const parseQuery = (url: string): QueryParameters => {
  const query: QueryParameters = Object.create(null);
  const { searchParams } = new URL(url, 'http://localhost');
  let count = 0;
  for (const [key, value] of searchParams) {
    const previous = query[key];
    if (previous === undefined) query[key] = value;
    else if (Array.isArray(previous)) previous.push(value);
    else query[key] = [previous, value];
    if (++count === maxQueryParameters) break;
  }
  return query;
};
