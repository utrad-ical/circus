import t from '../test/test-schemas.ts';
import assert from 'node:assert/strict';
import { describe, test, before } from 'node:test';
import { z } from 'zod';
import createValidator, { ValidationError } from './createValidator.ts';
import type { Validator } from './interface.ts';
import * as formats from '@utrad-ical/circus-api-schema/formats';
import {
  allRequiredExcept,
  exclude,
  only,
  searchResult,
  searchResultOf,
  withDates
} from './schemas/derive.ts';

let validator: Validator;

before(async () => {
  validator = await createValidator(undefined);
});

test('accepts valid partial data', async () => {
  const testData = { intVal: 10, strVal: 'foo' };
  await validator.validate(t.sample, testData); // shoudl not throw error
});

test('rejects invalid field values', async () => {
  const testData = { intVal: 10, strVal: 500 };
  await assert.rejects(validator.validate(t.sample, testData), ValidationError);
});

describe('special formats', () => {
  const testFormat = async (
    format: keyof typeof formats,
    valids: string[],
    invalids: string[]
  ) => {
    const schema = (formats[format] as () => z.ZodType)();
    for (const s of valids) {
      await validator.validate(schema, s);
    }
    for (const s of invalids) {
      await assert.rejects(validator.validate(schema, s), ValidationError);
    }
  };

  test('dicomUid', async () => {
    await testFormat(
      'dicomUid',
      [
        '1.2.840.10008.2000.11111.222.33333',
        '1.'.repeat(31) + '11',
        // This contains nonstandard component `00`, but we'll accept this
        '11.00.33.4444.333355'
      ],
      ['11..22', '1.'.repeat(31) + '111']
    );
  });

  test('sha1hex', async () => {
    await testFormat(
      'sha1hex',
      ['7c04994483c90d718d35d3ffb147cc3a31256f8f'],
      [
        'zc04994483c90d718d35d3ffb147cc3a31256f8f', // invalid 'z'
        'c04994483c90d718d35d3ffb147cc3a31256f8f' // short
      ]
    );
  });

  test('multiIntegerRange', async () => {
    await testFormat('multiIntegerRange', ['1-5,7-103,1000,1050'], ['11--33']);
  });

  test('color', async () => {
    await testFormat(
      'color',
      ['#ffffff', '#000000', '#fab845'],
      ['#', 'red', '#FFFFFF', ' #ffff00', '#00ff00 ']
    );
  });

  test('kebab', async () => {
    await testFormat(
      'kebab',
      ['a-b', 'class-name', 'blue-yellow-red'],
      ['a--b', ' class-name', 'not*correct*']
    );
  });

  test('dockerId', async () => {
    await testFormat(
      'dockerId',
      ['3cbe016446c6d1881d729677c596c9896088841d23c979cb66d044d2e0ad84bd'],
      ['6d1881d729677c596c9896088841d23c979cb66d044d2e0ad84bd']
    );
  });

  test('semver', async () => {
    await testFormat(
      'semverString',
      ['1.2.0', '3.1.4-alpha'],
      ['alpha', '1.2.3.4']
    );
  });
});

test('decodes an ISO date string into a Date', async () => {
  const testData = { intVal: 3, dateVal: '2112-09-03T00:00:00.000Z' };
  const result = await validator.validate(t.date, testData, 'decode');
  assert.ok(result.dateVal instanceof Date);
  assert.equal(result.dateVal.toISOString(), '2112-09-03T00:00:00.000Z');
});

test('encodes a Date as an ISO date string', async () => {
  const iso = '2011-11-28T00:11:22.000Z';
  const testData = { intVal: 3, dateVal: new Date(iso) };
  const result = await validator.validate(t.date, testData, 'encode');
  assert.equal(result.dateVal, iso);
});

test('requires every field in a required schema', async () => {
  const testData: any = {
    intVal: 0,
    strVal: 'bar',
    dicomUid: '1.2.3',
    multiRange: '1'
  };
  await validator.validate(t.sample.required(), testData);
  delete testData.intVal;
  await assert.rejects(
    validator.validate(t.sample.required(), testData),
    ValidationError
  );
});

test('requires every field except the listed exceptions', async () => {
  const testData: any = { intVal: 0, strVal: 'bar', multiRange: '1' };
  await validator.validate(allRequiredExcept(t.sample, ['dicomUid']), testData);
  delete testData.intVal;
  await assert.rejects(
    validator.validate(allRequiredExcept(t.sample, ['dicomUid']), testData),
    ValidationError
  );
  await validator.validate(
    allRequiredExcept(t.sample, ['dicomUid', 'intVal']),
    testData
  );
});

