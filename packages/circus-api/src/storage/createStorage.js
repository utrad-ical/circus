import fs from 'fs-extra';
import * as crypto from 'crypto';
import * as path from 'path';

/**
 * Provides simple key-value storage
 */
export default async function createStorage(type, params) {
	if (type !== 'local') throw Error('not yet supported');
	return await localStorage(params);
}

export async function localStorage(params) {
	const {
		root,
		preHashed = false
	} = params;

	if (!(await fs.pathExists(root))) {
		throw new Error('Root directory does not exist');
	}

	function sha1(string) {
		const hasher = crypto.createHash('sha1');
		hasher.update(string);
		return hasher.digest('hex');
	}

	function buildPath(key) {
		if (typeof key !== 'string') {
			throw new TypeError('Invalid key');
		}

		const hashStr = preHashed ? key : sha1(key);

		if (hashStr.length < 4) {
			throw new TypeError('Wrong digest');
		}

		return path.join(
			root,
			hashStr.substr(0, 2),
			hashStr.substr(2, 2),
			key
		);
	}

	async function read(key) {
		return await fs.readFile(buildPath(key));
	}

	async function write(key, data) {
		const outPath = buildPath(key);
		await fs.ensureDir(path.dirname(outPath));
		return await fs.writeFile(outPath, data);
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
