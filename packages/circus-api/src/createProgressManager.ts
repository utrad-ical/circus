import type { NoDepFunctionService } from '@utrad-ical/circus-lib';
import type {
  ProgressEvent,
  ProgressLogLevel,
  ProgressLogLine
} from '@utrad-ical/circus-api-schema';
import httpStatus from 'http-status';
import _ from 'lodash';
import { randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { CircusContext } from './typings/middlewares.ts';

/**
 * Reports the progress of a long-running request.
 */
export interface ProgressReporter {
  report: (message: string, finished?: number, total?: number) => void;
  /** Adds a line to the log, e.g., the result of each file */
  log: (level: ProgressLogLevel, message: string) => void;
  finish: (message: string) => void;
  fail: (message: string) => void;
}

/**
 * Relays the progress of a long-running request (e.g., a download)
 * to server-sent events, keyed by a progress ID issued beforehand.
 * Everything is in memory.
 */
export interface ProgressManager {
  /** Issues a new progress ID for the user. */
  issue: (userEmail: string) => string;
  /**
   * Starts reporting with the progress ID.
   * Throws 400 if the ID is unknown, someone else's, or already used.
   */
  claim: (progressId: string, userEmail: string) => ProgressReporter;
  /**
   * Responds with the server-sent events of the progress ID.
   * Throws 404 if the ID is unknown or someone else's.
   */
  respond: (ctx: CircusContext, progressId: string, userEmail: string) => void;
}

interface Entry {
  userEmail: string;
  claimed: boolean;
  last?: ProgressEvent;
  /** Recent log lines, for late subscribers */
  logs: ProgressLogLine[];
  events: EventEmitter;
  timer?: NodeJS.Timeout;
}

interface Options {
  /** How long an unused ID lives */
  unclaimedTtlMs?: number;
  /** How long a finished ID lives, for late subscribers */
  finishedTtlMs?: number;
  throttleMs?: number;
  keepAliveMs?: number;
  /** How many log lines are kept for late subscribers */
  maxLogLines?: number;
}

const isTerminal = (event?: ProgressEvent) =>
  event?.type === 'finish' || event?.type === 'error';

const createProgressManager: NoDepFunctionService<
  ProgressManager,
  Options | undefined
> = async (opts = {}) => {
  const {
    unclaimedTtlMs = 10 * 60 * 1000,
    finishedTtlMs = 60 * 1000,
    throttleMs = 150,
    keepAliveMs = 10 * 1000,
    maxLogLines = 100
  } = opts;
  const entries = new Map<string, Entry>();

  const expireAfter = (progressId: string, entry: Entry, ms: number) => {
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => entries.delete(progressId), ms);
    entry.timer.unref();
  };

  const issue = (userEmail: string) => {
    const progressId = randomBytes(16).toString('hex');
    const entry: Entry = {
      userEmail,
      claimed: false,
      logs: [],
      events: new EventEmitter()
    };
    entries.set(progressId, entry);
    expireAfter(progressId, entry, unclaimedTtlMs);
    return progressId;
  };

  const claim = (progressId: string, userEmail: string): ProgressReporter => {
    const entry = entries.get(progressId);
    if (!entry || entry.userEmail !== userEmail || entry.claimed)
      throw Object.assign(new Error('Invalid progress ID.'), {
        status: httpStatus.BAD_REQUEST,
        expose: true
      });
    entry.claimed = true;
    clearTimeout(entry.timer);

    const emit = (event: ProgressEvent) => {
      if (isTerminal(entry.last)) return;
      if (event.type === 'log') {
        entry.logs = [...entry.logs, ...event.lines].slice(-maxLogLines);
      } else {
        entry.last = event;
      }
      entry.events.emit('event', event);
      if (isTerminal(event)) expireAfter(progressId, entry, finishedTtlMs);
    };
    const report = _.throttle(
      (message: string, finished?: number, total?: number) =>
        emit({ type: 'progress', message, finished, total }),
      throttleMs
    );
    // Lines are sent together, but never dropped
    let pending: ProgressLogLine[] = [];
    const flushLogs = () => {
      if (!pending.length) return;
      emit({ type: 'log', lines: pending });
      pending = [];
    };
    const throttledFlushLogs = _.throttle(flushLogs, throttleMs);
    const end = (event: ProgressEvent) => {
      report.cancel();
      throttledFlushLogs.cancel();
      flushLogs();
      emit(event);
    };
    return {
      report,
      log: (level, message) => {
        if (isTerminal(entry.last)) return;
        pending.push({ level, message });
        throttledFlushLogs();
      },
      finish: message => end({ type: 'finish', message }),
      fail: message => end({ type: 'error', message })
    };
  };

  const respond = (
    ctx: CircusContext,
    progressId: string,
    userEmail: string
  ) => {
    const entry = entries.get(progressId);
    if (!entry || entry.userEmail !== userEmail)
      ctx.throw(httpStatus.NOT_FOUND, 'No such progress ID.');

    ctx.type = 'text/event-stream';
    ctx.set('Cache-Control', 'no-cache');
    ctx.set('X-Accel-Buffering', 'no'); // Disables nginx buffering
    const stream = new PassThrough();
    ctx.body = stream;
    stream.write('\n'); // send first byte to ensure the stream is live

    const write = (event: ProgressEvent) => {
      const { type, ...data } = event;
      stream.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
      if (isTerminal(event)) stream.end();
    };

    if (entry!.logs.length) write({ type: 'log', lines: entry!.logs });
    if (entry!.last) write(entry!.last);
    if (isTerminal(entry!.last)) return;

    const timerId = setInterval(() => stream.write(':\n'), keepAliveMs);
    entry!.events.on('event', write);
    stream.on('close', () => {
      clearInterval(timerId);
      entry!.events.off('event', write);
    });
  };

  return { issue, claim, respond };
};

export default createProgressManager;
