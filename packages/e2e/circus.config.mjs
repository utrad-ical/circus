// CIRCUS configuration for the end-to-end tests, set via CIRCUS_CONFIG.
// Uses a database and directories of its own, not those of the dev servers.
import path from 'node:path';

const mongoUrl = process.env.E2E_MONGO_URL;
const dataDir = process.env.E2E_DATA_DIR;
if (!mongoUrl || !dataDir) {
  throw new Error('Run through the setup of the end-to-end tests');
}
const dir = name => path.join(dataDir, name);

export default {
  database: { options: { mongoUrl } },
  apiServer: {
    options: {
      host: '127.0.0.1',
      port: Number(process.env.E2E_API_PORT),
      pluginResultsPath: dir('plugin-results'),
      pluginCachePath: dir('plugin-cache')
    }
  },
  blobStorage: { options: { dataDir: dir('labels') } },
  dicomFileRepository: {
    type: 'StaticDicomFileRepository',
    options: { dataDir: dir('dicom'), useHash: false }
  },
  pluginDefinitionAccessor: {
    type: 'MongoPluginDefinitionAccessor',
    options: { mongoUrl, collectionName: 'pluginDefinitions' }
  },
  queue: {
    type: 'MongoQueue',
    options: { mongoUrl, collectionName: 'pluginJobQueue' }
  },
  jobReporter: {
    type: 'MongoPluginJobReporter',
    options: {
      mongoUrl,
      collectionName: 'pluginJobs',
      resultsDirectory: dir('plugin-results')
    }
  },
  jobRunner: { options: { workingDirectory: dir('cs-tmp') } }
};