test('validates the selected fields', async () => {
  const testData = { dicomUid: '1.2.3' };
  await validator.validate(only(t.sample, ['dicomUid']), testData);
  await assert.rejects(
    validator.validate(only(t.sample, ['dicomUid']), { dicomUid: false }),
    ValidationError
  );
  await assert.rejects(
    validator.validate(only(t.sample, ['intVal']), testData),
    ValidationError
  );
});

test('validates document fields and timestamps', async () => {
  const goodData = {
    intVal: 0,
    strVal: 'bar',
    dicomUid: '1.2.3',
    multiRange: '1',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  await validator.validate(withDates(t.sample.required()), goodData);

  const badData1 = { ...goodData, intVal: 'string' };
  await assert.rejects(
    validator.validate(withDates(t.sample.required()), badData1),
    ValidationError
  );

  const badData2 = { ...goodData, createdAt: '2010-01-01' };
  await assert.rejects(
    validator.validate(withDates(t.sample.required()), badData2),
    ValidationError
  );
});

test('validates search results against item and pagination schemas', async () => {
  const goodItem = {
    intVal: 0,
    strVal: 'bar',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const goodData = { items: [goodItem, goodItem], totalItems: 2, page: 1 };
  await validator.validate(searchResult(t.sample), goodData);

  const badData1 = { items: [goodItem, goodItem], totalItems: 2 };
  await assert.rejects(
    validator.validate(searchResult(t.sample), badData1),
    ValidationError
  );

  const badData2 = { items: [goodItem, 'foo'], totalItems: 2, page: 1 };
  await assert.rejects(
    validator.validate(searchResult(t.sample), badData2),
    ValidationError
  );
});

test('rejects fields excluded from the schema', async () => {
  await validator.validate(exclude(t.sample, ['intVal']), { strVal: 'a' });
  await assert.rejects(
    validator.validate(exclude(t.sample, ['intVal']), { intVal: 1 }),
    ValidationError
  );
});

test('validates fields added to the schema', async () => {
  const def = t.sample.extend({ extra: t.date.optional() });
  await validator.validate(def, { extra: { intVal: 1 } });
  await assert.rejects(
    validator.validate(def, { extra: { intVal: 'x' } }),
    ValidationError
  );
});

test('accepts either schema and allows both in a search result', async () => {
  await validator.validate(z.union([t.sample, t.item]), { intVal: 1 });
  await validator.validate(z.union([t.sample, t.item]), { itemId: 1 });
  await assert.rejects(
    validator.validate(z.union([t.sample, t.item]), { intVal: 1, itemId: 1 }),
    ValidationError
  );
  // A search result can mix the alternatives
  const dates = { createdAt: new Date(), updatedAt: new Date() };
  await validator.validate(
    searchResultOf(z.union([withDates(t.sample), withDates(t.item)])),
    {
      items: [
        { intVal: 1, ...dates },
        { itemId: 1, ...dates }
      ],
      totalItems: 2,
      page: 1
    }
  );
});

test('ignores unknown keys only when asked', async () => {
  const data = { intVal: 1, unknown: 2 };
  await assert.rejects(validator.validate(t.sample, data), ValidationError);
  await validator.validate(t.sample, data, 'check', {
    allowUnknownKeys: true
  });
  await assert.rejects(
    validator.validate(t.sample, { intVal: 'x', unknown: 2 }, 'check', {
      allowUnknownKeys: true
    }),
    ValidationError
  );
});

test('includes the field path in validation errors', async () => {
  const err = await validator
    .validate(searchResult(t.sample), {
      items: [{ intVal: 'x', createdAt: new Date(), updatedAt: new Date() }],
      totalItems: 1,
      page: 1
    })
    .catch(e => e);
  assert.ok(err instanceof ValidationError);
  assert.deepEqual(err.issues[0].path, ['items', 0, 'intVal']);
  assert.match(err.message, /items\[0\]\.intVal: /);
});

test('includes the nested field path in union validation errors', async () => {
  const schema = z.union([
    z.strictObject({ type: z.literal('a'), a: z.number() }),
    z.strictObject({ type: z.literal('b'), b: z.number() })
  ]);
  const err = await validator
    .validate(schema, { type: 'b', b: 'x' })
    .catch(e => e);
  assert.ok(err instanceof ValidationError);
  assert.deepEqual(err.issues[0].path, ['b']);
});

test('accepts NaN and invalid Date objects', async () => {
  // These can come from DICOM parsing
  await validator.validate(formats.num({ min: 0 }), NaN);
  await validator.validate(t.date, { dateVal: new Date(NaN) });
});
