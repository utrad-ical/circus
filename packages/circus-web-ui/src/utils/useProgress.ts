import type {
  ProgressEvent,
  ProgressLogLine
} from '@utrad-ical/circus-api-schema';
import { useEffect, useState } from 'react';
import { api } from './api.ts';

type ProgressEventData<Type extends ProgressEvent['type']> = Omit<
  Extract<ProgressEvent, { type: Type }>,
  'type'
>;

type ProgressFields = Partial<ProgressEventData<'progress'>>;

export interface Progress extends ProgressFields {
  status: 'processing' | 'finished' | 'error';
  /** Recent log lines, e.g., the result of each file */
  logs?: ProgressLogLine[];
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
    const parse = <Type extends ProgressEvent['type']>(
      event: Event
    ): ProgressEventData<Type> =>
      JSON.parse((event as MessageEvent<string>).data);
    const update = (status: Progress['status'], data: ProgressFields) =>
      setProgress(p => ({ ...p, status, ...data }));
    source.addEventListener('progress', event => {
      update('processing', parse<'progress'>(event));
    });
    source.addEventListener('log', event => {
      const { lines } = parse<'log'>(event);
      setProgress(p =>
        p
          ? { ...p, logs: [...(p.logs ?? []), ...lines].slice(-maxLogLines) }
          : p
      );
    });
    source.addEventListener('finish', event => {
      source.close();
      update('finished', parse<'finish' | 'error'>(event));
    });
    source.addEventListener('error', event => {
      // A server event, or a connection error that does not reconnect
      if (event instanceof MessageEvent) {
        source.close();
        update('error', parse<'finish' | 'error'>(event));
      } else if (source.readyState === EventSource.CLOSED) {
        update('error', { message: 'Connection lost.' });
      }
    });
    return () => source.close();
  }, [progressId]);

  return progress;
};

export default useProgress;
