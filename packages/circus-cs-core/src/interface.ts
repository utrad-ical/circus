import { DockerOptions } from 'dockerode';
import { StartOptions } from 'pm2';

export interface PluginJobRequest {
  pluginId: string;
  series: JobSeries[];
  environment?: string; // deprecated
}

export interface JobSeries {
  seriesUid: string;
  startImgNum?: number;
  endImgNum?: number;
  imageDelta?: number;
  requiredPrivateTags?: string[];
}

export interface PluginDefinition {
  pluginId: string;
  version: string;
  type: 'CAD';
  dockerImage: string;
  binds?: {
    in: string;
    out: string;
  };
  maxExecutionSeconds?: number;
}

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

export type JobState =
  | 'in_queue'
  | 'processing'
  | 'finished'
  | 'failed'
  | 'invalidated'
  | 'cancelled';
