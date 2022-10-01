const mongoUrl = "mongodb://localhost:27017/circus-api";
const pluginResultsDir = "/var/circus/data/plugin-results";
const path = require("path");
const os = require("os");

module.exports = {
  database: {
    options: { mongoUrl },
  },
  apiServer: {
    options: {
      pluginResultsDir,
      dicomImageServerUrl: "http://" + process.env.LOCAL_HOST_IP + "/rs",
    },
  },
  rsServer: {
    // Used when CIRCUS RS is invoked as a standalone image server
    options: {
      // port: 8080,
      // authorization: { enabled: true }
    },
  },
  blobStorage: {
    options: { dataDir: "/var/circus/data/labels" },
  },
  jobRunner: {
    options: {
      workingDirectory: "/var/circus/data/cs-tmp",
      doodHostWorkingDirectory: process.env.DOOD_HOST_WORKING_PATH + "/cs-tmp",
      removeTemporaryDirectory: false,
    },
  },
  pluginDefinitionAccessor: {
    type: "MongoPluginDefinitionAccessor",
    options: { mongoUrl, collectionName: "pluginDefinitions" },
  },
  queue: {
    type: "MongoQueue",
    options: { mongoUrl, collectionName: "pluginJobQueue" },
  },
  jobReporter: {
    type: "MongoPluginJobReporter",
    options: {
      mongoUrl,
      collectionName: "pluginJobs",
      resultsDirectory: "/var/circus/data/plugin-results",
    },
  },
  dicomFileRepository: {
    type: "StaticDicomFileRepository",
    options: { dataDir: "/var/circus/data/dicom", useHash: false },
  },
  csCoreDaemonLogger: {
    type: "FileLogger",
    options: { fileName: "/var/circus/data/logs/cscore-daemon" },
  },
  dicomTagReader: {
    options: {
      defaultTzOffset: 540, // Timezone offset of Asia/Tokyo
    },
  },
};
