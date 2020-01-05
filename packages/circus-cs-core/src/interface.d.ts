// This *.d.ts file is recognized by the typescript compiler.
// You can use them like `circus.PluginJobRequest` without `import`-ing.

export type QueueState = 'wait' | 'processing';

export interface Configuration {
  [service: string]: {
    type?: string;
    options?: any;
  };
}

export interface Queue<T> {
  /**
   * Returns the list of current jobs and their status.
   */
  list: (state?: QueueState | 'all') => Promise<QueueItem<T>[]>;

  /**
   * Registers a ner job.
   */
  enqueue: (jobId: string, payload: T, priority?: number) => Promise<string>;

  /**
   * Returns the next job while marking it as 'processing'.
   */
  dequeue: () => Promise<QueueItem<T> | null>;

  /**
   * Removes the job from queue.
   */
  settle: (jobId: string) => Promise<void>;
}

export interface QueueItem<T> {
  _id?: string;
  jobId: string;
  priority: number;
  payload: T;
  state: QueueState;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
}

export interface PluginJobRequest {
  pluginId: string;
  series: JobSeries[];
  environment?: string; // deprecated
}

export type PluginJobRequestQueue = Queue<PluginJobRequest>;

export interface JobSeries {
  seriesUid: string;
  startImgNum?: number;
  endImgNum?: number;
  imageDelta?: number;
  requiredPrivateTags?: string[];
}

/**
 * Provides a simple interface to control the job manager daemon.
 */
export interface DaemonController {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  status: () => Promise<'running' | 'stopped'>;
  pm2list: () => Promise<void>;
  pm2killall: () => Promise<void>;
}

/**
 * Defines CIRCUS CS plug-in.
 */
export interface PluginDefinition {
  /**
   * Plug-in id. There must not be any duplication.
   */
  pluginId: string;

  /**
   * Plug-in name and version for display.
   */
  pluginName: string; // for display 'MRA-CAD'
  version: string; // '2.1.5'

  /**
   * Plug-in type. Currently the only accepted value is 'CAD'.
   */
  type: 'CAD';

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

export interface PluginDefinitionAccessor {
  list: () => Promise<PluginDefinition[]>;
  get: (pluginId: string) => Promise<PluginDefinition>;
}

export type PluginJobReportType =
  | 'processing'
  | 'finished'
  | 'results'
  | 'failed';

/**
 * PluginJobReporter takes responsibility of reporting/saving the
 * current status and the result of a plug-in job
 * into some external source.
 */
export interface PluginJobReporter {
  /**
   * Reports the current state of the job.
   */
  report: (
    jobId: string,
    type: PluginJobReportType,
    payload?: any
  ) => Promise<void>;

  /**
   * Provides the content plug-in output directory.
   * @param jobId The Job ID.
   * @param stream A `tar-stream` stream which includes all the file
   *   output from the executed plugin. You can extract it using
   *   `tar-fs` or `tar-stream`.
   */
  packDir: (jobId: string, stream: NodeJS.ReadableStream) => Promise<void>;
}

/**
 * A facade interface that abstracts the complex dependencies.
 */
export interface CsCore {
  // Daemon controller
  daemon: DaemonController;
  // plugin handler
  plugin: PluginDefinitionAccessor;
  // job handler
  job: {
    list: () => Promise<QueueItem<PluginJobRequest>[]>;
    register: (
      jobId: string,
      payload: PluginJobRequest,
      priority?: number
    ) => Promise<void>;
  };
}
