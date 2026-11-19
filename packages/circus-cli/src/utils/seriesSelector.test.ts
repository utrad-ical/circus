import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  countImages,
  defaultRange,
  fetchSeries,
  parseRange,
  parseSeriesSpec
} from './seriesSelector.ts';

describe('parseRange', () => {
  test('accepts a range within the images', () => {
    assert.deepEqual(parseRange('1:31:2', '1-132'), {
      start: 1,
      end: 31,
      delta: 2
    });
    assert.deepEqual(parseRange(' 31 : 1 : -1 ', '1-132'), {
      start: 31,
      end: 1,
      delta: -1
    });
    assert.deepEqual(parseRange('5:5:1', '1-3,5'), {
      start: 5,
      end: 5,
      delta: 1
    });
  });

  test('rejects invalid ranges', () => {
    for (const text of [
      '',
      '1:31',
      '1-31',
      'a:b:c',
      '1:31:0',
      '1:30:2', // cannot reach the end
      '31:1:1', // wrong direction
      '1:200:1', // out of the images
      '1:5:1', // 4 is missing
      '1:1000000000:1'
    ]) {
      assert.equal(
        typeof parseRange(text, '1-3,5-132'),
        'string',
        JSON.stringify(text)
      );
    }
  });
});

test('parseSeriesSpec', () => {
  assert.deepEqual(parseSeriesSpec('1.2.3'), {
    seriesUid: '1.2.3',
    range: undefined
  });
  assert.deepEqual(parseSeriesSpec('1.2.3:1:31:2'), {
    seriesUid: '1.2.3',
    range: '1:31:2'
  });
  assert.throws(() => parseSeriesSpec('1.2.3:1:31'));
  for (const spec of [
    'ああああ',
    '1..2',
    '1.2.',
    '1',
    ':1:2:3',
    `1.${'2'.repeat(63)}`
  ]) {
    assert.throws(() => parseSeriesSpec(spec), /Invalid Series UID/);
  }
});

test('defaultRange and countImages', () => {
  assert.deepEqual(defaultRange('3-10,20-30'), { start: 3, end: 10, delta: 1 });
  assert.equal(countImages({ start: 31, end: 1, delta: -2 }), 16);
});

describe('fetchSeries', () => {
  const fakeFetch = async (resource: string) => {
    if (resource === 'series/1.2.3')
      return Response.json({
        images: '1-132,140-149',
        modality: 'MR',
        seriesDescription: 'T2',
        studyUid: '1.2'
      });
    throw Object.assign(new Error('HTTP error'), { status: 404 });
  };

  test('returns the series with the range', async () => {
    const series = await fetchSeries(
      fakeFetch,
      '1.2.3',
      defaultRange,
      '1:31:2'
    );
    assert.deepEqual(series, {
      seriesUid: '1.2.3',
      studyUid: '1.2',
      range: { start: 1, end: 31, delta: 2 },
      images: '1-132,140-149',
      modality: 'MR',
      seriesDescription: 'T2'
    });
    const automatic = await fetchSeries(
      fakeFetch,
      '1.2.3',
      () => 'auto' as const
    );
    assert.equal(automatic.range, 'auto');
    const firstRange = await fetchSeries(fakeFetch, '1.2.3', defaultRange);
    assert.deepEqual(firstRange.range, { start: 1, end: 132, delta: 1 });
  });

  test('throws readable errors', async () => {
    await assert.rejects(fetchSeries(fakeFetch, '9.9.9', defaultRange), {
      message: 'Series 9.9.9 not found.'
    });
    await assert.rejects(
      fetchSeries(fakeFetch, '1.2.3', defaultRange, '1:200:1'),
      {
        message: /not within the images/
      }
    );
  });

  test('rejects an invalid UID before calling the API', async () => {
    const fetch = async () =>
      assert.fail('An invalid UID must not be fetched.');
    await assert.rejects(fetchSeries(fetch, 'ああああ', defaultRange), {
      message:
        'Invalid Series UID. Use dot-separated numbers (up to 64 characters).'
    });
  });
});
