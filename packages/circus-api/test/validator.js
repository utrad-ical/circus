import createValidator from '../src/validation/createValidator';
import { assert } from 'chai';

describe('validator', function() {
	let validator;

	before(async function() {
		validator = await createValidator();
	});

	it('should validate user data', function() {
		const testData = {
			userEmail: 'a@b.c',
			loginId: 'bar',
			description: 'foo',
			groups: []
		};
		assert.isTrue(validator.validate('user', testData));
	});
	
	it('should validate project data', function() {
		const testData = {
			projectId: 'aaaaaaaaaa',
			projectName: 'MRA',
			tags: [],
			caseAttributesSchema: [
				{ key: 'smoking', caption: 'Smoking Index', type: 'number' },
				{ key: 'hypertension', caption: 'Hypertension', type: 'boolean' },
			],
			labelAttributesSchema: [],
			windowPresets: [{ label: 'lung', width: 1000, level: -100 }],
			windowPriority: 'auto',
			groups: []
		};
		const result = validator.validate('project', testData);
		// console.log(validator.errors);
		assert.isTrue(result);
	});
});

