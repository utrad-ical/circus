import validator = require('validator');

/**
 * key-value pairs of validation rules.
 * Input values not listed in this object will be ignored.
 */
export interface ValidatorRules {
	// key => [description, default, validator, sanitizer(normalizer)]
	[key: string]: [string, any, ((input: any) => boolean) | string | RegExp, ((input: any) => any) | string];
}

/**
 * Input value validator and sanitizer.
 */
export class Validator {
	private rules: ValidatorRules;

	constructor(rules) {
		this.rules = rules;
	}

	public validate(input: any): { result: any; errors: string[] } {
		var result: any = {};
		var errors: string[] = [];

		// iterates over the rules object
		for (var key in this.rules) {
			var spec = this.rules[key];
			var [/*description*/, defaults, rule, normalizer] = spec;
			var required: boolean = false;
			var value: any;
			if (/\!$/.test(key)) {
				key = key.slice(0, -1);
				required = true;
			}

			// check value existence
			if (!(key in input)) {
				if (required) {
					errors.push(`${key} is empty.`);
					continue;
				} else {
					result[key] = defaults;
					continue;
				}
			} else {
				value = input[key];
			}

			// Checks the input value.
			var ok: boolean = false;
			if (typeof rule === 'string') {
				// The rule is a set of rules delimited by the pipe character
				// (e.g. "isLength:2:5|isJSON")
				ok = rule.split(/\s\|\s/).every(cond => {
					var [funcName, ...rest] = cond.split(':');
					return validator[funcName](value, ...rest);
				});
			} else if (rule instanceof Function) {
				// The rule is checked by the given function
				ok = rule(input[key]);
			} else if (rule instanceof RegExp) {
				// The rule is checked with the given regexp
				ok = rule.test(input[key]);
			}

			// Normalizes the checked value.
			// A normalizer can be a string representing the node-validator function(s), or a function.
			if (ok) {
				if (typeof normalizer === 'string') {
					normalizer.split(/\s\|\s/).forEach(norm => {
						var [funcName, ...rest] = norm.split(':');
						value = validator[funcName](value, ...rest);
					});
				} else if (normalizer instanceof Function) {
					value = normalizer(value);
				}
				result[key] = value;
			} else {
				errors.push(`${key} is invalid.`);
			}
		}
		return { result: result, errors: errors };
	}
}