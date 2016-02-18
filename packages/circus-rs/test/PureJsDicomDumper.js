var assert = require('chai').assert;
var PureJsDicomDumper = require('../build/server/dicom-dumpers/PureJsDicomDumper').default;

describe('PureJsDicomDumper', function() {
	it.skip('must decode DICOM file from a given directory', function(done) {
		var dd = new PureJsDicomDumper();
		dd.readDicom('111.222.333.444.555').then(function(result) {
			done();
		});
	});
});
