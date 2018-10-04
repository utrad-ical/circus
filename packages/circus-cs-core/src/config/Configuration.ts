import { DockerOptions } from 'dockerode';
import { StartOptions } from 'pm2';
import { PluginDefinition } from '../interface';

interface MongoConnectionConfiguration {
  mongoUrl: string;
  collectionName: string;
}

export interface ModuleDefinition {
  module: string;
  options?: ModuleOption;
}
type ModuleOption = {
  [key: string]: ModuleOption | string | number | boolean;
};

export interface Configuration {
  /**
   * A path to the working directory which stores Plug-in definitions.
   */
  coreWorkingDir: string;
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
   * List of plugins installed as Docker images.
   */
  plugins: PluginDefinition[];
  /**
   * Category name of daemon logger (depends Log4JsLogger setting)
   */
  logger?: string;
}
