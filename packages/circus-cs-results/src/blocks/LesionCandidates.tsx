import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useCsResults } from '../CsResultsContext';
import { Display } from '../Display';

interface LesionCandidate {
  rank: number;
  confidence: number;
  size: number;
  location: [number, number, number];
}

interface LesionCandidatesOptions {
  maxDisplay?: number;
  confidenceThreshold?: number;
}

export const LesionCandidates: Display<
  LesionCandidate[],
  LesionCandidatesOptions,
  any
> = props => {
  const { data, options } = props;
  const { consensual, editable } = useCsResults();

  return <div></div>;
};
