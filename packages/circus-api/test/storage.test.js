import createStorage from '../src/storage/createStorage';
import { assert } from 'chai';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('Storage', function() {
	let store;

	const tmpDir = path.join(__dirname, 'tmp-dir');

	async function throws(func) {
		try {
			await func();
		} catch (err) {
			return;
		}
		throw new Error('did not throw');
	}

	before(async function() {
		await fs.emptyDir(tmpDir);
		store = await createStorage(
			'local',
			{
				root: tmpDir,
				nameToPath: p => path.join(p.substr(0, 2), p + '.txt')
			}
		);
	});

	beforeEach(async function() {
		await fs.emptyDir(tmpDir);
		await fs.outputFile(path.join(tmpDir, 'aa', 'aabbcc.txt'), 'coconut');
	});

	after(async function() {
		if (tmpDir) {
			await fs.remove(tmpDir);
		}
	});

	it('should throw error for nonexistent root', async function() {
		await throws(async function() {
			await createStorage('local', 'somewhere/over/the/rainbow');
		});
	});

	it('should execute write()', async function() {
		await store.write('xxyyzz', 'biscuit');
		const out = path.join(tmpDir, 'xx', 'xxyyzz.txt');
		assert.isTrue(await fs.pathExists(out));
		assert.equal(await fs.readFile(out, 'utf8'), 'biscuit');
	});

	it('should execute read()', async function() {
		assert.equal(await store.read('aabbcc'), 'coconut');
		await throws(async function() {
			await store.read('notafile');
		});
	});

	it('should execute exists()', async function() {
		assert.isTrue(await store.exists('aabbcc'));
		assert.isFalse(await store.exists('xxyyzz'));
	});

	it('should execute remove()', async function() {
		assert.isTrue(await fs.pathExists(path.join(tmpDir, 'aa', 'aabbcc.txt')));
		await store.remove('aabbcc');
		assert.isFalse(await fs.pathExists(path.join(tmpDir, 'aa', 'aabbcc.txt')));
	});
});