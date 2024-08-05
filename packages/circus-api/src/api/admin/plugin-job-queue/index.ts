import { RouteMiddleware } from '../../../typings/middlewares';
import { QueueState } from '@utrad-ical/circus-cs-core';

export const handleGet: RouteMiddleware = ({ cs, models }) => {
  return async (ctx, next) => {
    const urlQuery = ctx.request.query;
    const limit = parseQueryParam(urlQuery.limit, 20);
    const page = parseQueryParam(urlQuery.page, 1);

    const stateParam = Array.isArray(urlQuery.state)
      ? urlQuery.state[0]
      : urlQuery.state;
    const state =
      stateParam && ['wait', 'processing', 'all'].includes(stateParam)
        ? (stateParam as QueueState | 'all')
        : undefined;

    const allQueueItems = (await cs.job.list(state)) as any[];
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

const parseQueryParam = (
  param: string | string[] | undefined,
  defaultValue: number
): number => {
  if (Array.isArray(param)) {
    return parseInt(param[0], 10);
  } else if (typeof param === 'string') {
    return parseInt(param, 10);
  }
  return defaultValue;
};
