import generateUniqueId from '../utils/generateUniqueId';
import duplicateJobExists from '../api/duplicateJobExists';
import { CsCore } from '@utrad-ical/circus-cs-core';
import { Models } from '../interface';
import { fetchAccessibleSeries, UserPrivilegeInfo } from '../privilegeUtils';
import status from 'http-status';

const makeNewPluginJob = async (
  models: Models,
  request: any,
  userPrivileges: UserPrivilegeInfo,
  userEmail: string,
  cs: CsCore,
  priority: any
) => {
  const force = request.force === true;
  const plugin = await models.plugin.findByIdOrFail(request.pluginId);

  try {
    if ((await duplicateJobExists(models, request)) && !force)
      throw new Error('There is a duplicate job that is already registered.');
    const seriesData = await fetchAccessibleSeries(
      models,
      userPrivileges,
      request.series
    );
    if (seriesData.slice(1).some(s => s.domain !== seriesData[0].domain))
      throw new Error('All series must belong to the same domain.');
  } catch (err) {
    err.status = status.BAD_REQUEST;
    err.expose = true;
    throw err;
  }

  const jobId = generateUniqueId();
  await cs.job.register(jobId, request, priority);
  await models.pluginJob.insert({
    jobId,
    pluginId: plugin.pluginId,
    series: request.series,
    userEmail,
    status: 'in_queue',
    errorMessage: null,
    results: null,
    startedAt: null,
    feedbacks: [],
    finishedAt: null
  });
  return jobId;
};

export default makeNewPluginJob;
