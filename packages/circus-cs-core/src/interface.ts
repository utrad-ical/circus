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

export type JobState =
  | 'in_queue'
  | 'processing'
  | 'finished'
  | 'failed'
  | 'invalidated'
  | 'cancelled';
