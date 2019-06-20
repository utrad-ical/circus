import { DockerOptions } from 'dockerode';
import { StartOptions } from 'pm2';
import { PluginDefinition } from '../interface';

interface MongoConnectionConfiguration {
  mongoUrl: string;
  collectionName: string;
}

export interface ModuleDefinition {
  type?: 'HoF' | 'Instance';
  module: string;
  options?: ModuleOption;
}
type ModuleOption =
  | string
  | number
  | boolean
  | {
      [key: string]: ModuleOption;
    };

export interface Configuration {
  /**
   * A path to the temporary directory used as a plugin working directory.
   */
  pluginWorkingDir: string;
  /**
   * Determines whether to remove working directory after job has finished.
   */
  cleanPluginWorkingDir: boolean;
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
  dicomFileRepository: ModuleDefinition;
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
   * Accessor of plugins installed as Docker images.
   */
  pluginDefinitionAccessor:
    | {
        type: 'mongo';
        options: MongoConnectionConfiguration;
      }
    | {
        type: 'static';
        options: { dir: string };
      };

  /**
   * Category name of daemon logger (depends Log4JsLogger setting)
   */
  logger?: string;
}
