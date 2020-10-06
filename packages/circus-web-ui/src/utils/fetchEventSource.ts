interface Options {
  headers?: any;
  /**
   * Used to abort the request. See `AbortController`.
   */
  signal?: AbortSignal;
}

export type Event =
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

/**
 * Reads lines from the given URL.
 */
const fetchLines = async function* (url: string, options: Options = {}) {
  const { headers = {}, signal } = options;
  const utf8Decoder = new TextDecoder('utf-8');
  const res = await fetch(url, { headers, signal });
  if (!res.body) throw new Error('body empty');
  const reader = res.body.getReader();

  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    const chunk: string = value ? utf8Decoder.decode(value) : '';
    buffer += chunk;
    while (true) {
      const match = buffer.match(/(.*?)(\r\n|\r|\n)(.*)/s);
      if (!match) break;
      yield match[1];
      buffer = match[3];
    }
    if (done) break;
  }
  yield buffer;
};

/**
 * Reads events from the given URL.
 */
const fetchEventSourceOnce = async function* (
  url: string,
  options: Options = {}
): AsyncGenerator<Event> {
  let event: string | null = null;
  let data: any = null;
  for await (const line of fetchLines(url, options)) {
    if (/^event:/.test(line)) {
      event = line.substr(6).trim();
    }
    if (/^data:/.test(line)) {
      data = JSON.parse(line.substr(5));
    }
    if (line.trim() === '') {
      if (event && data) {
        yield { type: event, ...data } as Event;
      } else {
        event = null;
        data = null;
      }
    }
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Reads events from an SSE (server-sent events) source as an async generator.
 * We don't use native `EventSource` because it does not support custom
 * headers.
 * This function tries to re-connect the event source indefinitely
 * using the xponential backoff algorithm.
 * @param url URL that returns a `text/event-stream` stream.
 * @param options The options object.
 */
const fetchEventSource = async function* (url: string, options: Options = {}) {
  let retryWait = 1000;
  const { signal } = options;

  while (true) {
    if (signal?.aborted) return;
    try {
      for await (const event of fetchEventSourceOnce(url, options)) {
        retryWait = 1000;
        yield event;
      }
    } catch (err) {
      console.error(err);
    }
    if (signal?.aborted) return;
    await delay(retryWait);
    retryWait = Math.min(60000, retryWait * 2);
  }
};

export default fetchEventSource;
