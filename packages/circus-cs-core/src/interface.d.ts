// This *.d.ts file is recognized by the typescript compiler.
// You can use them like `circus.PluginJobRequest` without `import`-ing.

declare namespace circus {
  export type QueueState = 'wait' | 'processing';

  interface Queue<T> {
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

  interface QueueItem<T> {
    _id?: string;
    jobId: string;
    priority: number;
    payload: T;
    state: QueueState;
    createdAt: Date;
    updatedAt: Date;
    startedAt: Date | null;
  }

  interface PluginJobRequest {
    pluginId: string;
    series: JobSeries[];
    environment?: string; // deprecated
  }

  type PluginJobRequestQueue = Queue<PluginJobRequest>;

  interface JobSeries {
    seriesUid: string;
    startImgNum?: number;
    endImgNum?: number;
    imageDelta?: number;
    requiredPrivateTags?: string[];
  }

  /**
   * Provides a simple interface to control the job manager daemon.
   */
  interface DaemonController {
    start: () => Promise<void>;
    stop: () => Promise<void>;
    status: () => Promise<'running' | 'stopped'>;
    pm2list: () => Promise<void>;
    pm2killall: () => Promise<void>;
  }

  /**
   * Defines CIRCUS CS plug-in.
   */
  interface PluginDefinition {
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

  interface PluginDefinitionAccessor {
    list: () => Promise<PluginDefinition[]>;
    get: (pluginId: string) => Promise<PluginDefinition>;
  }

  /**
   * A facade interface that abstracts the complex dependencies.
   */
  interface CsCore {
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
}
