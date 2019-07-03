import path from 'path';
import os from 'os';

// We use cosmiconfig to manage settings.
// DO NOT DIRECTLY EDIT THIS FILE!!!

// Instead, make a configuration file
// named 'circuscsrs.json' (or any other file cosmiconfig recognizes)
// and specify the settings. Items in your setting file
// will be merged recursively.

const defaults: circus.Configuration = {
  jobRunner: {
    options: {
      pluginWorkingDir: path.join(os.tmpdir(), 'circus-cs'),
      pluginResultsDir: '/var/circus/plugin-results',
      cleanPluginWorkingDir: true
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
      collectionName: 'pluginJobs'
    }
  },

  dicomFileRepository: {
    type: 'StaticDicomFileRepository',
    options: {
      dataDir: '/var/circus/dicom',
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
        output: path.join(
          __dirname,
          '..',
          '..',
          'logs',
          'daemon-pm2-output.log'
        ),
        error: path.join(__dirname, '..', '..', 'logs', 'daemon-pm2-error.log')
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
  }
};

export default defaults;
