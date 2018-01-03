import createValidator from '../src/createValidator';
import { assert } from 'chai';
import * as path from 'path';
import { ValidationError } from 'ajv';
import { asyncThrows } from './test-utils';

describe('Validator', function() {
  let validator;

  before(async function() {
    validator = await createValidator(path.join(__dirname, 'test-schemas'));
  });

  it('should validate correct partial data', async function() {
    const testData = { intVal: 10, strVal: 'foo' };
    await validator.validate('sample', testData); // shoudl not throw error
  });

  it('should throw with invalid data', async function() {
    const testData = { intVal: 10, strVal: 500 };
    await asyncThrows(validator.validate('sample', testData), ValidationError);
  });

  describe('special formats', async function() {
    async function testFormat(format, valid, invalid) {
      for (const s of valid) {
        await validator.validate({ type: 'string', format, $async: true }, s);
      }
      for (const s of invalid) {
        await asyncThrows(
          validator.validate({ type: 'string', format, $async: true }, s),
          ValidationError
        );
      }
    }

    it('dicomUid', async function() {
      await testFormat(
        'dicomUid',
        ['1.2.840.10008.2000.11111.222.33333'],
        ['11..22']
      );
    });

    it('multiIntegerRange', async function() {
      await testFormat(
        'multiIntegerRange',
        ['1-5,7-103,1000,1050'],
        ['11--33']
      );
    });

    it('color', async function() {
      await testFormat(
        'color',
        ['#ffffff', '#000000', '#fab845'],
        ['#', 'red', '#FFFFFF', ' #ffff00', '#00ff00 ']
      );
    });

    it('kebab', async function() {
      await testFormat(
        'kebab',
        ['a-b', 'class-name', 'blue-yellow-red'],
        ['a--b', ' class-name', 'not*correct*']
      );
    });

    it('jsonString', async function() {
      await testFormat(
        'jsonString',
        ['"a"', '[1,5]', '{"a":50,"b":["c"]}'],
        ['{', 'a', '"']
      );
    });
  });

  it('should work with toDate mode', async function() {
    const testData = { intVal: 3, dateVal: '2112-09-03T00:00:00.000Z' };
    const result = await validator.validate('date', testData, 'toDate');
    assert.instanceOf(result.dateVal, Date);
    assert.equal(result.dateVal.toISOString(), '2112-09-03T00:00:00.000Z');
  });

  it('should work with fromDate mode', async function() {
    const iso = '2011-11-28T00:11:22.000Z';
    const testData = { intVal: 3, dateVal: new Date(iso) };
    const result = await validator.validate('date', testData, 'fromDate');
    assert.strictEqual(result.dateVal, iso);
  });

  it('should handle allRequired option', async function() {
    const testData = {
      intVal: 0,
      strVal: 'bar',
      dicomUid: '1.2.3',
      multiRange: '1'
    };
    await validator.validate('sample|allRequired', testData);
    delete testData.intVal;
    asyncThrows(
      validator.validate('sample|allRequired', testData),
      ValidationError
    );
  });

  it('should handle allRequiredExcept option', async function() {
    const testData = { intVal: 0, strVal: 'bar', multiRange: '1' };
    await validator.validate('sample|allRequiredExcept dicomUid', testData);
    delete testData.intVal;
    await asyncThrows(
      validator.validate('sample|allRequiredExcept dicomUid', testData),
      ValidationError
    );
    await validator.validate(
      'sample|allRequiredExcept dicomUid,intVal',
      testData
    );
  });

  it('should handle dbEntry option', async function() {
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
    await asyncThrows(
      validator.validate('sample|dbEntry', badData1),
      ValidationError
    );

    const badData2 = { ...goodData, createdAt: '2010-01-01' };
    await asyncThrows(
      validator.validate('sample|dbEntry', badData2),
      ValidationError
    );
  });

  it('should handle searchResult option', async function() {
    const goodItem = {
      intVal: 0,
      strVal: 'bar',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const goodData = { items: [goodItem, goodItem], totalItems: 2, page: 1 };
    await validator.validate('sample|searchResult', goodData);

    const badData1 = { items: [goodItem, goodItem], totalItems: 2 };
    await asyncThrows(
      validator.validate('sample|searchResult', badData1),
      ValidationError
    );

    const badData2 = { items: [goodItem, 'foo'], totalItems: 2, page: 1 };
    await asyncThrows(
      validator.validate('sample|searchResult', badData2),
      ValidationError
    );
  });

  it('should fill defaults', async function() {
    const testData = {};
    const modified = await validator.validate(
      'sample',
      testData,
      'fillDefaults'
    );
    assert.deepEqual(modified, { intVal: 5, strVal: 'biscuit' });
  });

  it('should retrieve schema by key', async function() {
    const schema = await validator.getSchema('sample');
    assert.isFunction(schema);
    assert.isObject(schema.schema);
  });
});
