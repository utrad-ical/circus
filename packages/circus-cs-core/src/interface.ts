// This *.d.ts file is recognized by the typescript compiler.
// You can use them like `circus.PluginJobRequest` without `import`-ing.

import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import { Archiver } from 'archiver';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

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

export interface JobSeries extends SeriesEntry {
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
   * Acceepts a logging stream. A reporter must output it to somewhere.
   * The returned promise will be resolved when the log stream is ready.
   * Callback is called when the log is successfully closed.
   */
  logStream: (
    jobId: string,
    stream: Readable,
    callback?: (err?: Error) => void
  ) => Promise<void>;

  /**
   * Provides the content plug-in output directory.
   * @param jobId The Job ID.
   * @param stream A `tar-stream` stream which includes all the file
   *   output from the executed plugin. You can extract it using
   *   `tar-fs` or `tar-stream`.
   */
  packDir: (jobId: string, stream: Readable) => Promise<void>;
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
    list: (
      state?: QueueState | 'all'
    ) => Promise<QueueItem<PluginJobRequest>[]>;
    register: (
      jobId: string,
      payload: PluginJobRequest,
      priority?: number
    ) => Promise<void>;
  };
}

export interface SeriesEntry {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor;
}

export interface DicomVoxelDumperOptions {
  neededPrivateTags?: string[];
}

/**
 * DicomVoxelDumper builds DICOM volumes for CIRCUS CS plug-ins.
 * It exports a set of files via the passed archiver.
 */
export interface DicomVoxelDumper {
  /**
   * @param series The list of series to export.
   * @param archiver The archiver instance (can be configured to
   * create a zip file, a tar+gz file or an uncompressed tar)
   */
  dump: (
    series: SeriesEntry[],
    archiver: Archiver,
    options?: DicomVoxelDumperOptions
  ) => { stream: Archiver; events: EventEmitter };
}
