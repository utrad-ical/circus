import React, { RefObject, useEffect, useRef } from 'react';
import { useCsResults } from '../CsResultsContext';
import { Display } from '../Display';
import { useErrorMessage } from './utils/useErrorMessage';

export interface ImageResultViewerOptions {
  /**
   * PNG file name to display.
   */
  fileName?: string;
}

const getImageSubtype = (fileName: string) => {
  const ext = fileName.split('.').pop();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'apng') return 'image/apng';
  if (ext === 'avif') return 'image/avif';
  return undefined;
};

export const ImageResultViewer: Display<ImageResultViewerOptions, void> =
  props => {
    const {
      options: { fileName = 'result.png' }
    } = props;
    const { job, loadAttachment } = useCsResults();

    const [error, setError] = useErrorMessage();
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
      if (!job) return;
      const mimeType = getImageSubtype(fileName);
      if (mimeType === undefined) {
        setError(`Unsupported image type: ${fileName}`);
        return;
      }

      const load = async (
        file: string,
        element: RefObject<HTMLImageElement>
      ) => {
        const res = await loadAttachment(file);
        if (res.status === 200) {
          const img = await res.arrayBuffer();
          const view = new Uint8Array(img);
          const blob = new Blob([view], { type: mimeType });
          const url = URL.createObjectURL(blob);
          element.current!.src = url;
        }
      };
      load(fileName, imgRef);
    }, [job, loadAttachment]);

    if (error) return error;

    return <img className="image" ref={imgRef} alt={fileName} />;
  };
