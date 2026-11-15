import { useEffect, useState } from 'react';
import { api } from './api.ts';

export interface Progress {
  status: 'processing' | 'finished' | 'error';
  finished?: number;
  total?: number;
  message?: string;
}

/**
 * Subscribes to the progress of a long-running request
 * (see `/api/progress`) while `progressId` is set.
 */
const useProgress = (progressId: string | null): Progress | undefined => {
  const [progress, setProgress] = useState<Progress>();

  useEffect(() => {
    if (!progressId) {
      setProgress(undefined);
      return;
    }
    setProgress({ status: 'processing', message: 'Starting...' });
    // GET with the session cookie; reconnects automatically
    const source = new EventSource(api.getBaseUrl() + `progress/${progressId}`);
    const parse = (event: Event) => JSON.parse((event as MessageEvent).data);
    source.addEventListener('progress', event => {
      setProgress({ status: 'processing', ...parse(event) });
    });
    source.addEventListener('finish', event => {
      source.close();
      setProgress({ status: 'finished', ...parse(event) });
    });
    source.addEventListener('error', event => {
      // A server event, or a connection error that does not reconnect
      if (event instanceof MessageEvent) {
        source.close();
        setProgress({ status: 'error', ...parse(event) });
      } else if (source.readyState === EventSource.CLOSED) {
        setProgress({ status: 'error', message: 'Connection lost.' });
      }
    });
    return () => source.close();
  }, [progressId]);

  return progress;
};

export default useProgress;
