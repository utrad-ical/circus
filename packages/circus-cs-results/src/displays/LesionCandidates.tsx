import {
  Composition,
  HybridMprImageSource
} from '@utrad-ical/circus-rs/src/browser';
import React, { useEffect, useState } from 'react';
import { useCsResults } from '../CsResultsContext';
import { Display } from '../Display';

interface LesionCandidate {
  rank: number;
  confidence: number;
  size: number;
  location: [number, number, number];
}

interface LesionCandidatesOptions {
  dataPath?: string;
  maxDisplay?: number;
  confidenceThreshold?: number;
}

export const LesionCandidates: Display<
  LesionCandidatesOptions,
  any
> = props => {
  const { options } = props;
  const {
    job,
    consensual,
    editable,
    getVolumeLoader,
    rsHttpClient
  } = useCsResults();
  const { results } = job;
  const [composition, setComposition] = useState<Composition | null>(null);

  useEffect(() => {
    const volumeId = 0;
    const series = job.series[volumeId];
    const volumeLoader = getVolumeLoader(series);
    const src = new HybridMprImageSource({
      volumeLoader,
      rsHttpClient,
      seriesUid: series.seriesUid
    });
    const composition = new Composition(src);
    setComposition(composition);
  }, []);

  if (!composition) return null;
  return <div>Hello</div>;
};
