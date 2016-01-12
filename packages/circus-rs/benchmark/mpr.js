"use strict";

var Benchmark = require('benchmark');
var MockDicomDumper = require('../build/server/dicom-dumpers/MockDicomDumper').default;

var dumper = new MockDicomDumper({ depth: 512 });

var volume = dumper.readDicom('dummy').then(function(volume) {
	var suite = new Benchmark.Suite;
	suite
		.add('MPR Axial', function() {
			volume.orthogonalMpr('axial', 5, 50, 10);
		})
		.add('MPR Coronal', function() {
			volume.orthogonalMpr('coronal', 5, 50, 10);
		})
		.add('MPR Oblique', function() {
			volume.singleOblique(
				'sagittal', [128, 128, 128], 0.5, 50, 10);
		})
		.on('cycle', function(event) {
			console.log(event.target.toString());
		});
	suite.run();
});
