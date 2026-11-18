import { isContainerMode } from '@utrad-ical/circus-lib/config';
import path from 'path';
import os from 'os';
import type * as circus from '../interface.ts';

export const defaultMongoUrl = isContainerMode
  ? 'mongodb://mongo/circus-api'
  : 'mongodb://localhost:27017/circus-api';

const doodHostWorkingPath = isContainerMode
  ? process.env.DOOD_HOST_WORKING_PATH
  : undefined;

const defaults: circus.Configuration = {
  jobRunner: {
    options: {
      workingDirectory: isContainerMode
        ? '/var/circus/data/cs-tmp'
        : path.join(os.tmpdir(), 'circus-cs'),
      doodHostWorkingDirectory: doodHostWorkingPath
        ? path.join(doodHostWorkingPath, 'cs-tmp')
        : undefined,
      removeTemporaryDirectory: true
    }
  },

  queue: {
    type: 'MongoQueue',
    options: {
      mongoUrl: defaultMongoUrl,
      collectionName: 'pluginJobQueue'
    }
  },

  jobReporter: {
    type: 'MongoPluginJobReporter',
    options: {
      mongoUrl: defaultMongoUrl,
      collectionName: 'pluginJobs',
      resultsDirectory: isContainerMode
        ? '/var/circus/data/plugin-results'
        : '/var/circus/plugin-results'
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
        cwd: path.join(import.meta.dirname, '..', '..'),
        output: '/var/circus/data/logs/daemon-pm2-output.log',
        error: '/var/circus/data/logs/daemon-pm2-error.log'
      },
      checkQueueInterval: 1000
    }
  },

  pluginDefinitionAccessor: {
    type: 'MongoPluginDefinitionAccessor',
    options: {
      mongoUrl: defaultMongoUrl,
      collectionName: 'pluginDefinitions'
    }
  }
};

export default defaults;
