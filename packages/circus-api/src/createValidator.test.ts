import t from '../test/test-schemas.ts';
import assert from 'node:assert/strict';
import { describe, it, before } from 'node:test';
import { z } from 'zod';
import createValidator, { ValidationError } from './createValidator.ts';
import type { Validator } from './interface.ts';
import * as formats from './schemas/formats.ts';
import {
  allRequiredExcept,
  dbEntry,
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

it('should validate correct partial data', async () => {
  const testData = { intVal: 10, strVal: 'foo' };
  await validator.validate(t.sample, testData); // shoudl not throw error
});

it('should throw with invalid data', async () => {
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

  it('dicomUid', async () => {
    await testFormat(
      'dicomUid',
      [
        '1.2.840.10008.2000.11111.222.33333',
        // This contains nonstandard component `00`, but we'll accept this
        '11.00.33.4444.333355'
      ],
      ['11..22']
    );
  });

  it('sha1hex', async () => {
    await testFormat(
      'sha1hex',
      ['7c04994483c90d718d35d3ffb147cc3a31256f8f'],
      [
        'zc04994483c90d718d35d3ffb147cc3a31256f8f', // invalid 'z'
        'c04994483c90d718d35d3ffb147cc3a31256f8f' // short
      ]
    );
  });

  it('multiIntegerRange', async () => {
    await testFormat('multiIntegerRange', ['1-5,7-103,1000,1050'], ['11--33']);
  });

  it('color', async () => {
    await testFormat(
      'color',
      ['#ffffff', '#000000', '#fab845'],
      ['#', 'red', '#FFFFFF', ' #ffff00', '#00ff00 ']
    );
  });

  it('kebab', async () => {
    await testFormat(
      'kebab',
      ['a-b', 'class-name', 'blue-yellow-red'],
      ['a--b', ' class-name', 'not*correct*']
    );
  });

  it('dockerId', async () => {
    await testFormat(
      'dockerId',
      ['3cbe016446c6d1881d729677c596c9896088841d23c979cb66d044d2e0ad84bd'],
      ['6d1881d729677c596c9896088841d23c979cb66d044d2e0ad84bd']
    );
  });

  it('semver', async () => {
    await testFormat(
      'semverString',
      ['1.2.0', '3.1.4-alpha'],
      ['alpha', '1.2.3.4']
    );
  });
});

it('should work with decode mode', async () => {
  const testData = { intVal: 3, dateVal: '2112-09-03T00:00:00.000Z' };
  const result = await validator.validate(t.date, testData, 'decode');
  assert.ok(result.dateVal instanceof Date);
  assert.equal(result.dateVal.toISOString(), '2112-09-03T00:00:00.000Z');
});

it('should work with encode mode', async () => {
  const iso = '2011-11-28T00:11:22.000Z';
  const testData = { intVal: 3, dateVal: new Date(iso) };
  const result = await validator.validate(t.date, testData, 'encode');
  assert.equal(result.dateVal, iso);
});

it('should handle allRequired option', async () => {
  const testData: any = {
    intVal: 0,
    strVal: 'bar',
    dicomUid: '1.2.3',
    multiRange: '1'
  };
  await validator.validate(t.sample.required(), testData);
  delete testData.intVal;
  assert.rejects(
    validator.validate(t.sample.required(), testData),
    ValidationError
  );
});

it('should handle allRequiredExcept option', async () => {
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

it('should handle only option', async () => {
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

it('should handle dbEntry option', async () => {
  const goodData = {
    intVal: 0,
    strVal: 'bar',
    dicomUid: '1.2.3',
    multiRange: '1',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  await validator.validate(dbEntry(t.sample), goodData);

  const badData1 = { ...goodData, intVal: 'string' };
  await assert.rejects(
    validator.validate(dbEntry(t.sample), badData1),
    ValidationError
  );

  const badData2 = { ...goodData, createdAt: '2010-01-01' };
  await assert.rejects(
    validator.validate(dbEntry(t.sample), badData2),
    ValidationError
  );
});

it('should handle searchResult option', async () => {
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

it('should handle exclude option', async () => {
  await validator.validate(exclude(t.sample, ['intVal']), { strVal: 'a' });
  await assert.rejects(
    validator.validate(exclude(t.sample, ['intVal']), { intVal: 1 }),
    ValidationError
  );
});

it('should handle addProperty option', async () => {
  const def = t.sample.extend({ extra: t.date.optional() });
  await validator.validate(def, { extra: { intVal: 1 } });
  await assert.rejects(
    validator.validate(def, { extra: { intVal: 'x' } }),
    ValidationError
  );
});

it('should handle alternatives', async () => {
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

it('should ignore unknown keys only when asked', async () => {
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

it('should report errors with paths', async () => {
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

it('should report the path inside an alternative', async () => {
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

it('should accept NaN numbers and invalid dates', async () => {
  // These can come from DICOM parsing
  await validator.validate(formats.num({ min: 0 }), NaN);
  await validator.validate(t.date, { dateVal: new Date(NaN) });
});
