import * as mongo from 'mongodb';

/**
 * PluginJobReporter takes responsibility of reporting the status
 * of the current job to some external source.
 */
export interface PluginJobReporter {
  report: (jobId: string, type: string, payload?: any) => Promise<void>;
}

/**
 * An implementation of pluginJobReporter that writes plugin status on
 * CIRCUS CS API server.
 * @param collection The MongoDB collection to which the plugin results and
 * status are written.
 */
export default function pluginJobReporter(
  collection: mongo.Collection
): PluginJobReporter {
  const report = async (jobId: string, type: string, payload?: any) => {
    console.log('Job Status', jobId, type);
    switch (type) {
      case 'processing':
      case 'finished':
      case 'error':
        await collection.updateOne({ jobId }, { $set: { status: type } });
        break;
      case 'results':
        await collection.updateOne(
          { jobId },
          { $set: { results: payload.results } }
        );
        break;
    }
  };
  return { report };
}
