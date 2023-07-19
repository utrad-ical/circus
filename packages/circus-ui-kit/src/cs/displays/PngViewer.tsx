import React, { RefObject, useEffect, useRef } from 'react';
import { useCsResults } from '../CsResultsContext';
import { Display } from '../Display';
import { useErrorMessage } from './utils/useErrorMessage';

export interface PngViewerOptions {
  /**
   * PNG file name to display.
   */
  fileName?: string;
}

export const PngViewer: Display<PngViewerOptions, void> = props => {
  const {
    options: { fileName = 'result.png' }
  } = props;
  const { job, loadAttachment } = useCsResults();

  const [error, setError] = useErrorMessage();
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!job) return;

    const load = async (file: string, element: RefObject<HTMLImageElement>) => {
      const res = await loadAttachment(file);
      if (res.status === 200) {
        const img = await res.arrayBuffer();
        const view = new Uint8Array(img);
        const blob = new Blob([view], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        element.current!.src = url;
      }
    };
    load(fileName.endsWith('.png') ? fileName : fileName + '.png', imgRef);
  }, [job, loadAttachment]);

  if (error) return error;

  return <img className="image" ref={imgRef} alt={fileName} />;
};
