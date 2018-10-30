import { assert } from 'chai';
import exec from '../src/utils/exec';
import generateUniqueId from '../src/utils/generateUniqueId';
import directoryIterator from '../src/utils/directoryIterator';
import path from 'path';

describe('utils', function() {
  describe('exec', function() {
    it('should return the content from stdout', async function() {
      const result = await exec('echo', ['Vega', 'Sirius']);
      assert.match(result, /^Vega Sirius/);
    });
  });

  describe('generateUniqueId', function() {
    it('should return lowercased ULID', function() {
      const id = generateUniqueId();
      assert.match(id, /^[0-9a-z]{26}$/);
    });
  });

  describe('directoryIterator', function() {
    it('should emit file contents for each file', async function() {
      const testDir = path.join(__dirname, 'dicom');
      let count = 0;
      for await (const buf of directoryIterator(testDir)) {
        assert(buf.byteLength > 0);
        count++;
      }
      assert.equal(count, 2);
    });
  });
});
