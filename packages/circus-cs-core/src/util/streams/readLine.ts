/**
 * Read lines from a ReadableStream.
 */
export const readLine = async function* (
  stream: ReadableStream<string>
): AsyncGenerator<string> {
  const reader = stream.getReader();

  let buffer = '';
  let finished = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer) yield buffer;
        finished = true;
        break;
      }
      buffer += value;
      let index: number;
      while ((index = buffer.indexOf('\n')) >= 0) {
        yield buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
      }
    }
  } finally {
    if (!finished) {
      console.log('Break. Cancelling underlying stream');
      await reader.cancel();
    }
    reader.releaseLock();
  }
};

export const pulse = Symbol('pulse');

/**
 * Read lines from a ReadableStream, or yields "pulse" periodically
 * when no lines are available.
 * A pulse is a Symbol value that can be used to keep a connection alive.
 */
export const readLineOrPulse = async function* (
  stream: ReadableStream<string>,
  pulseIntervalMs: number = 500
): AsyncGenerator<string | typeof pulse> {
  const lineIterator = readLine(stream);
  let next: Promise<IteratorResult<string>> | null = null;

  const delay = (ms: number) =>
    new Promise<typeof pulse>(resolve => setTimeout(() => resolve(pulse), ms));

  while (true) {
    next ??= lineIterator.next();
    // Wait until the next line is available or the pulse interval is reached
    const res = await Promise.race([delay(pulseIntervalMs), next]);
    if (res === pulse) {
      yield pulse;
    } else {
      if (res.done) break;
      yield res.value;
      next = null;
    }
  }
};
