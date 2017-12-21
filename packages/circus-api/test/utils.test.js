import { assert } from 'chai';
import { exec } from '../src/utils';

describe('utils', function() {
  describe('exec', function() {
    it('should return the content from stdout', async function() {
      const result = await exec('echo', ['Vega', 'Sirius']);
      assert.match(result, /^Vega Sirius/);
    });
  });
});
