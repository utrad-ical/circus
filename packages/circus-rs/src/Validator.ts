import v = require('validator');

interface ValidatorRules {
	// key => [description, default, validator, sanitizer(normalizer)]
	[key: string]: [string, any, (input: any) => boolean | string, (input: any) => any | string];
}

/**
 * Wraps node-validator and validates rules
 */
export default class Validator {
	private rules: ValidatorRules;

	constructor(rules) {
		this.rules = rules;
	}

	public validate(input: any): { result: any; errors: string[] } {
		var result = {};
		var errors = [];
		for (var key in this.rules) {
			var spec = this.rules[key];
			var [/*description*/, defaults, validator, normalizer] = spec;
			var required: boolean = false;
			var value: any;
			if (/\!$/.test(key)) {
				key = key.slice(0, -1);
				required = true;
			}
			if (!(key in input)) {
				if (required) {
					errors.push(`{key} is empty.`);
					continue;
				} else {
					value = defaults;
				}
			} else {
				value = input[key];
			}
			var ok: boolean = false;
			if (typeof validator === 'string') {
				ok = !validator.split(/\s\|\s/).every(cond => {
					var [funcName, ...rest] = cond.split(':');
					return v[funcName](value, ...rest);
				});
			} else if (typeof validator === 'function') {
				ok = validator(input[key]);
			}
			if (ok) {
				if (typeof normalizer === 'string') {
					normalizer.split(/\s\|\s/).forEach(norm => {
						var [funcName, ...rest] = norm.split(':');
						value = v[funcName](value, ...rest);
					});
				} else if (typeof normalizer === 'function') {
					value = normalizer(value);
				}
				result[key] = normalizer(input[key]);
			} else {
				errors.push(`{key} is invalid.`);
			}
		}
		return { result: result, errors: errors };
	}
}