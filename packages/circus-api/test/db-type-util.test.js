import { assert } from 'chai';
import { dateToString } from '../src/db/type-util';

describe('db-type-util', function() {
	describe('#dateToString', function() {
		it('should convert Mongo Date to ISO string', function() {

			function test(input, exp) {
				assert.deepEqual(dateToString(input), exp);
			}

			const str = '2112-09-03T05:00:00.000Z';
			const obj = new Date(str);

			test({ createdAt: obj }, { createdAt: str });
			test({ createdAt: obj, updatedAt: obj }, { createdAt: str, updatedAt: str });
			test({ a: { b: { c: obj, d: obj } } }, { a: { b: { c: str, d: str } } });
			// test([obj, obj, obj], [str, str, str]);
		});
	});
});