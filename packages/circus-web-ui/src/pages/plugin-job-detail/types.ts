import { FeedbackEntry } from '@utrad-ical/circus-cs-results';

export interface ImperativeFeedbackRef<T> {
  mergePersonalFeedback: (personalFeedback: T[]) => T;
  validate: (value: T) => boolean;
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
   * The Job data.
   */
  job: Job;
}

// export type FeedbackListener = <T>(
//   props: FeedbackListenerProps<T>
// ) => React.ReactElement<any>;
