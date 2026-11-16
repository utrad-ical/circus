import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import multipartBody from './multipartBody.ts';

async function* chunks(...texts: string[]) {
  for (const text of texts) yield new TextEncoder().encode(text);
}

describe('multipartBody', () => {
  test('makes a body that can be parsed as form data', async () => {
    let sent = 0;
    const { body, contentType } = multipartBody(
      [
        { filename: 'dir/a.dcm', data: () => chunks('al', 'pha') },
        { filename: '画像 "2".zip', data: () => chunks() }
      ],
      { onSent: bytes => (sent += bytes) }
    );
    const formData = await new Response(body, {
      headers: { 'Content-Type': contentType }
    }).formData();
    const files = formData.getAll('files') as File[];
    assert.deepEqual(
      files.map(f => f.name),
      ['dir/a.dcm', '画像 "2".zip']
    );
    assert.equal(await files[0].text(), 'alpha');
    assert.equal(await files[1].text(), '');
    assert.equal(sent, 5);
  });
});
