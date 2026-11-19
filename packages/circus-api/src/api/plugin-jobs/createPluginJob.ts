import status from 'http-status';
import { httpError } from '../../middleware/errorHandler.ts';
import { fetchAndLockAccessibleSeries } from '../../privilegeUtils.ts';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import generateUniqueId from '../../utils/generateUniqueId.ts';
import resolveAutoPvdOfSeries from '../../utils/resolveAutoPvdOfSeries.ts';
import duplicateJobExists from '../duplicateJobExists.ts';
import type { postPluginJob } from './routes.ts';

const createPluginJob: RouteMiddleware<typeof postPluginJob> = ({
  transactionManager,
  cs,
  seriesOrientationResolver
}) => {
  return async (ctx, json) => {
    const { priority, pluginId, series, force } = ctx.req.valid('json');
    const { user, userPrivileges } = ctx.var;
    const canExecute = userPrivileges.accessiblePlugins.some(
      p => p.pluginId === pluginId && p.roles.includes('executePlugin')
    );
    if (!canExecute) {
      throw httpError(
        status.UNAUTHORIZED,
        'You do not have "executePlugin" privilege of this plugin.'
      );
    }
    const jobId = await transactionManager.withTransaction(async models => {
      const resolvedSeries = await resolveAutoPvdOfSeries(
        series,
        models,
        userPrivileges,
        seriesOrientationResolver
      );
      const request = { pluginId, series: resolvedSeries, force };
      const plugin = await models.plugin.findByIdOrFail(pluginId);

      const seriesData = await fetchAndLockAccessibleSeries(
        models,
        userPrivileges,
        resolvedSeries
      );
      if ((await duplicateJobExists(models, request)) && !force) {
        throw httpError(
          status.BAD_REQUEST,
          'There is a duplicate job that is already registered.'
        );
      }
      if (seriesData.slice(1).some(s => s.domain !== seriesData[0].domain)) {
        throw httpError(
          status.BAD_REQUEST,
          'All series must belong to the same domain.'
        );
      }

      const jobId = generateUniqueId();
      await cs.job.register(jobId, request, priority);
      await models.pluginJob.insert({
        jobId,
        pluginId: plugin.pluginId,
        series: resolvedSeries,
        userEmail: user.userEmail,
        status: 'in_queue',
        errorMessage: null,
        results: null,
        startedAt: null,
        feedbacks: [],
        finishedAt: null
      });
      return jobId;
    });
    return json({ jobId }, status.CREATED);
  };
};

export default createPluginJob;
