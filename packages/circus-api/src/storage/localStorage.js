import fs from 'fs-extra';
import * as path from 'path';

export default async function localStorage(params) {
	const {
		root,
		nameToPath = (n => n)
	} = params;

	if (!root || !(await fs.pathExists(root))) {
		throw new Error(`Root directory "${root}" does not exist.`);
	}

	function buildPath(key) {
		return path.join(root, nameToPath(key));
	}

	async function read(key) {
		return await fs.readFile(buildPath(key));
	}

	async function write(key, data) {
		return await fs.outputFile(buildPath(key), data);
	}

	async function remove(key) {
		return await fs.unlink(buildPath(key));
	}

	async function exists(key) {
		// using fs-extra's extention method
		return await fs.pathExists(buildPath(key));
	}

	return { read, write, remove, exists };
}
