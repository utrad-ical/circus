import createStorage from './createStorage';
import Storage from './Storage';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('localStorage', () => {
  let store: Storage;

  const tmpDir = path.join(__dirname, 'tmp-dir');

  beforeAll(async function() {
    await fs.emptyDir(tmpDir);
    store = await createStorage('local', {
      root: tmpDir,
      nameToPath: (p: string) => path.join(p.substr(0, 2), p + '.txt')
    });
  });

  beforeEach(async function() {
    await fs.emptyDir(tmpDir);
    await fs.outputFile(path.join(tmpDir, 'aa', 'aabbcc.txt'), 'coconut');
  });

  afterAll(async function() {
    if (tmpDir) {
      await fs.remove(tmpDir);
    }
  });

  it('should throw error for nonexistent root', async function() {
    await expect(
      createStorage('local', 'somewhere/over/the/rainbow')
    ).rejects.toThrow();
  });

  it('should execute write()', async function() {
    await store.write('xxyyzz', Buffer.from('biscuit'));
    const out = path.join(tmpDir, 'xx', 'xxyyzz.txt');
    expect(await fs.pathExists(out)).toBe(true);
    expect(await fs.readFile(out, 'utf8')).toBe('biscuit');
  });

  it('should execute read()', async function() {
    expect(Buffer.from(await store.read('aabbcc')).toString('utf8')).toBe(
      'coconut'
    );
    await expect(store.read('notafile')).rejects.toThrow();
  });

  it('should execute exists()', async function() {
    expect(await store.exists('aabbcc')).toBe(true);
    expect(await store.exists('xxyyzz')).toBe(false);
  });

  it('should execute remove()', async function() {
    expect(await fs.pathExists(path.join(tmpDir, 'aa', 'aabbcc.txt'))).toBe(
      true
    );
    await store.remove('aabbcc');
    expect(await fs.pathExists(path.join(tmpDir, 'aa', 'aabbcc.txt'))).toBe(
      false
    );
  });
});
