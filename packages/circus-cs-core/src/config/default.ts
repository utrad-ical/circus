import path from 'path';
import os from 'os';
import * as circus from '../interface';

// We use cosmiconfig to manage settings.
// DO NOT DIRECTLY EDIT THIS FILE!!!

// Instead, make a configuration file
// named 'circus.config.js' (or any other file cosmiconfig recognizes)
// and specify the settings. Items in your setting file
// will be merged recursively.

const defaults: circus.Configuration = {
  jobRunner: {
    options: {
      workingDirectory: path.join(os.tmpdir(), 'circus-cs'),
      removeTemporaryDirectory: true
    }
  },

  queue: {
    type: 'MongoQueue',
    options: {
      mongoUrl: 'mongodb://localhost:27017/circus-api',
      collectionName: 'pluginJobQueue'
    }
  },

  jobReporter: {
    type: 'MongoPluginJobReporter',
    options: {
      mongoUrl: 'mongodb://localhost:27017/circus-api',
      collectionName: 'pluginJobs',
      resultsDirectory: '/var/circus/plugin-results'
    }
  },

  dicomFileRepository: {
    type: 'StaticDicomFileRepository',
    options: {
      dataDir: '/var/circus/data/dicom',
      useHash: false
    }
  },

  dockerRunner: {
    options:
      process.platform === 'win32'
        ? {
            host: 'localhost',
            port: 2375
          }
        : {
            socketPath: '/var/run/docker.sock'
          }
  },

  jobManager: {
    options: {
      startOptions: {
        name: 'circus-cs-job-manager',
        cwd: path.join(__dirname, '..', '..'),
        output: '/var/circus/data/logs/daemon-pm2-output.log',
        error: '/var/circus/data/logs/daemon-pm2-error.log'
      },
      checkQueueInterval: 1000
    }
  },

  pluginDefinitionAccessor: {
    type: 'MongoPluginDefinitionAccessor',
    options: {
      mongoUrl: 'mongodb://localhost:27017/circus-api',
      collectionName: 'pluginDefinitions'
    }
  },

  csCoreDaemonLogger: {
    type: 'FileLogger',
    options: {
      fileName: '/var/circus/data/logs/cscore-daemon'
    }
  }
};

export default defaults;
