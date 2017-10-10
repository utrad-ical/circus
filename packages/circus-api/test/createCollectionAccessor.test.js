import { assert } from 'chai';
import createValidator from '../src/validation/createValidator';
import createCollectionAccessor from '../src/db/createCollectionAccessor';
import { ValidationError } from 'ajv';
import { connectMongo } from './koa-test';

describe('createCollectionAccessor', function() {
	let db, testCollection;

	before(async function() {
		const validator = await createValidator(__dirname + '/test-schemas');
		db = await connectMongo();
		testCollection = await createCollectionAccessor(db, validator, {
			validator,
			schema: 'months',
			collectionName: 'test',
			primaryKey: 'month'
		});
	});

	beforeEach(async function() {
		if (db) {
			const col = db.collection('test');
			await col.deleteMany({});
			await col.insertMany([
				{ month: 2, name: 'Kisaragi' },
				{ month: 3, name: 'Yayoi' },
				{ month: 4, name: 'Uzuki' },
				{ month: 4, name: 'Uzuki' }, // dupe!
				{ month: 7, name: true } // invalid data!
			]);
		}
	});

	after(async function() {
		if (db) {
			const col = db.collection('test');
			await col.deleteMany({});
			await db.close();
		}
	});

	async function shouldFail(func, type) {
		try {
			await func();
		} catch(err) {
			if (type) assert(err instanceof type, 'Unexpected error type');
			return;
		}
		throw new Error('Did not throw');
	}

	describe('#insert', function() {
		it('should insert a single document after successful validation', async function() {
			await testCollection.insert({ month: 8, name: 'Hazuki' });
			const result = await db.collection('test').find({ month: 8 }).project({ _id: 0 }).toArray();
			assert.deepEqual(result, [{ month: 8, name: 'Hazuki' }]);
		});

		it('should raise an error on trying to insert invalid data', async function() {
			await shouldFail(() => testCollection.insert({ month: 'hello', name: 10 }));
			await shouldFail(() => testCollection.insert({ month: 5 }));
			await shouldFail(() => testCollection.insert({ }));
		});
	});

	describe('#insertMany', function() {
		it('should insert multiple documents after successful validation', async function() {
			await testCollection.insertMany([
				{ month: 6, name: 'Minazuki' },
				{ month: 8, name: 'Hazuki' }
			]);
			const result = await db.collection('test').find(
				{ $or: [ { month: 6 }, { month: 8 } ] }
			).project({ _id: false }).sort({ month: 1 }).toArray();
			assert.deepEqual(result, [
				{ month: 6, name: 'Minazuki' },
				{ month: 8, name: 'Hazuki' }
			]);
		});

		it('should throw when validation fails', async function() {
			await shouldFail(async() => {
				await testCollection.insertMany([
					{ month: 6, name: 'Minazuki' },
					{ month: 8, name: 17 }
				]);
			});
		});
	});

	describe('#findAll', function() {
		it('should find an array of matched documents without _id', async function() {
			const result = await testCollection.findAll({ month: 4 });
			assert.deepEqual(
				result,
				[{ month: 4, name: 'Uzuki' }, { month: 4, name: 'Uzuki' }]
			);
		});

		it('should return an empty array if nothing matched', async function() {
			const result = await testCollection.findAll({ month: 13 });
			assert.deepEqual(result, []);
		});
	});

	describe('#deleteMany', function() {
		it('should delete multiple documents at once', async function() {
			await testCollection.deleteMany({ month: 4 });
			const shouldBeEmpty = await testCollection.findAll({ month: 4 });
			assert.deepEqual(shouldBeEmpty, []);
		});
	});

	describe('#findById', function() {
		it('should return valid data without _id for the given primary key', async function() {
			const result = await testCollection.findById(3);
			assert.equal(result.name, 'Yayoi');
			assert.isUndefined(result._id);
		});

		it('should raise an error when trying to load corrupted data', async function() {
			await shouldFail(async () => await testCollection.findByIdOrFail(7), ValidationError);
		});
	});

	describe('#findByIdOrFail', function() {
		it('should return valid data when primary key is given', async function() {
			const result = await testCollection.findByIdOrFail(3);
			assert.equal(result.name, 'Yayoi');
			assert.isUndefined(result._id);
		});

		it('should throw when trying to load nonexistent data', async function() {
			await shouldFail(async () => await testCollection.findByIdOrFail(13));
		});
	});

	describe('#modifyOne', function() {
		it('should perform mutation and returns the modified data', async function() {
			const original = await testCollection.modifyOne(2, { $set: { name: 'Nigatsu' } });
			assert.equal(original.name, 'Nigatsu');
			const modified = await testCollection.findById(2);
			assert.equal(modified.name, 'Nigatsu');
		});

		it('should throw an error with invalid data', async function() {
			shouldFail(async() => await testCollection.modifyOne(3, { name: 5 }), ValidationError);
		});

		it('should return null if nothing changed', async function() {
			const noSuchMonth = await testCollection.modifyOne(13, { $set: { name: 'Pon' } });
			assert.isNull(noSuchMonth);
		});
	});

});