import * as rl from 'node:readline';
import { Readable } from 'node:stream';
import type { AuthorizedFetch } from './createAuthorizedFetch.ts';

export interface ProgressEvent {
  type: 'progress' | 'finish' | 'error';
  message: string;
  finished?: number;
  total?: number;
}

interface ProgressWatcher {
  /** Pass this to the request; undefined if it could not be issued */
  progressId?: string;
  stop: () => void;
}

/**
 * Issues a progress ID and reads its server-sent events.
 * The progress is only for display, so failures are ignored.
 */
const watchProgress = async (
  fetch: AuthorizedFetch,
  onEvent: (event: ProgressEvent) => void
): Promise<ProgressWatcher> => {
  const abortController = new AbortController();
  const stop = () => abortController.abort();
  let progressId: string;
  try {
    const res = await fetch('progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    progressId = ((await res.json()) as { progressId: string }).progressId;
  } catch {
    return { stop };
  }
  (async () => {
    const res = await fetch(`progress/${progressId}`, {
      signal: abortController.signal
    });
    const lines = rl.createInterface({ input: Readable.fromWeb(res.body!) });
    let type: string | null = null;
    let data: any = null;
    for await (const line of lines) {
      if (line.startsWith('event:')) type = line.slice(6).trim();
      if (line.startsWith('data:')) data = JSON.parse(line.slice(5));
      if (line.trim() === '') {
        if (type && data) onEvent({ type, ...data } as ProgressEvent);
        type = null;
        data = null;
      }
    }
  })().catch(() => {});
  return { progressId, stop };
};

export default watchProgress;
