import { readLine } from './readLine';

export interface SseEvent<T = unknown> {
  type: string;
  data?: T; // JSON-serializable
}

/**
 * Creates a stream that can be used to send Server-Sent Events (SSE).
 */
export const sseStreamWriter = <E extends SseEvent = SseEvent>() => {
  const stream = new TransformStream<string, string>();
  const writer = stream.writable.getWriter();
  const writeEvent = (event: E) => {
    writer.write(`event: ${event.type}\n`);
    if (event.data) writer.write(`data: ${JSON.stringify(event.data)}\n`);
    writer.write('\n');
  };
  const writeComment = (comment: string) => writer.write(`: ${comment}\n`);
  const close = () => writer.close();
  return { stream: stream.readable, writeEvent, writeComment, close };
};

/**
 * Reads Server-Sent Events (SSE) from a ReadableStream.
 */
export const sseStreamReader = async function* <E extends SseEvent = SseEvent>(
  stream: ReadableStream<string>
): AsyncGenerator<E> {
  const lines: string[] = [];

  const buildEvent = (): SseEvent | null => {
    const event: SseEvent = { type: '', data: undefined };
    for (const line of lines) {
      const [key, value] = line.split(': ', 2);
      if (key === 'event') {
        event.type = value;
      } else if (key === 'data') {
        event.data = JSON.parse(value);
      }
    }
    lines.length = 0;
    return event.type ? event : null;
  };

  for await (const line of readLine(stream)) {
    if (line.startsWith(':')) continue; // Ignore comments
    if (!line) {
      const ev = buildEvent();
      if (ev) yield ev as E;
    } else {
      lines.push(line);
    }
  }
  const ev = buildEvent();
  if (ev) yield ev as E;
};
