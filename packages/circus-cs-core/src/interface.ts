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

/**
 * Defines CIRCUS CS plug-in.
 */
export interface PluginDefinition {
  pluginId: string;
  version: string;

  /**
   * Plug-in type. Currently the only accepted value is 'CAD'.
   */
  type: 'CAD';

  /**
   * Container identifier.
   */
  dockerImage: string;

  /**
   * Runtime to use for this plug-in container.
   */
  runtime?: string;

  /**
   * Volume mount point.
   */
  binds?: {
    in: string;
    out: string;
  };

  /**
   * Max execution time for this plug-in.
   */
  maxExecutionSeconds?: number;
}

export type JobState =
  | 'in_queue'
  | 'processing'
  | 'finished'
  | 'failed'
  | 'invalidated'
  | 'cancelled';
