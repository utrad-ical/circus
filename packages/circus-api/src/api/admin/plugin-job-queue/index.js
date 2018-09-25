export const handleGet = ({ cs }) => {
  return async (ctx, next) => {
    const urlQuery = ctx.request.query;

    const limit = urlQuery.limit ? parseInt(urlQuery.limit, 10) : 20;
    const page = urlQuery.page ? parseInt(urlQuery.page, 10) : 1;

    const state = ['wait', 'processing', 'all'].some(
      state => state === urlQuery.state
    )
      ? urlQuery.state
      : undefined;

    const allItems = await cs.job.list(state);
    const items = allItems.slice(limit * (page - 1), limit * page);

    ctx.body = {
      items,
      page,
      totalItems: allItems.length
    };
  };
};
