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

export const isPatientInfoInFilter = (filter: { [key: string]: any }) => {
  const checkKeyVal = (key: string, value: any) => {
    if (key === '$and' || key === '$or') {
      return value.some((item: object) => isPatientInfoInFilter(item));
    } else {
      return /^patientInfo/.test(key);
    }
  };

  if (Object.keys(filter).length === 0) return false;
  return Object.keys(filter).some(key => checkKeyVal(key, filter[key]));
};

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
  maxCount?: number;
}

interface AggregationResult {
  items: any[];
  totalItems: { count: number }[];
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
    transform,
    maxCount
  } = options;

  const result = (await model.aggregate([
    ...lookupStages,
    ...(filter ? [{ $match: filter }] : []),
    {
      $facet: {
        items: [
          ...(sort && Object.keys(sort).length >= 1 ? [{ $sort: sort }] : []),
          ...(skip ? [{ $skip: skip }] : []),
          ...(limit ? [{ $limit: limit }] : []),
          ...(modifyStages.length > 0 ? modifyStages : [{ $match: {} }])
        ],
        totalItems: [
          ...(maxCount ? [{ $limit: maxCount }] : []),
          { $count: 'count' }
        ]
      }
    }
  ])) as AggregationResult[];

  const totalItems = result[0].totalItems.length
    ? result[0].totalItems[0].count
    : 0;
  const items = transform ? result[0].items.map(transform) : result[0].items;
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
      sort: opts.sort ?? query.sort,
      skip: query.skip,
      limit: query.limit,
      transform: opts.transform,
      maxCount: opts.maxCount
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
  sort?: object;
  maxCount?: number;
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
