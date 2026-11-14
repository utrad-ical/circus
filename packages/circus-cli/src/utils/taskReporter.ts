import EventEmitter from 'node:events';
import * as rl from 'node:readline';
import { Readable } from 'node:stream';
import type { AuthorizedFetch } from './createAuthorizedFetch.ts';

interface TaskReporter {
  events: EventEmitter;
  stop: () => void;
}

export type TaskEvent =
  | {
      type: 'progress';
      taskId: string;
      finished?: number;
      total?: number;
      message?: string;
    }
  | {
      type: 'error' | 'finish';
      taskId: string;
      message: string;
    };

const taskReporter = (fetch: AuthorizedFetch): TaskReporter => {
  const emitter = new EventEmitter();
  const abortController = new AbortController();
  // Events are only a hint; callers also poll the task status,
  // so failures here (including the abort by `stop`) are ignored
  (async () => {
    const res = await fetch('tasks/report', { signal: abortController.signal });
    const lines = rl.createInterface({ input: Readable.fromWeb(res.body!) });
    let eventType: string | null = null;
    let data: any = null;
    for await (const line of lines) {
      if (/^event:/.test(line)) {
        eventType = line.slice(6).trim();
      }
      if (/^data:/.test(line)) {
        data = JSON.parse(line.slice(5));
      }
      if (line.trim() === '') {
        if (eventType && data) {
          emitter.emit('event', { type: eventType, ...data } as TaskEvent);
        }
        eventType = null;
        data = null;
      }
    }
  })().catch(() => {});
  return {
    events: emitter,
    stop: () => abortController.abort()
  };
};

export default taskReporter;
