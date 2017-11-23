require('babel-register');
const glob = require('glob-promise');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const connectDb = require('../src/db/connectDb').default;
const createValidator = require('../src/createValidator').default;
const createModels = require('../src/db/createModels').default;
const createStorage = require('../src/storage/createStorage').default;
const DicomImporter = require('../src/DicomImporter').default;

async function importSeries(db) {
	const validator = await createValidator(path.resolve(__dirname, '../src/schemas'));
	const models = createModels(db, validator);
	const storage = await createStorage('local', {
		root: process.env.CIRCUS_DICOM_DIR
	});
	const importer = new DicomImporter(storage, models, { utility: process.env.DICOM_UTILITY });

	const paths = process.argv.slice(2).map(p => (
		path.resolve(process.cwd(), p)
	));
	if (!paths.length) {
		console.log(chalk.red('No file or directory specified.'));
		return;
	}

	let count = 0;
	for (const pathArg of paths) {
		let stat;
		try {
			stat = await fs.stat(pathArg);
		} catch (err) {
			const message = err.code === 'ENOENT' ?
				`${pathArg} is not a file nor a directory.` :
				`Error while trying to access ${pathArg}.`;
			console.error(chalk.red(message));
			continue;
		}
		let files;
		if (stat.isFile()) {
			files = [pathArg];
		} else if (stat.isDirectory()) {
			files = await glob(path.join(pathArg, '**/*.dcm'));
		}
		for (const file of files) {
			console.log(`Importing: ${file}`);
			await importer.importFromFile(file);
			count++;
		}
	}
	console.log(chalk.green('Import finished.'));
	console.log(`Imported ${count} file(s).`);
}

async function exec() {
	let db;
	try {
		db = await connectDb();
		await importSeries(db);
	} catch(err) {
		console.error(err);
	} finally {
		if (db) await db.close();
	}
}

exec();