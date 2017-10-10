import createValidator from '../src/validation/createValidator';
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

	it('should validate errorneous data', async function() {
		const testData = { intVal: 10, strVal: 500 };
		await asyncThrows(
			validator.validate('sample', testData),
			ValidationError
		);
	});

	it('should validate special formats', async function() {
		const correctData = {
			dicomUid: '1.2.840.10008.2000.11111.222.33333',
			multiRange: '1-5,7-103,1000,1050'
		};
		const wrongData1 = { dicomUid: '11..22' };
		const wrongData2 = { multiRange: '11--33' };

		await validator.validate('sample', correctData);
		await asyncThrows(
			validator.validate('sample', wrongData1),
			ValidationError
		);
		await asyncThrows(
			validator.validate('sample', wrongData2),
			ValidationError
		);
	});

	it('should convert to Date', async function() {
		const testData = { intVal: 3, dateVal: '2112-09-03T00:00:00.000Z' };
		const result = await validator.validate('date', testData, validator.toDate);
		assert.instanceOf(result.dateVal, Date);
		assert.equal(result.dateVal.toISOString(), '2112-09-03T00:00:00.000Z');
	});

	it('should convert from Date', async function() {
		const iso = '2011-11-28T00:11:22.000Z';
		const testData = { intVal: 3, dateVal: new Date(iso) };
		const result = await validator.validate('date', testData, validator.fromDate);
		assert.strictEqual(result.dateVal, iso);
	});

	it('should hanldle "all" validation', async function() {
		const testData = {
			intVal: 0, strVal: 'bar', dicomUid: '1.2.3', multiRange: '1'
		};
		await validator.validate('sample', testData, validator.allRequired);
		delete testData.intVal;
		asyncThrows(
			validator.validate('sample', testData, validator.allRequired),
			ValidationError
		);
	});

	it('should fill defaults', async function() {
		const testData = {};
		const modified = await validator.validate('sample', testData, validator.fillDefaults);
		assert.deepEqual(modified, { intVal: 5, strVal: 'biscuit' });
	});

	it('should retrieve schema by key', async function() {
		const schema = await validator.getSchema('sample');
		assert.isFunction(schema);
		assert.isObject(schema.schema);
	});

});

