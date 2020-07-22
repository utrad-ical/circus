import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';

export interface FeedbackEntry<T> {
  userEmail: string;
  isConsensual: boolean;
  createdAt: string;
  data: T;
}

export interface ImperativeFeedbackRef<T> {
  mergePersonalFeedback: (personalFeedback: T[]) => T;
  validate: (value: T) => boolean;
}

export interface Job {
  jobId: string;
  results: any;
  series: {
    seriesUid: string;
    partialVolumeDescriptor: PartialVolumeDescriptor;
  }[];
}

/**
 * @template T Type of the feedback value.
 * @template O Type of the options.
 */
export interface FeedbackListenerProps<T, O> {
  /**
   * The *initial* feedback value. Not respected when an edit happens.
   */
  value: T;
  /**
   * Notifies the value change of the feedback.
   */
  onChange: (value: T) => void;
  /**
   * Reports the current validation status.
   * Fires on initial render and subsequent feedback changes.
   */
  onFeedbackValidate: (valid: boolean) => void;
  isConsensual: boolean;
  /**
   * Holds the personal feedback data.
   * Used only in consensual mode.
   */
  personalOpinions?: FeedbackEntry<T>[];

  /**
   * Used when showing an already-registered feedback.
   * Note: this may
   */
  disabled?: boolean;

  options: O;

  /**
   * @deprecated
   */
  job: Job;
}

// export type FeedbackListener = <T>(
//   props: FeedbackListenerProps<T>
// ) => React.ReactElement<any>;
