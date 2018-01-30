// const assert = require('chai').assert;
const PureJsDicomDumper = require('../src/server/dicom-dumpers/PureJsDicomDumper')
  .default;

describe('PureJsDicomDumper', function() {
  it.skip('must decode DICOM file from a given directory', function(done) {
    const dd = new PureJsDicomDumper();
    dd.readDicom('111.222.333.444.555').then(function() {
      done();
    });
  });
});
