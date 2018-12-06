import JSZip from 'jszip';

export const packAsMhd = async (deps, caseId) => {
  const zip = new JSZip();
  await putCaseData(deps, caseId, zip);
  return zip.generateNodeStream();
};

/**
 * Inserts a single case data into a root zip foler or a subdirectory.
 * @param {JSZip} zip The JSZip root object or a subdirectory made by `folder`
 */
const putCaseData = async ({ models, volumeProvider }, caseId, zip) => {
  const caseData = await models.clinicalCase.findByIdOrFail(caseId);
  const rev = caseData.latestRevision;
  zip.file(`${caseId}.mhd`, 'file');
  zip.file(`${caseId}.json`, JSON.stringify(prepareExportObject(caseData)));
  for (let volId = 0; volId < rev.series.length; volId++) {
    const series = rev.series[volId];
    const volumeAccessor = await volumeProvider(series.seriesUid);
    await volumeAccessor.load(volumeAccessor.images);
    zip.file(`${volId}.raw`, volumeAccessor.volume.data);
    for (let labelId = 0; labelId < series.labels.length; labelId++) {
      zip.file(`vol${volId}-label${labelId}.raw`, 'dummy label data');
    }
  }
};

const prepareExportObject = caseData => {
  return {
    caseId: caseData.caseId
  };
};
