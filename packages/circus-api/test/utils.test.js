import { assert } from 'chai';
import exec from '../src/utils/exec';
import generateUniqueId from '../src/utils/generateUniqueId';

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
});
