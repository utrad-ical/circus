'use strict';

var assert = require('chai').assert;
var AsyncLruCache = require('../src/common/AsyncLruCache').default;

describe('AsyncLruCache', function() {

	function check(done, fn) {
		try {
			fn();
			done();
		} catch (e) {
			done(e);
		}
	}

	function doubler(key) {
		return new Promise(function(resolve, reject) {
			setTimeout(function() {
				resolve(key + key.toUpperCase());
			}, 30);
		});
	}

	function failer(key) {
		return new Promise(function(resolve, reject) {
			setTimeout(function() {
				reject(new Error('It did not work'));
			}, 30);
		});
	}

	function bufferLoader(key) {
		return Promise.resolve({
			content: Math.random(),
			length: parseInt(key.match(/\d+/)[0])
		});
	}

	it('must return valid length', function() {
		var cache = new AsyncLruCache(doubler);
		assert.property(cache, 'length');
		assert.equal(cache.length, 0);
	});

	describe('#get', function() {
		it('must return one item using Promise', function(done) {
			var cache = new AsyncLruCache(doubler);
			cache.get('foo').then(function (result) {
				check(done, function() {
					assert.equal(result, 'fooFOO');
					assert.equal(cache.length, 1);
				})
			});
		});

		it('must immediately return value if already loaded', function(done) {
			var cache = new AsyncLruCache(doubler);
			var time0 = (new Date()).getTime(), time1, time2;
			cache.get('foo').then(function(foo) {
				try {
					time1 = (new Date()).getTime();
					assert.equal(foo, 'fooFOO');
					assert(time1 - time0 > 25);
				} catch(e) {
					done(e);
				}
				return cache.get('foo');
			}).then(function(foo) {
				check(done, function() {
					time2 = (new Date()).getTime();
					assert.equal(foo, 'fooFOO');
					assert(time2 - time1 < 10);
				});
			});
		});

		it('must return multiple items with pending', function(done) {
			var cache = new AsyncLruCache(doubler);
			var promises = [];
			for (var i = 0; i < 10; i++) {
				promises.push(cache.get(i % 2 ? 'foo' : 'bar'));
			}
			Promise.all(promises).then(function (results) {
				check(done, function() {
					results.forEach(function(result, i) {
						assert.equal(result, i % 2 ? 'fooFOO' : 'barBAR');
					});
					assert.equal(cache.length, 2);
				})
			});
		});

		it('must reject if loading fails', function(done) {
			var cache = new AsyncLruCache(failer);
			cache.get('foo').then(
				function(result) { done(new Error('Unexpectedly resolved')); },
				function(err) { done(); }
			);
		});

		it('must bring the most recently used item to the last', function(done) {
			var cache = new AsyncLruCache(doubler);
			var foo;
			cache.get('foo').then(function(result) {
				foo = result;
				return cache.get('bar');
			}).then(function(bar) {
				check(done, function() {
					assert.equal(cache.getAt(0), foo);
					assert.equal(cache.getAt(1), bar);
					cache.touch('foo');
					assert.equal(cache.getAt(0), bar);
					assert.equal(cache.getAt(1), foo);
				});
			});
		});

		it('must handle context', function(done) {
			var cache = new AsyncLruCache(function(key, ctx) {
				return Promise.resolve(key + key.toUpperCase() + ctx);
			});
			Promise.all([cache.get('foo', 'a'), cache.get('bar', 'b')])
				.then(function(results) {
					check(done, function() {
						assert.equal(results[0], 'fooFOOa');
						assert.equal(results[1], 'barBARb');
					});
				})
		});
	});

	describe('#indexOf', function() {
		it('must return index of item', function(done) {
			var cache = new AsyncLruCache(doubler);
			cache.get('foo').then(function(result) {
				check(done, function() {
					assert.equal(cache.indexOf('foo'), 0);
					assert.equal(cache.indexOf('bar'), -1);
				});
			});
		});
	});

	describe('#totalSize', function() {
		it('must calculate total size', function(done) {
			var opts = { sizeFunc: function(i) { return i.length; }};
			var cache = new AsyncLruCache(bufferLoader, opts);
			cache.get('item10000')
			.then(function(item) {
				try {
					assert.equal(cache.getTotalSize(), 10000);
				} catch(e) {
					done(e);
				}
				return cache.get('item20000');
			}).then(function(item) {
				check(done, function() {
					assert.equal(cache.getTotalSize(), 30000);
					cache.remove('item10000');
					assert.equal(cache.getTotalSize(), 20000);
				})
			});
		});
	});

	describe('#remove', function() {
		it('must remove loaded item', function(done) {
			var cache = new AsyncLruCache(doubler);
			cache.get('item')
				.then(function() {
					check(done, function() {
						assert.equal(cache.length, 1);
						cache.remove('item');
						assert.equal(cache.length, 0);
						assert.strictEqual(cache.touch('item'), undefined);
					});
				});
		});

		it('must reject removed pending items', function(done) {
		 	var cache = new AsyncLruCache(doubler);
		 	cache.get('foo').then(
				function () { done(new Error('Unexpectedly resolved')) },
				function (err) { done(); }
			);
			cache.remove('foo');
		});
	});

	describe('limits', function() {
		var cache;
		beforeEach(function() {
			cache = new AsyncLruCache(bufferLoader, {
				maxCount: 10,
				maxSize: 1000,
				maxLife: 0.01,
				sizeFunc: function(i) { return i.length; }
			});
		});

		it('must not contain items above count limit', function(done) {
			var promises = [];
			for (var i = 1; i <= 20; i++) {
				promises.push(cache.get('item' + i));
			}
			Promise.all(promises).then(function() {
				check(done, function() {
					// only last 10 items must remain
					assert.equal(cache.length, 10);
					assert.equal(cache.getTotalSize(), (11+20)*10/2);
				});
			});
		});

		it('must not contain items above size limit', function(done) {
			var promises = [];
			for (var i = 0; i <= 5; i++) {
				promises.push(cache.get('item' + i * 100));
			}
			Promise.all(promises).then(function() {
				check(done, function() {
					// only last 2 items (500, 400) must remain
					assert.equal(cache.length, 2);
					assert.equal(cache.getTotalSize(), 900);
				})
			});
		});

		it('must not contain items after time limit', function(done) {
			cache.get('item100').then(function(item) {
				cache.checkTtl();
				try {
					assert.equal(cache.touch('item100'), item);
				} catch (e) {
					done(e);
				}
				setTimeout(function() {
					check(done, function() {
						cache.checkTtl();
						assert.notEqual(cache.touch('item100'), item);
						assert.equal(cache.length, 0);
					});
				}, 20);
			});
		});
	});

});
