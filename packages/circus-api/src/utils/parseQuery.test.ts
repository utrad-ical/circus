import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseQuery } from './parseQuery.ts';

test('preserves repeated parameters, empty values and decoded text', () => {
  const query = parseQuery(
    'https://example.org/api/cases?tag=a&name=a+b%2Bc&empty=&tag=b&__proto__=value'
  );
  assert.deepEqual(query.tag, ['a', 'b']);
  assert.equal(query.name, 'a b+c');
  assert.equal(query.empty, '');
  assert.equal(query.missing, undefined);
  assert.equal(query.__proto__, 'value');
  assert.equal(Object.getPrototypeOf(query), null);
});

test('parses relative URLs with the same parameter limit', () => {
  const params = new URLSearchParams();
  for (let i = 0; i <= 1000; i++) params.append('tag', String(i));
  const { tag } = parseQuery('/rs/ws/volume?' + params);
  assert.ok(Array.isArray(tag));
  assert.equal(tag.length, 1000);
  assert.equal(tag.at(-1), '999');
});
