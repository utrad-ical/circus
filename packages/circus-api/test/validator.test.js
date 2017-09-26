import createValidator from '../src/validation/createValidator';
import { assert } from 'chai';
import * as path from 'path';

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
		try {
			await validator.validate('sample', testData);
		} catch (err) {
			return;
		}
		throw new Error('Validator did not throw an error');
	});

	it('should validate special formats', async function() {
		const testData = {
			dicomUid: '1.2.840.10008.2000.11111.222.33333',
			multiRange: '1-5,7-103,1000,1050'
		};
		await validator.validate('sample', testData);
	});
	
	it('should hanldle "all" validation', async function() {
		const testData = {
			intVal: 0, strVal: 'bar', dicomUid: '1.2.3', multiRange: '1'
		};
		await validator.validate('sampleAll', testData);
		delete testData.intVal;
		try {
			await validator.validate('sampleAll', testData);
		} catch(err) {
			return;
		}
		throw new Error('Validator did not throw an error');
	});

	it('should fill defaults', async function() {
		const testData = {};
		const modified = await validator.validateWithDefaults('sample', testData);
		assert.deepEqual(modified, { intVal: 5, strVal: 'biscuit' });
	});

});

