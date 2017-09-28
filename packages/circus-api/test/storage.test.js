import createStorage from '../src/storage/createStorage';
import { assert } from 'chai';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('Storage', function() {
	let store1;
	let store2;

	const tmpDir = path.join(__dirname, 'tmp-dir');

	before(async function() {
		await fs.emptyDir(tmpDir);
		store1 = await createStorage('local', { root: tmpDir, preHashed: true });
		store2 = await createStorage('local', { root: tmpDir, preHashed: false });
	});

	beforeEach(async function() {
		await fs.emptyDir(tmpDir);
		await fs.outputFile(path.join(tmpDir, 'aa', 'bb', 'aabbcc.txt'), 'coconut');
		await fs.outputFile(path.join(tmpDir, '91', 'e1', 'aabbcc.txt'), 'pudding');
	});

	after(async function() {
		if (tmpDir) {
			await fs.remove(tmpDir);
		}
	});

	// sha1('aabbcc.txt') === '91e157b3...'
	// sha1('xxyyzz,txt') === '176b3478...'

	it('should throw error for nonexistent root', async function() {
		try {
			await createStorage('local', 'somewhere/over/the/rainbow');
		} catch (err) {
			return;
		}
		throw new Error('Did not throw');
	});

	it('should execute write()', async function() {
		await store1.write('xxyyzz.txt', 'biscuit');
		await store2.write('xxyyzz.txt', 'chocolate');
		const out1 = path.join(tmpDir, 'xx', 'yy', 'xxyyzz.txt');
		assert.isTrue(await fs.pathExists(out1));
		assert.equal(await fs.readFile(out1, 'utf8'), 'biscuit');
		const out2 = path.join(tmpDir, '17', '6b', 'xxyyzz.txt');
		assert.isTrue(await fs.pathExists(out2));
		assert.equal(await fs.readFile(out2, 'utf8'), 'chocolate');
	});

	it('should execute read()', async function() {
		assert.equal(await store1.read('aabbcc.txt'), 'coconut');
		assert.equal(await store2.read('aabbcc.txt'), 'pudding');
		try {
			await store1.read('xxyyzz.txt');
		} catch(err) {
			return;
		}
		throw new Error('Did not throw');
	});

	it('should execute exists()', async function() {
		assert.isTrue(await store1.exists('aabbcc.txt'));
		assert.isTrue(await store2.exists('aabbcc.txt'));
		assert.isFalse(await store1.exists('xxyyzz.txt'));
	});

	it('should execute remove()', async function() {
		assert.isTrue(await fs.pathExists(path.join(tmpDir, 'aa', 'bb', 'aabbcc.txt')));
		await store1.remove('aabbcc.txt');
		assert.isFalse(await fs.pathExists(path.join(tmpDir, 'aa', 'bb', 'aabbcc.txt')));

		assert.isTrue(await fs.pathExists(path.join(tmpDir, '91', 'e1', 'aabbcc.txt')));
		await store2.remove('aabbcc.txt');
		assert.isFalse(await fs.pathExists(path.join(tmpDir, '91', 'e1', 'aabbcc.txt')));
	});
});