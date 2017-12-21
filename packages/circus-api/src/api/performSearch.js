import status from 'http-status';

export default async function performSearch(model, filter, ctx, opts = {}) {
  const urlQuery = ctx.request.query;
  const { defaultSort = {}, transform } = opts;

  let sort;
  if (urlQuery.sort) {
    try {
      sort = JSON.parse(urlQuery.sort);
    } catch (err) {
      ctx.throw(status.BAD_REQUEST, 'Bad sort parameter. Invalid JSON.');
    }
    if (typeof sort !== 'object' || sort === null) {
      ctx.throw(status.BAD_REQUEST, 'Bad sort parameter. Non-object passed.');
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

  const limit = parseInt(urlQuery.limit || '20', 10);
  if (limit > 200) {
    ctx.throw(
      status.BAD_REQUEST,
      'You cannot query more than 200 items at a time.'
    );
  }

  const page = parseInt(urlQuery.page || '1', 10);
  const skip = limit * (page - 1);

  try {
    const rawResults = await model.findAll(filter, { limit, skip, sort });
    const totalItems = await model.findAsCursor(filter).count();
    const results = transform ? rawResults.map(transform) : rawResults;
    ctx.body = {
      items: results,
      totalItems,
      page
    };
  } catch (err) {
    if (err.code === 2) {
      ctx.throw(status.BAD_REQUEST, 'Invalid query');
    } else {
      throw err;
    }
  }
}
