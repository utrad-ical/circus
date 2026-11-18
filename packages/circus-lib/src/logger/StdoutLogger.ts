import { existsSync } from 'node:fs';
import { normalize } from 'node:path';
import pino from 'pino';
import type { DestinationStream } from 'pino';
import type Logger from './Logger.ts';
import type { LogLevel } from './Logger.ts';

const frameLocation =
  /(?:^| \()((?:file:\/\/)?\/[^\s()]+|node:[\w/.-]+):(\d+:\d+)\)?$/;
const sourceLocation =
  /\/((?:packages\/circus-[\w-]+\/|node_modules\/)[\w./@%+-]+\.[cm]?[jt]s)$/;

const stackFrames = ({ stack, message }: Error) => {
  if (typeof stack !== 'string') return;
  // V8 can include an error code in the headline or cache it before the message
  // changes. Remove the entire message when present, including multiline text.
  const delimiter = stack.indexOf(': ');
  const hasMessage =
    delimiter >= 0 && stack.startsWith(message + '\n', delimiter + 2);
  const start = hasMessage ? delimiter + 2 + message.length + 1 : 0;
  const frames: string[] = [];
  for (const line of stack.slice(start).trimEnd().split('\n').reverse()) {
    if (!line.startsWith('    at ')) break;
    const match = frameLocation.exec(line.slice(7).replace(/^async /, ''));
    if (!match) continue;
    const [, location, position] = match;
    if (location.startsWith('node:')) {
      if (hasMessage) frames.push(`    at ${location}:${position}`);
      continue;
    }
    // Only log source paths. Frame names can also contain arbitrary values.
    const file = normalize(location.replace(/^file:\/\//, ''));
    const source = sourceLocation.exec(file);
    if (source && existsSync(file))
      frames.push(`    at ${source[1]}:${position}`);
  }
  return frames.reverse().join('\n');
};

const serializeError = (error: unknown) => {
  if (!(error instanceof Error)) return { type: typeof error };
  const type = /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(error.name)
    ? error.name
    : 'Error';
  const code = (error as Error & { code?: unknown }).code;
  const hasCode =
    typeof code === 'number' ||
    (typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,39}$/.test(code));
  const stack = stackFrames(error);
  return { type, ...(hasCode && { code }), ...(stack && { stack }) };
};

const createStdoutLogger = (
  service: string,
  level: LogLevel = 'info',
  destination: DestinationStream = pino.destination({ dest: 1, sync: true })
): Logger =>
  pino(
    {
      base: { pid: process.pid, service },
      level,
      timestamp: pino.stdTimeFunctions.isoTime,
      serializers: { err: serializeError }
    },
    destination
  );

export default createStdoutLogger;
