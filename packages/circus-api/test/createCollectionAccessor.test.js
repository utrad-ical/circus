import { assert } from 'chai';
import createValidator from '../src/validation/createValidator';
import createCollectionAccessor from '../src/db/createCollectionAccessor';
import { ValidationError } from 'ajv';
import { asyncThrows, connectMongo, setUpMongoFixture } from './test-utils';

describe('createCollectionAccessor', function() {
	let db, testCollection;

	before(async function() {
		const validator = await createValidator(__dirname + '/test-schemas');
		db = await connectMongo();
		testCollection = await createCollectionAccessor(db, validator, {
			validator,
			schema: 'months',
			collectionName: 'months',
			primaryKey: 'month'
		});
	});

	beforeEach(async function() {
		if (db) {
			await setUpMongoFixture(db, ['months']);
		}
	});

	after(async function() {
		if (db) {
			const col = db.collection('months');
			await col.deleteMany({});
			await db.close();
		}
	});

	describe('#insert', function() {
		it('should insert a single document after successful validation', async function() {
			await testCollection.insert({ month: 8, name: 'Hazuki' });
			const result = await db.collection('months').find({ month: 8 }).project({ _id: 0 }).toArray();
			assert.isArray(result);
			assert.equal(result.length, 1);
			assert.include(result[0], { month: 8, name: 'Hazuki' });
			assert.instanceOf(result[0].createdAt, Date);
			assert.instanceOf(result[0].updatedAt, Date);
		});

		it('should raise an error on trying to insert invalid data', async function() {
			await asyncThrows(
				testCollection.insert({ month: 'hello', name: 10 }),
				ValidationError
			);
			await asyncThrows(
				testCollection.insert({ month: 5 }),
				ValidationError
			);
			await asyncThrows(
				testCollection.insert({ }),
				ValidationError
			);
		});
	});

	describe('#insertMany', function() {
		it('should insert multiple documents after successful validation', async function() {
			await testCollection.insertMany([
				{ month: 6, name: 'Minazuki' },
				{ month: 8, name: 'Hazuki' }
			]);
			const result = await db.collection('months').find(
				{ $or: [ { month: 6 }, { month: 8 } ] }
			).project({ _id: false }).sort({ month: 1 }).toArray();
			assert.deepInclude(result[0], { month: 6, name: 'Minazuki' });
			assert.deepInclude(result[1], { month: 8, name: 'Hazuki' });
		});

		it('should throw when validation fails', async function() {
			await asyncThrows(testCollection.insertMany([
				{ month: 6, name: 'Minazuki' },
				{ month: 8, name: 17 }
			]), ValidationError);
		});
	});

	describe('#findAll', function() {
		it('should find an array of matched documents without _id', async function() {
			const result = await testCollection.findAll({ month: 4 });
			assert.equal(result.length, 2);
			assert.include(result[0], { month: 4, name: 'Uzuki' });
			assert.include(result[1], { month: 4, name: 'Uzuki' });
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
			await asyncThrows(testCollection.findByIdOrFail(7), ValidationError);
		});
	});

	describe('#findByIdOrFail', function() {
		it('should return valid data when primary key is given', async function() {
			const result = await testCollection.findByIdOrFail(3);
			assert.equal(result.name, 'Yayoi');
			assert.isUndefined(result._id);
		});

		it('should throw when trying to load nonexistent data', async function() {
			await asyncThrows(testCollection.findByIdOrFail(13));
		});
	});

	describe('#modifyOne', function() {
		it('should perform mutation and returns the modified data', async function() {
			const original = await testCollection.modifyOne(2, { name: 'Nigatsu' });
			assert.equal(original.name, 'Nigatsu');
			const modified = await testCollection.findById(2);
			assert.equal(modified.name, 'Nigatsu');
		});

		it('should throw an error with invalid data', async function() {
			asyncThrows(testCollection.modifyOne(3, { name: 5 }), ValidationError);
		});

		it('should return null if nothing changed', async function() {
			const noSuchMonth = await testCollection.modifyOne(13, { $set: { name: 'Pon' } });
			assert.isNull(noSuchMonth);
		});
	});

});