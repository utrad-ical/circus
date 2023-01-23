import React from 'react';
import { FeedbackEntry } from './CsResultsContext';

export interface DisplayDefinition {
  type: string;
  options: any;
}

interface ValidFeedbackReport<T> {
  valid: true;
  value: T;
}

interface InvalidFeedbackReport {
  valid: false;
  error?: any;
}

/**
 * Object to report current feedback entering status.
 * - `valid: true` means this feedback can be registered.
 * - `valid: false` means this feedback is not ready to be registered.
 */
export type FeedbackReport<T> = ValidFeedbackReport<T> | InvalidFeedbackReport;

interface DisplayProps<O extends object, F extends unknown> {
  /**
   * The results data this Display is expected to show.
   */
  initialFeedbackValue: F | undefined;
  /**
   * Holds individual feedback data for this, from which initial
   * consensual feedback can be calculated.
   * Set to `undefined` when not in consensual mode.
   */
  personalOpinions: readonly FeedbackEntry<F>[];
  options: O;
  /**
   * Triggers when the feedback data is changed.
   * The display must call this on initial render to declare
   * this display required feedback registration.
   * Not calling this on initial render means this display do not
   * collect user feedback.
   */
  onFeedbackChange: (status: FeedbackReport<F>) => void;
  children?: React.ReactNode;
}

/**
 * Display is the main building block of CIRCUS CS job results screen.
 */
export type Display<O extends object, F extends unknown> = (
  props: DisplayProps<O, F>
) => React.ReactElement | null;
