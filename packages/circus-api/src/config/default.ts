// We use cosmiconfig to manage settings.
// DO NOT DIRECTLY EDIT THIS FILE!!!

// Instead, make a configuration file
// named 'circus.config.js' (or any other file cosmiconfig recognizes)
// and specify the settings. Items in your setting file
// will be merged recursively.

import os from 'os';

export interface Configuration {
  [service: string]: {
    type?: string;
    options?: any;
  };
}

export const dicomUtilityRunnerDockerImage =
  'circuscad/dicom_utility:2.0.0-beta3';

const defaults: Configuration = {
  apiServer: {
    options: {
      host: 'localhost',
      port: 8080,
      pluginResultsPath: '/var/circus/data/plugin-results',
      pluginCachePath: '/var/circus/data/plugin-cache',
      dicomImageServerUrl: 'http://localhost:8080/rs',
      debug: false,
      uploadFileSizeMaxBytes: 200 * 1024 * 1024
    }
  },
  database: {
    options: { mongoUrl: 'mongodb://localhost:27017/circus-api' }
  },
  apiLogger: {
    type: 'FileLogger',
    options: { fileName: '/var/circus/data/logs/circus-api' }
  },
  blobStorage: {
    type: 'LocalStorage',
    options: { dataDir: '/var/circus/data/labels' }
  },
  dicomTagReader: { options: {} },
  dicomImporter: {
    options: { compression: 'pass' }
  },
  dicomUtilityRunner: {
    options: {
      maxConcurrency: 3,
      dockerImage: dicomUtilityRunnerDockerImage
    }
  },
  taskManager: {
    options: {
      downloadFileDirectory: '/var/circus/data/downloads',
      timeoutMs: 60 * 60 * 1000 // 1 hour
    }
  },
  dicomExtractorWorker: {
    options: {
      // Controls the number of maximum threds to parse DICOM files.
      maxConcurrency: os.cpus().length
    }
  },
  authProvider: {
    type: 'DefaultAuthProvider'
  },
  oauthServer: {
    options: {
      fallbackToDefault: false
    }
  },
  transactionManager: {
    options: {
      maxCommitTimeMS: 10000
    }
  }
};

export default defaults;
