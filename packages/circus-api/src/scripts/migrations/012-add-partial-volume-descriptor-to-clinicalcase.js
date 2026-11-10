import * as mongo from 'mongodb';
import * as mr from 'multi-integer-range';

/**
 * @param {mongo.Db} db
 */
export async function up(db) {
  const cursor = await db.collection('clinicalCases').find({});
  while (await cursor.hasNext()) {
    const clinicalCaseDoc = await cursor.next();
    const caseId = clinicalCaseDoc.caseId;
    const newRevisions = [];
    let newLatestRevision;

    for (let revNo = 0; revNo < clinicalCaseDoc.revisions.length; revNo++) {
      const revision = clinicalCaseDoc.revisions[revNo];
      const newSeriesList = [];
      for (let volId = 0; volId < revision.series.length; volId++) {
        const series = revision.series[volId];
        let partialVolumeDescriptor = null;
        if (series.partialVolumeDescriptor) {
          partialVolumeDescriptor = series.partialVolumeDescriptor;
        } else {
          const seriesUid = series.seriesUid;
          const seriesDoc = await db
            .collection('series')
            .findOne({ seriesUid });
          const images = mr.initialize(seriesDoc.images);
          const start = mr.min(images);
          const end = mr.max(images);
          partialVolumeDescriptor = { start, end, delta: 1 };
        }
        newSeriesList.push({ ...series, partialVolumeDescriptor });
      }
      const newRevision = { ...revision, series: newSeriesList };
      newRevisions.push(newRevision);
      if (revNo === clinicalCaseDoc.revisions.length - 1) {
        newLatestRevision = newRevision;
      }
    }
    await db.collection('clinicalCases').updateOne(
      { caseId },
      {
        $set: {
          revisions: newRevisions,
          latestRevision: newLatestRevision
        }
      }
    );
  }
}
