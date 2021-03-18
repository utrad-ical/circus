import React, { useEffect, useRef } from 'react';
import { Annotation, Viewer } from '@utrad-ical/circus-rs/src/browser';
import { useCsResults } from 'CsResultsContext';

const CsImageViewer: React.FC<{
  volumeId: number;
  annotations: Annotation[];
}> = props => {
  const { job } = useCsResults();
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    //
  });

  return <div ref={viewerRef}></div>;
};
