import { useEffect, useState } from 'react';
import { api } from './api.ts';

export interface LogLine {
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface Progress {
  status: 'processing' | 'finished' | 'error';
  finished?: number;
  total?: number;
  message?: string;
  /** Recent log lines, e.g., the result of each file */
  logs?: LogLine[];
}

const maxLogLines = 100;

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
    setProgress({ status: 'processing', message: 'Starting...', logs: [] });
    // GET with the session cookie; reconnects automatically
    const source = new EventSource(api.getBaseUrl() + `progress/${progressId}`);
    const parse = (event: Event) => JSON.parse((event as MessageEvent).data);
    const update = (status: Progress['status'], data: any) =>
      setProgress(p => ({ ...p, status, ...data }));
    source.addEventListener('progress', event => {
      update('processing', parse(event));
    });
    source.addEventListener('log', event => {
      const { lines } = parse(event) as { lines: LogLine[] };
      setProgress(p =>
        p
          ? { ...p, logs: [...(p.logs ?? []), ...lines].slice(-maxLogLines) }
          : p
      );
    });
    source.addEventListener('finish', event => {
      source.close();
      update('finished', parse(event));
    });
    source.addEventListener('error', event => {
      // A server event, or a connection error that does not reconnect
      if (event instanceof MessageEvent) {
        source.close();
        update('error', parse(event));
      } else if (source.readyState === EventSource.CLOSED) {
        update('error', { message: 'Connection lost.' });
      }
    });
    return () => source.close();
  }, [progressId]);

  return progress;
};

export default useProgress;
