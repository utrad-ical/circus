// Default configuration for the circus-api image.
//
// Values not specified here fall back to the defaults defined in each
// package (packages/*/src/config/default.ts).
// To customize, mount your own file at /var/circus/circus.config.js.

const mongoUrl =
  process.env.CIRCUS_MONGO_URL || 'mongodb://mongo:27017/circus-api';
const dataDir = '/var/circus/data';

module.exports = {
  database: {
    options: { mongoUrl }
  },
  apiServer: {
    options: {
      // URL of CIRCUS RS as seen from the browser
      dicomImageServerUrl:
        process.env.DICOM_IMAGE_SERVER_URL ||
        (process.env.LOCAL_HOST_IP
          ? `http://${process.env.LOCAL_HOST_IP}/rs`
          : 'http://localhost/rs')
    }
  },
  blobStorage: {
    options: { dataDir: `${dataDir}/labels` }
  },
  jobRunner: {
    options: {
      workingDirectory: `${dataDir}/cs-tmp`,
      // The same directory as seen from the Docker host
      doodHostWorkingDirectory: `${process.env.DOOD_HOST_WORKING_PATH}/cs-tmp`,
      removeTemporaryDirectory: true
    }
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
      resultsDirectory: `${dataDir}/plugin-results`
    }
  },
  dicomFileRepository: {
    type: 'StaticDicomFileRepository',
    options: { dataDir: `${dataDir}/dicom`, useHash: false }
  },
  csCoreDaemonLogger: {
    type: 'FileLogger',
    options: { fileName: `${dataDir}/logs/cscore-daemon` }
  },
  dicomTagReader: {
    options: {
      defaultTzOffset: 540 // Asia/Tokyo
    }
  }
};
