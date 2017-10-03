import { assert } from 'chai';
import createValidator from '../src/validation/createValidator';
import createCollectionAccessor from '../src/db/createCollectionAccessor';
import { MongoClient } from 'mongodb';

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
		}
	});

	after(async function() {
		if (db) {
			const col = db.collection('test');
			await col.deleteMany({});
			await db.close();
		}
	});

	it('basic CRUD', async function() {
		await testCollection.insert({ intVal: 128, strVal: 'hello' });
		const result = await testCollection.findAll({ intVal: 128 });
		assert.isArray(result);
		assert.equal(result[0].strVal, 'hello');

		await testCollection.deleteMany({ intVal: 128 });
		const shouldBeEmpty = await testCollection.findAll({ intVal: 128 });
		assert.deepEqual(shouldBeEmpty, []);
	});

	it('#getOneAndFail', async function() {
		await testCollection.insert({ intVal: 128, strVal: 'hello' });
		const result2 = await testCollection.getOne(128);
		assert.equal(result2.strVal, 'hello');
		try {
			const data = await testCollection.getOneAndFail(999);
			console.log(data);
		} catch (err) {
			assert.equal(err.status, 404);
			return;
		}
		throw new Error('Exception expected');
	});

	it('should raise an error on trying to insert invalid data', async function() {
		try {
			await testCollection.insert({ intVal: 'hello', strVal: 10 });
		} catch(err) {
			return;
		}
		throw new Error('Exception expected');
	});
});