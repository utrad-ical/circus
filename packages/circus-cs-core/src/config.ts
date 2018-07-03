import * as merge from 'merge';
import * as path from 'path';
import * as os from 'os';
import { Configuration } from './interface';

const defaults: Configuration = {
  pluginWorkingDir: path.join(os.tmpdir(), 'circus-cs'),

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
      cwd: path.join(__dirname, '..'),
      output: path.join(__dirname, '..', 'logs', 'daemon-pm2-output.log'),
      error: path.join(__dirname, '..', 'logs', 'daemon-pm2-error.log')
    },
    checkQueueInterval: 1000
  },

  plugins: []
};

const cosmiconfig = require('cosmiconfig');
const explorer = cosmiconfig('circuscs');
const result = explorer.searchSync() || {};

const config = merge.recursive({}, defaults, result.config) as Configuration;
export default config;
