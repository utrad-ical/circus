'use strict';

const CircusDbDicomFileRepository = require('../CircusDbDicomFileRepository').default;

describe('CircusDbDicomFileRepository', function() {
	describe('#getSeriesLoader', function() {
		it('must reject for series that does not exist', function(done) {
			const repo = new CircusDbDicomFileRepository({
				configPath: __dirname + '/../../config/db_config.json'
			});
			repo.getSeriesLoader('1.2.3.4.5.6.7').then(loader => {
				console.log(loader);
				done(new Error('Unexpectedly succeeded to load nonexistent series'));
			}).catch(err => {
				done();
			});
		});
	});
});
