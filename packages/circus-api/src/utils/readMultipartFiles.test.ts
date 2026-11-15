import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import readMultipartFiles from './readMultipartFiles.ts';

// Reads the first `n` bytes of each file, and leaves the rest
let readBytes: number | undefined;
let server: http.Server;
let url: string;
let onError: ((message: string) => void) | undefined;

before(async () => {
  server = http.createServer(async (req, res) => {
    const result: string[] = [];
    try {
      for await (const { filename, stream } of readMultipartFiles(req)) {
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
      }
      res.end(JSON.stringify(result));
    } catch (err: any) {
      onError?.(err.message);
      res.statusCode = 500;
      res.end(err.message);
    }
  });
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
    fd.append('files', new Blob(['alpha']), 'dir/a.dcm');
    fd.append('note', 'ignored');
    fd.append('files', new Blob(['x'.repeat(200_000)]), 'b.zip');
    fd.append('files', new Blob(['']), 'c');
    const res = await post(fd);
    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(res.body), [
      'dir/a.dcm:alpha',
      `b.zip:${'x'.repeat(200_000)}`,
      'c:'
    ]);
  });

  test('moves on to the next file when one is canceled', async () => {
    readBytes = 3;
    const fd = new FormData();
    fd.append('files', new Blob(['y'.repeat(500_000)]), 'big');
    fd.append('files', new Blob(['zzz']), 'small');
    const res = await post(fd);
    assert.deepEqual(JSON.parse(res.body), ['big:yyy', 'small:zzz']);
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
