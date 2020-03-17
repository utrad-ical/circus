import mongo from 'mongodb';
import { multirange } from 'multi-integer-range';

/**
 * @param {mongo.Db} db
 */
export async function up(db) {
  const cursor = await db.collection('pluginJobs').find({});
  while (await cursor.hasNext()) {
    const pluginJobDoc = await cursor.next();
    const jobId = pluginJobDoc.jobId;
    const newSeriesList = [];

    for (let volId = 0; volId < pluginJobDoc.series.length; volId++) {
      const seriesUid = pluginJobDoc.series[volId].seriesUid;
      let partialVolumeDescriptor = null;
      if (pluginJobDoc.series[volId].partialVolumeDescriptor) {
        partialVolumeDescriptor =
          pluginJobDoc.series[volId].partialVolumeDescriptor;
      } else {
        const seriesDoc = await db.collection('series').findOne({ seriesUid });
        if (!seriesDoc)
          throw new Error(
            `Series ${seriesUid} defined in job ${jobId} (volId #${volId}) was not found.`
          );
        const images = multirange(seriesDoc.images);
        const start = images.min();
        const end = images.max();
        partialVolumeDescriptor = { start, end, delta: 1 };
      }
      const series = { seriesUid, partialVolumeDescriptor };
      newSeriesList.push(series);
    }
    await db
      .collection('pluginJobs')
      .updateOne({ jobId }, { $set: { series: newSeriesList } });
  }
}
