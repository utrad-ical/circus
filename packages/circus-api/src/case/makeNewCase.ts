import generateUniqueId from '../utils/generateUniqueId';
import { fetchAccessibleSeries, UserPrivilegeInfo } from '../privilegeUtils';
import { Models } from '../interface';
import { SeriesEntry } from '../typings/circus';

const makeNewCase = async (
  models: Models,
  user: any,
  userPrivileges: UserPrivilegeInfo,
  project: any,
  series: SeriesEntry[],
  tags: string[]
) => {
  const caseId = generateUniqueId();

  const domains: { [domain: string]: boolean } = {};

  // Check write access for the project.
  const ok = userPrivileges.accessibleProjects.some(
    p => p.roles.indexOf('write') >= 0 && p.projectId === project.projectId
  );
  if (!ok) {
    throw new Error('You do not have write privilege for this project.');
  }

  const seriesData = await fetchAccessibleSeries(
    models,
    userPrivileges,
    series
  );
  seriesData.forEach(i => (domains[i.domain] = true));

  if (seriesData.slice(1).some(s => s.domain !== seriesData[0].domain)) {
    const error = new Error('All series must belong to the same domain.');
    error.status = 400;
    throw error;
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
    tags,
    latestRevision: revision,
    revisions: [revision],
    domains: Object.keys(domains)
  });
  return caseId;
};

export default makeNewCase;
