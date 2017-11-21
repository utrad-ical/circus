require('babel-register');
const glob = require('glob-promise');
const path = require('path');
const chalk = require('chalk');

const connectDb = require('../src/db/connectDb').default;
const createValidator = require('../src/createValidator').default;
const createModels = require('../src/db/createModels').default;

async function scanMigrationFiles() {
	const results = [];
	const files = await glob(path.resolve(__dirname, 'migrations', '*'));
	files.forEach(file => {
		try {
			const base = path.basename(file);
			const rev = parseInt(/^(\d+)/.exec(base)[0], 10);
			if (rev <= 0) throw new RangeError('rev: ' + rev);
			results[rev] = file;
		} catch(err) {
			throw new Error('Invalid migration file name format: ' +  err.message);
		}
	});
	if (results.length !== files.length + 1) {
		throw new Error('Migration files are not named sequentially.');
	}
	return results;
}

async function migrate(db) {
	const migrations = await scanMigrationFiles();
	const validator = await createValidator(path.resolve(__dirname, '../src/schemas'));

	const models = await createModels(db, validator);
	const migrationCollection = db.collection('migration');

	const revDoc = await migrationCollection.find({}).toArray();
	const currentRevision = revDoc.length ? revDoc[0].revision : 0;

	console.log('Current Revision: ' + currentRevision);

	if (currentRevision === migrations.length - 1) {
		console.log('Up to date.');
		return;
	}

	for (let i = currentRevision + 1; i in migrations; i++) {
		const file = migrations[i];
		const module = require(file);
		const name = path.basename(file);
		console.log(chalk.green('Forwarding...'), name);
		try {
			await module.up(db, models);
			await migrationCollection.updateOne({},
				{ $set: { revision: i, updatedAt: new Date() }},
				{ upsert: true }
			);
		} catch (err) {
			console.error(chalk.red('Error: ', name));
			console.error(err.message);
			if (err.errors) console.error(err.errors);
			break;
		}
	}
}

async function exec() {
	let db;
	try {
		db = await connectDb();
		await migrate(db);
	} catch(err) {
		console.error(err);
	} finally {
		if (db) await db.close();
	}
}

exec();