var Validator = require('../build/Validator').Validator;
var assert = require('chai').assert;

describe('Validator', function() {
	it('must process string rule', function() {
		var v = new Validator({
			fruit: ['Fruit', null, 'isLength:1:5|contains:a', null]
		});
		assert.equal(v.validate({fruit: 'apple'}).result.fruit, 'apple');
		assert.isNull(v.validate({fruit: 'banana'}).result);
	});

	it('must process regex rule', function() {
		var v = new Validator({
			fruit: ['Fruit', null, /a/, null]
		});
		assert.equal(v.validate({fruit: 'apple'}).result.fruit, 'apple');
		assert.isNull(v.validate({fruit: 'melon'}).result);
	});

	it('must process callback rule', function() {
		var v = new Validator({
			fruit: ['Fruit', null, t => /a/.test(t), null]
		});
		assert.equal(v.validate({fruit: 'apple'}).result.fruit, 'apple');
		assert.isNull(v.validate({fruit: 'melon'}).result);
	});

	it('must pass through input for "null" rule', function() {
		var v = new Validator({
			fruit: ['Fruit', null, null, null]
		});
		assert.equal(v.validate({fruit: 'apple'}).result.fruit, 'apple');
	});

	it('must return default value only if key is not set', function() {
		var v = new Validator({
			fruit: ['Fruit', 'orange', t => true, null]
		});
		assert.strictEqual(v.validate({fruit: 'apple'}).result.fruit, 'apple');
		assert.strictEqual(v.validate({fruit: ''}).result.fruit, '');
		assert.strictEqual(v.validate({fruit: null}).result.fruit, null);
		assert.strictEqual(v.validate({}).result.fruit, 'orange');
	});

	it('must sanitize input value', function() {
		var v = new Validator({
			fruit: ['Fruit', null, null, 'escape|trim']
		});
		assert.equal(v.validate({fruit: ' 2 >= 1\t'}).result.fruit, '2 &gt;= 1');
		var v = new Validator({
			fruit: ['Fruit', null, null, s => s.toUpperCase()]
		});
		assert.equal(v.validate({fruit: 'apple'}).result.fruit, 'APPLE');
	});

	it('must return null result for invalid input', function() {
		var v = new Validator({
			fruit: ['Fruit', null, 'isLength:1:5', null]
		});
		assert.equal(v.validate({fruit: 'banana'}).result);
	});
});