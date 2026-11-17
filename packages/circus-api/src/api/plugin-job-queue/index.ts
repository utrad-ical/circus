import type { QueueState } from '@utrad-ical/circus-cs-core';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';

const parseQueryParam = (
  param: string | string[] | undefined,
  defaultValue: number
): number => {
  if (Array.isArray(param)) return parseInt(param[0], 10);
  if (typeof param === 'string') return parseInt(param, 10);
  return defaultValue;
};

/**
 * Creates the handler that returns the jobs in the queue,
 * only of the current user if `onlyMine` is set.
 */
export const createQueueHandler =
  (onlyMine: boolean): RouteMiddleware<typeof routes.getQueue> =>
  ({ cs, models }) =>
  async (ctx, next) => {
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

    // A queue item does not have the user, so read the jobs first
    const queueItems = await cs.job.list(state);
    const jobs = await Promise.all(
      queueItems.map(i => models.pluginJob.findByIdOrFail(i.jobId))
    );
    const myJobs = onlyMine
      ? jobs.filter(job => job.userEmail === ctx.user.userEmail)
      : jobs;

    ctx.body = {
      items: myJobs.slice(limit * (page - 1), limit * page),
      page,
      totalItems: myJobs.length
    };
  };

export const handleGet = createQueueHandler(true);
