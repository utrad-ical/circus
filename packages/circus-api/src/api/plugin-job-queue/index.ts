import type { QueueState } from '@utrad-ical/circus-cs-core';
import status from 'http-status';
import type { ParsedUrlQuery } from 'node:querystring';
import type {
  CircusContext,
  Deps,
  RouteMiddleware
} from '../../typings/middlewares.ts';
import type * as routes from './routes.ts';

const first = (param: string | string[] | undefined) =>
  Array.isArray(param) ? param[0] : param;

const positiveInt = (
  ctx: CircusContext,
  param: string | string[] | undefined,
  defaultValue: number
) => {
  const value = first(param);
  if (value === undefined) return defaultValue;
  if (!/^[1-9]\d*$/.test(value))
    ctx.throw(status.BAD_REQUEST, `Invalid number: ${value}`);
  return Number(value);
};

const states = ['wait', 'processing', 'all'];

/**
 * Returns a page of the jobs in the queue, in the order of the queue.
 * With `userEmail`, only the jobs of that user are included.
 */
export const listQueuedJobs = async (
  { cs, models }: Pick<Deps, 'cs' | 'models'>,
  ctx: CircusContext,
  userEmail?: string
) => {
  const query: ParsedUrlQuery = ctx.request.query;
  const limit = positiveInt(ctx, query.limit, 20);
  const page = positiveInt(ctx, query.page, 1);
  const state = first(query.state);
  if (state !== undefined && !states.includes(state))
    ctx.throw(status.BAD_REQUEST, `Invalid state: ${state}`);

  const queueItems = await cs.job.list(state as QueueState | 'all');
  const ids = queueItems.map(i => i.jobId);
  // A queue item does not have the user, so all the items are read
  // to find the jobs of the user
  const docs = await models.pluginJob.findAll({
    jobId: {
      $in: userEmail ? ids : ids.slice(limit * (page - 1), limit * page)
    },
    ...(userEmail ? { userEmail } : {})
  });
  const byId = new Map(docs.map(job => [job.jobId, job]));
  const jobs = ids.flatMap(id => byId.get(id) ?? []);
  return userEmail
    ? {
        items: jobs.slice(limit * (page - 1), limit * page),
        page,
        totalItems: jobs.length
      }
    : { items: jobs, page, totalItems: ids.length };
};

export const handleGet: RouteMiddleware<typeof routes.getQueue> = deps => {
  return async (ctx, next) => {
    ctx.body = await listQueuedJobs(deps, ctx, ctx.user.userEmail);
  };
};
