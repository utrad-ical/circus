import React from 'react';
import { FeedbackEntry } from './CsResultsContext';

export interface DisplayDefinition {
  type: string;
  options: any;
}

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
  onFeedbackChange: (value: F) => void;
  onFeedbackValidate: (valid: boolean, errors?: string[]) => void;
  children?: React.ReactNode;
}

/**
 * Display is the main building block of CIRCUS CS job results screen.
 */
export type Display<O extends object, F extends unknown> = (
  props: DisplayProps<O, F>
) => React.ReactElement | null;
