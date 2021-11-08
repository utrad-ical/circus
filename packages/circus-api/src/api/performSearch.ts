import status from 'http-status';
import { CollectionAccessor } from '../db/createCollectionAccessor';
import { CircusContext } from '../typings/middlewares';
import { isPlainObject } from 'lodash';
import { EJSON } from 'bson';

interface SearchQuery {
  sort: object;
  limit: number;
  page: number;
  skip: number;
}

export const extractFilter = (ctx: CircusContext) => {
  const urlQuery = ctx.request.query;
  try {
    return urlQuery.filter
      ? (EJSON.parse(
          Array.isArray(urlQuery.filter) ? urlQuery.filter[0] : urlQuery.filter
        ) as object)
      : {};
  } catch (err) {
    ctx.throw(status.BAD_REQUEST, 'Invalid JSON was passed as a filter string');
  }
};

/**
 * Parses URL parameter strings and add defaults if necessary.
 */
const extractSearchOptions = (
  ctx: CircusContext,
  defaultSort: object,
  allowUnlimited: boolean
) => {
  const urlQuery = ctx.request.query;

  const first = (query: string[] | string) =>
    Array.isArray(query) ? query[0] : query;

  let sort;
  if (urlQuery.sort) {
    try {
      sort = JSON.parse(first(urlQuery.sort));
    } catch (err) {
      ctx.throw(status.BAD_REQUEST, 'Bad sort parameter. Invalid JSON.');
    }
    if (!isPlainObject(sort)) {
      ctx.throw(status.BAD_REQUEST, 'Bad sort parameter. Non-object passed.');
    }
    if (Object.keys(sort).length > 5) {
      ctx.throw(status.BAD_REQUEST, 'Bad sort parameter. Too many sort keys.');
    }
    for (const k in sort) {
      if (sort[k] !== 1 && sort[k] !== -1) {
        ctx.throw(
          status.BAD_REQUEST,
          'Bad sort parameter. Invalid key/value pair.'
        );
      }
    }
  } else {
    sort = defaultSort;
  }

  const limit =
    allowUnlimited && 'unlimited' in urlQuery
      ? 9999
      : parseInt(first(urlQuery.limit ?? '20'), 10);
  if (limit > 200 && !allowUnlimited) {
    ctx.throw(
      status.BAD_REQUEST,
      'You cannot query more than 200 items at a time.'
    );
  }

  const page = parseInt(first(urlQuery.page || '1'), 10);
  const skip = limit * (page - 1);

  return { sort, limit, page, skip } as SearchQuery;
};

interface RunAggregationOptions {
  filter?: object;
  lookupStages?: object[];
  modifyStages?: object[];
  sort?: object;
  skip?: number;
  limit?: number;
  transform?: (data: any) => any;
}

export const runAggregation = async (
  model: CollectionAccessor,
  options: RunAggregationOptions
) => {
  const {
    filter,
    lookupStages = [],
    modifyStages = [],
    sort,
    skip,
    limit,
    transform
  } = options;
  const count = await model.aggregate([
    ...lookupStages,
    ...(filter ? [{ $match: filter }] : []),
    { $count: 'count' }
  ]);
  const totalItems = count.length ? (count[0].count as number) : 0;

  const rawItems = await model.aggregate([
    ...lookupStages,
    ...(filter ? [{ $match: filter }] : []),
    ...(sort && Object.keys(sort).length >= 1 ? [{ $sort: sort }] : []),
    ...(skip ? [{ $skip: skip }] : []),
    ...(limit ? [{ $limit: limit }] : []),
    ...modifyStages
  ]);

  const items = transform ? rawItems.map(transform) : rawItems;
  return { items, totalItems };
};

/**
 * Performs a search using Mongo's aggregation framework.
 * @param model The collection accessor that represents the main collection.
 * @param filter The filter object passed to a `$match` stage.
 * @param ctx The Koa context.
 * @param lookupStages Pipeline stages passed before `$match`.
 *   Used to "join" other collections or perform other preprocessing tasks.
 * @param modifyStages Pipeline stages passed after `$limit`, `$sort`, etc.
 *   Used to define the shape of the result array.
 * @param opts
 */
export const performAggregationSearch = async (
  model: CollectionAccessor,
  filter: object,
  ctx: CircusContext,
  lookupStages: object[],
  modifyStages: object[],
  opts: Options
) => {
  const { defaultSort, allowUnlimited = false } = opts;
  const query = extractSearchOptions(ctx, defaultSort, allowUnlimited);
  try {
    const { items, totalItems } = await runAggregation(model, {
      filter,
      lookupStages,
      modifyStages,
      sort: query.sort,
      skip: query.skip,
      limit: query.limit,
      transform: opts.transform
    });
    ctx.body = { items, totalItems, page: query.page };
  } catch (err: any) {
    if (err.code === 2) {
      ctx.throw(status.BAD_REQUEST, 'Invalid query');
    } else {
      throw err;
    }
  }
};

interface Options {
  transform?: (data: any) => any;
  allowUnlimited?: boolean;
  defaultSort: object;
}

const performSearch = async (
  model: CollectionAccessor,
  filter: object,
  ctx: CircusContext,
  opts: Options
) => {
  const { defaultSort, allowUnlimited = false, transform } = opts;
  const { sort, limit, page, skip } = extractSearchOptions(
    ctx,
    defaultSort,
    allowUnlimited
  );

  try {
    const rawResults = await model.findAll(filter, {
      limit,
      skip,
      sort
    });
    const totalItems = await model.findAsCursor(filter).count();
    const results = transform ? rawResults.map(transform) : rawResults;
    ctx.body = { items: results, totalItems, page };
  } catch (err: any) {
    if (err.code === 2) {
      ctx.throw(status.BAD_REQUEST, 'Invalid query');
    } else {
      throw err;
    }
  }
};

export default performSearch;
