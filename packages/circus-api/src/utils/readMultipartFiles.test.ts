import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import { getRequestListener } from '@hono/node-server';
import readMultipartFiles from './readMultipartFiles.ts';

// Reads the first `n` bytes of each file, and leaves the rest
let readBytes: number | undefined;
let server: http.Server;
let url: string;
let onError: ((message: string) => void) | undefined;
let onFile: ((filename: string) => void) | undefined;

before(async () => {
  server = http.createServer(
    getRequestListener(
      async request => {
        const result: string[] = [];
        try {
          for await (const { filename, stream } of readMultipartFiles(
            request
          )) {
            const reader = stream.getReader();
            let content = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              content += new TextDecoder().decode(value);
              if (readBytes !== undefined && content.length >= readBytes) {
                await reader.cancel();
                content = content.slice(0, readBytes);
                break;
              }
            }
            result.push(`${filename}:${content}`);
            onFile?.(filename);
          }
          return Response.json(result);
        } catch (err: any) {
          onError?.(err.message);
          return new Response(err.message, { status: 500 });
        }
      },
      { overrideGlobalObjects: false }
    )
  );
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
});

after(() => server.close());

const post = async (body: FormData) => {
  const res = await fetch(url, { method: 'POST', body });
  return { status: res.status, body: await res.text() };
};

describe('readMultipartFiles', () => {
  test('reads files in order with their relative paths', async () => {
    readBytes = undefined;
    const fd = new FormData();
    fd.append('files', new Blob(['alpha']), 'dir/画像 "1".dcm');
    fd.append('note', 'ignored');
    fd.append('files', new Blob(['x'.repeat(200_000)]), 'b.zip');
    fd.append('files', new Blob(['']), 'c');
    const res = await post(fd);
    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(res.body), [
      'dir/画像 "1".dcm:alpha',
      `b.zip:${'x'.repeat(200_000)}`,
      'c:'
    ]);
  });

  test('moves on to the next file when one is canceled', async () => {
    readBytes = 3;
    const fd = new FormData();
    fd.append('files', new Blob(['y'.repeat(3 * 1024 * 1024)]), 'big');
    fd.append('files', new Blob(['zzz']), 'small');
    const res = await post(fd);
    assert.deepEqual(JSON.parse(res.body), ['big:yyy', 'small:zzz']);
  });

  test('drains a partially read file when moving to the next one', async () => {
    const encoder = new TextEncoder();
    const requestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=abc' },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              '--abc\r\nContent-Disposition: form-data; name="files"; filename="first"\r\n\r\n' +
                'y'.repeat(128)
            )
          );
          controller.enqueue(
            encoder.encode(
              'y'.repeat(128) +
                '\r\n--abc\r\nContent-Disposition: form-data; name="files"; filename="second"\r\n\r\n' +
                'second body\r\n--abc--\r\n'
            )
          );
          controller.close();
        }
      }),
      duplex: 'half' as const
    };
    const files = readMultipartFiles(new Request(url, requestInit));
    try {
      const first = await files.next();
      if (first.done) assert.fail('Missing first file');
      const chunk = await first.value.stream.getReader().read();
      assert.ok(chunk.value && chunk.value.byteLength < 256);

      const second = await files.next();
      if (second.done) assert.fail('Missing second file');
      assert.equal(second.value.filename, 'second');
      assert.equal(
        await new Response(second.value.stream).text(),
        'second body'
      );
      assert.equal((await files.next()).done, true);
    } finally {
      await files.return(undefined);
    }
  });

  test('reads the first file before the rest of the request arrives', async () => {
    readBytes = undefined;
    const firstFile = new Promise<string>(resolve => {
      onFile = resolve;
    });
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=abc' },
      signal: AbortSignal.timeout(3000)
    });
    try {
      const response = new Promise<number>((resolve, reject) => {
        req.once('error', reject);
        req.once('response', res => {
          res.resume();
          res.once('end', () => resolve(res.statusCode ?? 0));
        });
      });
      req.write(
        '--abc\r\nContent-Disposition: form-data; name="files"; filename="first"\r\n\r\n' +
          'one\r\n--abc\r\nContent-Disposition: form-data; name="files"; filename="second"\r\n\r\n'
      );
      const filename = await Promise.race([firstFile, response]);
      assert.equal(filename, 'first');
      req.end('two\r\n--abc--\r\n');
      assert.equal(await response, 200);
    } finally {
      onFile = undefined;
      req.destroy();
    }
  });

  test('throws on a malformed request', async () => {
    readBytes = undefined;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=abc' },
      body: '--abc\r\nContent-Disposition: form-data; name="files"; filename="a"'
    });
    assert.equal(res.status, 500);
  });

  test('throws when the client disconnects while sending a file', async () => {
    readBytes = undefined;
    const error = new Promise<string>(r => (onError = r));
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=abc' }
    });
    req.on('error', () => {});
    req.write(
      '--abc\r\nContent-Disposition: form-data; name="files"; filename="a"' +
        '\r\n\r\npartial content'
    );
    setTimeout(() => req.destroy(), 50);
    assert.equal(await error, 'The upload was interrupted.');
    onError = undefined;
  });
});
