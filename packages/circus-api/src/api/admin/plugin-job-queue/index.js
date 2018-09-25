export const handleGet = ({ cs, models }) => {
  return async (ctx, next) => {
    const urlQuery = ctx.request.query;

    const limit = urlQuery.limit ? parseInt(urlQuery.limit, 10) : 20;
    const page = urlQuery.page ? parseInt(urlQuery.page, 10) : 1;

    const state = ['wait', 'processing', 'all'].some(
      state => state === urlQuery.state
    )
      ? urlQuery.state
      : undefined;

    const allQueueItems = await cs.job.list(state);
    const items = await Promise.all(
      allQueueItems
        .slice(limit * (page - 1), limit * page)
        .map(i => models.pluginJob.findByIdOrFail(i.jobId))
    );

    ctx.body = {
      items,
      page,
      totalItems: allQueueItems.length
    };
  };
};
