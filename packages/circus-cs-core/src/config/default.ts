import path from 'path';
import os from 'os';
import { Configuration } from './Configuration';

const defaults: Configuration = {
  pluginWorkingDir: path.join(os.tmpdir(), 'circus-cs'),

  coreWorkingDir: '/var/circus/cs-core',

  pluginResultsDir: '/var/circus/plugin-results',
  cleanPluginWorkingDir: true,

  queue: {
    mongoUrl: 'mongodb://localhost:27017/circus-cs-core',
    collectionName: 'pluginJobQueue'
  },

  jobReporter: {
    mongoUrl: 'mongodb://localhost:27017/circus-api',
    collectionName: 'pluginJobs'
  },

  dicomFileRepository: {
    module: 'StaticDicomFileRepository',
    options: {
      dataDir: '/var/circus/dicom',
      useHash: false
    }
  },

  docker:
    process.platform === 'win32'
      ? {
          host: 'localhost',
          port: 2375
        }
      : {
          socketPath: '/var/run/docker.sock'
        },

  jobManager: {
    startOptions: {
      name: 'circus-cs-job-manager',
      cwd: path.join(__dirname, '..', '..'),
      output: path.join(__dirname, '..', '..', 'logs', 'daemon-pm2-output.log'),
      error: path.join(__dirname, '..', '..', 'logs', 'daemon-pm2-error.log')
    },
    checkQueueInterval: 1000
  },

  plugins: []
};

export default defaults;
