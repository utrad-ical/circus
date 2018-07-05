import * as merge from 'merge';
import * as path from 'path';
import * as os from 'os';
import * as cosmiconfig from 'cosmiconfig';
import { DockerOptions } from 'dockerode';
import { StartOptions } from 'pm2';
import { PluginDefinition } from './interface';

interface MongoConnectionConfiguration {
  mongoUrl: string;
  collectionName: string;
}

export interface Configuration {
  /**
   * A path to the temporary directory used as a plugin working directory.
   */
  pluginWorkingDir: string;

  /**
   * A path to the directory where the job results are permanentlly stored.
   */
  pluginResultsDir: string;

  /**
   * Mongo Collection used as the job queue.
   */
  queue: MongoConnectionConfiguration;

  /**
   * Mongo Collection to which the job results are reported.
   */
  jobReporter: MongoConnectionConfiguration;

  /**
   * DICOM file repository is a loader that fetches the content of a DICOM file
   * specified by a series instance UID and an image number.
   */
  dicomFileRepository: {
    module: 'StaticDicomFileRepository';
    options: {
      dataDir: '/var/circus/dicom';
      useHash: false;
    };
  };

  /**
   * Parameters used by Dockerode to connect to Docker API.
   */
  docker: DockerOptions;

  /**
   * Job Manager settings.
   */
  jobManager: {
    startOptions: StartOptions;
    checkQueueInterval: number;
  };

  /**
   * List of plugins installed as Docker images.
   */
  plugins: PluginDefinition[];
}

const defaults: Configuration = {
  pluginWorkingDir: path.join(os.tmpdir(), 'circus-cs'),

  pluginResultsDir: '/var/circus/plugin-results',

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

const explorer = cosmiconfig('circuscs');
const result = explorer.searchSync() || { config: {} };
const config = merge.recursive({}, defaults, result.config) as Configuration;
export default config;
