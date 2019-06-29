// This *.d.ts file is recognized by the typescript compiler.
// You can use them like `circus.PluginJobRequest` without `import`-ing.

declare namespace circus {
  interface PluginJobRequest {
    pluginId: string;
    series: JobSeries[];
    environment?: string; // deprecated
  }

  interface JobSeries {
    seriesUid: string;
    startImgNum?: number;
    endImgNum?: number;
    imageDelta?: number;
    requiredPrivateTags?: string[];
  }

  interface PartialVolumeDescriptor {
    start: number;
    end: number;
    delta: number;
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

  type JobState =
    | 'in_queue'
    | 'processing'
    | 'finished'
    | 'failed'
    | 'invalidated'
    | 'cancelled';
}
