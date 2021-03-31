import React from 'react';

export interface PersonalOpinion<T> {
  userEmail: string;
  createdAt: Date;
  feedback: T;
}

export type PersonalOpinions<T> = readonly PersonalOpinion<T>[];

interface DisplayProps<D extends unknown, O extends object, F extends unknown> {
  /**
   * The results data this Display is expected to show.
   */
  data: D;
  initialFeedbackValue: F | undefined;
  /**
   * Holds individual feedback data for this, from which initial
   * consensual feedback can be calculated.
   * Set to `undefined` when not in consensual mode.
   */
  personalOpinions: PersonalOpinions<F>;
  options: O;
  onFeedbackChange: (value: F) => void;
  onFeedbackValidate: (valid: boolean, errors?: string[]) => void;
}

/**
 * Display is the main building block of CIRCUS CS job results screen.
 */
export type Display<D extends unknown, O extends object, F extends unknown> = (
  props: DisplayProps<D, O, F>
) => React.ReactChild;
