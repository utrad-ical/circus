import createValidator from '../src/validation/createValidator';
import { assert } from 'chai';

describe('validator', function() {
	let validator;

	before(async function() {
		validator = await createValidator();
	});

	it('should validate user data', async function main() {
		const testData = {
			userEmail: 'a@b.c',
			loginId: 'bar',
			description: 'foo',
			groups: []
		};
		assert.isTrue(validator.validate('user', testData));
	});
});

