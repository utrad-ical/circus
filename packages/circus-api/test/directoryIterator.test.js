import directoryIterator from '../src/directoryIterator';
import path from 'path';
import { assert } from 'chai';

describe('directoryIterator', function() {
  it('iterate', async function() {
    const testDir = path.join(__dirname, 'dicom');
    let count = 0;
    for await (const buf of directoryIterator(testDir)) {
      count++;
    }
    assert.equal(count, 2);
  });
});
