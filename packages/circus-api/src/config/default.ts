import path from 'path';

// We use cosmiconfig to manage settings.
// DO NOT DIRECTLY EDIT THIS FILE!!!

// Instead, make a configuration file
// named 'circus.config.js' (or any other file cosmiconfig recognizes)
// and specify the settings. Items in your setting file
// will be merged recursively.

export interface Configuration {
  [service: string]: {
    type?: string;
    options?: any;
  };
}

const defaults: Configuration = {
  app: {
    options: {
      host: 'localhost',
      port: 8080,
      pluginResultsDir: '/var/circus/plugin-results',
      dicomImageServerUrl: 'http://localhost:8080/rs',
      debug: false,
      uploadFileSizeMaxBytes: 200 * 1024 * 1024
    }
  },
  db: {
    options: { mongoUrl: 'mongodb://localhost:27017/circus-api' }
  },
  apiLogger: {
    type: 'FileLogger',
    options: {
      fileName: path.resolve(__dirname, '../../store/logs/circus-api')
    }
  },
  blobStorage: {
    type: 'LocalStorage',
    options: { root: '/var/circus/blobs' }
  },
  dicomTagReader: {
    options: {}
  },
  dicomImporter: {
    options: {
      compression: 'pass'
    }
  },
  dicomUtilityRunner: {
    options: {
      maxConcurrency: 4,
      dockerImage: 'circuscad/dicom_utility:2.0.0-beta3'
    }
  }
};

export default defaults;
