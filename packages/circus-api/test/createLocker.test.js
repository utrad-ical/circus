import * as test from './test-utils';
import createLocker from '../src/db/createLocker';

async function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

describe('createLocker', function() {
	let db, locker;

	before(async function() {
		db = await test.connectMongo();
		await db.collection('locks').deleteMany({});
		locker = await createLocker(db);
	});

	after(async function() {
		if (db) await db.close();
	});

	it('should perform locking of one resource', async function() {
		let id;
		for (let i = 0; i <= 2; i++) {
			try {
				id = await locker.lock('orange');
			} finally {
				await locker.unlock(id);
			}
		}
	});

	it('should fail on the second lock trial', async function() {
		await test.asyncThrows(async function() {
			await locker.lock('sapphire');
			await locker.lock('sapphire');
		});
	});

	it('should not fail with a zombie lock', async function() {
		const locker = await createLocker(db, 'locker', 50);
		await locker.lock('passion');
		await delay(100);
		await locker.lock('passion');
	});
});