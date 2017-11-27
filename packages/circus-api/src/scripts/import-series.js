import * as glob from 'glob-promise';
import * as path from 'path';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import connectDb from '../db/connectDb';
import createValidator from '../createValidator';
import createModels from '../db/createModels';
import createStorage from '../storage/createStorage';
import DicomImporter from '../DicomImporter';

export function help() {
	console.log('Imports DICOM series from file/directory.\n');
	console.log('Usage: node circus.js import-series [target...]');
}

async function importSeries(db, files) {
	const validator = await createValidator();
	const models = createModels(db, validator);
	const storage = await createStorage('local', {
		root: process.env.CIRCUS_DICOM_DIR
	});
	const importer = new DicomImporter(storage, models, { utility: process.env.DICOM_UTILITY });

	const paths = files.map(p => (
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

export default async function exec(files) {
	let db;
	try {
		db = await connectDb();
		await importSeries(db, files);
	} catch (err) {
		console.error(err);
	} finally {
		if (db) await db.close();
	}
}
