import JSZip from 'jszip';

export const packAsMhd = async ({ models, volumeProvider }, caseId) => {
  const caseData = await models.clinicalCase.findByIdOrFail(caseId);
  const zip = new JSZip();
  const rev = caseData.latestRevision;
  zip.file(`${caseId}.mhd`, 'file');
  zip.file(`${caseId}.json`, JSON.stringify(prepareExportObject(caseData)));
  for (let volId = 0; volId < rev.series.length; volId++) {
    const series = rev.series[volId];
    zip.file(`${volId}.vol`, 'volume data dummy');
    for (let labelId = 0; labelId < series.labels.length; labelId++) {
      //
    }
  }
  return zip.generateNodeStream();
};

const prepareExportObject = caseData => {
  return {
    caseId: caseData.caseId
  };
};
