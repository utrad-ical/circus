import type {
  ProgressCreated,
  ProgressEvent
} from '@utrad-ical/circus-api-schema';
import * as rl from 'node:readline';
import { Readable } from 'node:stream';
import type { AuthorizedFetch } from './createAuthorizedFetch.ts';

interface ProgressWatcher {
  /** Pass this to the request; undefined if it could not be issued */
  progressId?: string;
  /** Waits for the end of the events, up to `timeoutMs` */
  wait: (timeoutMs: number) => Promise<void>;
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
  const noWait = async () => {};
  let progressId: string;
  try {
    const res = await fetch('progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    ({ progressId } = (await res.json()) as ProgressCreated);
  } catch {
    return { stop, wait: noWait };
  }
  const ended = (async () => {
    const res = await fetch(`progress/${progressId}`, {
      signal: abortController.signal
    });
    const lines = rl.createInterface({ input: Readable.fromWeb(res.body!) });
    let type: string | null = null;
    let data: Record<string, unknown> | null = null;
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
  const wait = (timeoutMs: number) =>
    Promise.race([
      ended,
      new Promise<void>(r => setTimeout(r, timeoutMs).unref())
    ]);
  return { progressId, wait, stop };
};

export default watchProgress;
