import status from 'http-status';
import { httpError } from '../../middleware/errorHandler.ts';
import { fetchAndLockAccessibleSeries } from '../../privilegeUtils.ts';
import type { RouteMiddleware } from '../../typings/middlewares.ts';
import generateUniqueId from '../../utils/generateUniqueId.ts';
import resolveAutoPvdOfSeries from '../../utils/resolveAutoPvdOfSeries.ts';
import type { postCase } from './routes.ts';

const createCase: RouteMiddleware<typeof postCase> = ({
  transactionManager,
  seriesOrientationResolver
}) => {
  return async (ctx, json) => {
    const body = ctx.req.valid('json');
    const { user, userPrivileges } = ctx.var;
    const caseId = await transactionManager.withTransaction(async models => {
      const project = await models.project.findByIdOrFail(body.projectId);
      const canWrite = userPrivileges.accessibleProjects.some(
        p => p.roles.includes('write') && p.projectId === project.projectId
      );
      if (!canWrite) {
        throw httpError(
          status.FORBIDDEN,
          'You do not have write privilege for this project.'
        );
      }

      const series = await resolveAutoPvdOfSeries(
        body.series,
        models,
        userPrivileges,
        seriesOrientationResolver
      );
      const caseId = generateUniqueId();
      const seriesData = await fetchAndLockAccessibleSeries(
        models,
        userPrivileges,
        series
      );
      const domains: Record<string, boolean> = {};
      seriesData.forEach(s => (domains[s.domain] = true));
      if (seriesData.slice(1).some(s => s.domain !== seriesData[0].domain)) {
        throw httpError(
          status.BAD_REQUEST,
          'All series must belong to the same domain.'
        );
      }

      const revision = {
        creator: user.userEmail,
        date: new Date(),
        description: 'Created new case.',
        attributes: {},
        status: 'draft',
        series: seriesData.map(s => ({
          seriesUid: s.seriesUid,
          partialVolumeDescriptor: s.partialVolumeDescriptor,
          labels: []
        }))
      };
      await models.clinicalCase.insert({
        caseId,
        projectId: project.projectId,
        tags: body.tags,
        latestRevision: revision,
        revisions: [revision],
        domains: Object.keys(domains)
      });
      return caseId;
    });
    return json({ caseId }, status.CREATED);
  };
};

export default createCase;
