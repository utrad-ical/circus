import createValidator, { Validator } from './createValidator';
import * as path from 'path';
import { ValidationError } from 'ajv';

let validator: Validator;

beforeAll(async () => {
  validator = await createValidator(
    path.join(__dirname, '../test/test-schemas')
  );
});

it('should validate correct partial data', async () => {
  const testData = { intVal: 10, strVal: 'foo' };
  await validator.validate('sample', testData); // shoudl not throw error
});

it('should throw with invalid data', async () => {
  const testData = { intVal: 10, strVal: 500 };
  await expect(validator.validate('sample', testData)).rejects.toThrow(
    ValidationError
  );
});

describe('special formats', () => {
  const testFormat = async (
    format: string,
    valids: string[],
    invalids: string[]
  ) => {
    for (const s of valids) {
      await expect(
        validator.validate({ type: 'string', format, $async: true }, s)
      ).resolves;
    }
    for (const s of invalids) {
      await expect(
        validator.validate({ type: 'string', format, $async: true }, s)
      ).rejects.toThrow(ValidationError);
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

  it('jsonString', async () => {
    await testFormat(
      'jsonString',
      ['"a"', '[1,5]', '{"a":50,"b":["c"]}'],
      ['{', 'a', '"']
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
    await testFormat('semver', ['1.2.0', '3.1.4-alpha'], ['alpha', '1.2.3.4']);
  });
});

it('should work with toDate mode', async () => {
  const testData = { intVal: 3, dateVal: '2112-09-03T00:00:00.000Z' };
  const result = await validator.validate('date', testData, 'toDate');
  expect(result.dateVal).toBeInstanceOf(Date);
  expect(result.dateVal.toISOString()).toBe('2112-09-03T00:00:00.000Z');
});

it('should work with fromDate mode', async () => {
  const iso = '2011-11-28T00:11:22.000Z';
  const testData = { intVal: 3, dateVal: new Date(iso) };
  const result = await validator.validate('date', testData, 'fromDate');
  expect(result.dateVal).toBe(iso);
});

it('should handle allRequired option', async () => {
  const testData = {
    intVal: 0,
    strVal: 'bar',
    dicomUid: '1.2.3',
    multiRange: '1'
  };
  await validator.validate('sample|allRequired', testData);
  delete testData.intVal;
  expect(validator.validate('sample|allRequired', testData)).rejects.toThrow(
    ValidationError
  );
});

it('should handle allRequiredExcept option', async () => {
  const testData = { intVal: 0, strVal: 'bar', multiRange: '1' };
  await validator.validate('sample|allRequiredExcept dicomUid', testData);
  delete testData.intVal;
  await expect(
    validator.validate('sample|allRequiredExcept dicomUid', testData)
  ).rejects.toThrow(ValidationError);
  await validator.validate(
    'sample|allRequiredExcept dicomUid,intVal',
    testData
  );
});

it('should handle only option', async () => {
  const testData = { dicomUid: '1.2.3' };
  await validator.validate('sample|only dicomUid', testData);
  await expect(
    validator.validate('sample|only dicomUid', { dicomUid: false })
  ).rejects.toThrow(ValidationError);
  await expect(
    validator.validate('sample|only intVal', testData)
  ).rejects.toThrow(ValidationError);
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
  await validator.validate('sample|dbEntry', goodData);

  const badData1 = { ...goodData, intVal: 'string' };
  await expect(validator.validate('sample|dbEntry', badData1)).rejects.toThrow(
    ValidationError
  );

  const badData2 = { ...goodData, createdAt: '2010-01-01' };
  await expect(validator.validate('sample|dbEntry', badData2)).rejects.toThrow(
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
  await validator.validate('sample|searchResult', goodData);

  const badData1 = { items: [goodItem, goodItem], totalItems: 2 };
  await expect(
    validator.validate('sample|searchResult', badData1)
  ).rejects.toThrow(ValidationError);

  const badData2 = { items: [goodItem, 'foo'], totalItems: 2, page: 1 };
  await expect(
    validator.validate('sample|searchResult', badData2)
  ).rejects.toThrow(ValidationError);
});

it('should fill defaults', async () => {
  const testData = {};
  const modified = await validator.validate('sample', testData, 'fillDefaults');
  expect(modified).toEqual({ intVal: 5, strVal: 'biscuit' });
});

it('should retrieve schema by key', async () => {
  const schema = await validator.getSchema('sample');
  expect(typeof schema).toBe('function');
  expect(typeof schema.schema).toBe('object');
});
