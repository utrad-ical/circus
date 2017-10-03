import { assert } from 'chai';
import createValidator from '../src/validation/createValidator';
import createCollectionAccessor from '../src/db/createCollectionAccessor';
import { MongoClient } from 'mongodb';
import { ValidationError } from 'ajv';

const url = process.env.MONGO_URL;

describe('createDataSource', function() {
	let db, testCollection;

	before(async function() {
		const validator = await createValidator(__dirname + '/test-schemas');
		db = await MongoClient.connect(url);
		testCollection = await createCollectionAccessor(db, {
			validator,
			schema: 'sample',
			collectionName: 'test',
			primaryKey: 'intVal'
		});
	});

	beforeEach(async function() {
		if (db) {
			const col = db.collection('test');
			await col.deleteMany({});
			await col.insertMany([
				{ intVal: 2, strVal: 'Kisaragi' },
				{ intVal: 3, strVal: 'Yayoi' },
				{ intVal: 4, strVal: 'Uzuki' },
				{ intVal: 4, strVal: 'Uzuki' }, // dupe!
				{ intVal: 7, strVal: true } // invalid data!
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

	it('#findAll', async function() {
		const result = await testCollection.findAll({ intVal: 4 });
		assert.isArray(result);
		assert(result.length == 2);
		assert.equal(result[0].strVal, 'Uzuki');

		const result2 = await testCollection.findAll({ intVal: 13 });
		assert.deepEqual(result2, []);
	});

	it('#deleteAll', async function() {
		await testCollection.deleteMany({ intVal: 4 });
		const shouldBeEmpty = await testCollection.findAll({ intVal: 4 });
		assert.deepEqual(shouldBeEmpty, []);
	});

	describe('#getOne', function() {
		it('should return valid data', async function() {
			const result = await testCollection.getOne(3);
			assert.equal(result.strVal, 'Yayoi');
		});

		it('should raise an error when trying to load corrupted data', async function() {
			await shouldFail(async () => await testCollection.getOneAndFail(7), ValidationError);
		});
	});

	describe('#getOneAndFail', function() {
		it('should return valid data', async function() {
			const result = await testCollection.getOne(3);
			assert.equal(result.strVal, 'Yayoi');
		});

		it('should raise an error when trying to load nonexistent data', async function() {
			await shouldFail(async () => await testCollection.getOneAndFail(13));
		});
	});

	it('#modifyOne', async function() {
		const original = await testCollection.modifyOne(2, { $set: { strVal: 'Nigatsu' } });
		assert.equal(original.strVal, 'Nigatsu');
		const modified = await testCollection.getOne(2);
		assert.equal(modified.strVal, 'Nigatsu');

		const noSuchMonth = await testCollection.modifyOne(13, { $set: { strVal: 'Pon' } });
		assert.isNull(noSuchMonth);
	});

	it('should raise an error on trying to insert invalid data', async function() {
		await shouldFail(async() => await testCollection.insert({ intVal: 'hello', strVal: 10 }));
	});
});