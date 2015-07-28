import validator = require('validator');

export interface ValidatorRules {
	// key => [description, default, validator, sanitizer(normalizer)]
	[key: string]: [string, any, ((input: any) => boolean) | string | RegExp, ((input: any) => any) | string];
}

/**
 * Wraps node-validator and validates rules
 */
export class Validator {
	private rules: ValidatorRules;

	constructor(rules) {
		this.rules = rules;
	}

	public validate(input: any): { result: any; errors: string[] } {
		var result: any = {};
		var errors: string[] = [];
		for (var key in this.rules) {
			var spec = this.rules[key];
			var [/*description*/, defaults, rule, normalizer] = spec;
			var required: boolean = false;
			var value: any;
			if (/\!$/.test(key)) {
				key = key.slice(0, -1);
				required = true;
			}
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
			var ok: boolean = false;
			if (typeof rule === 'string') {
				ok = rule.split(/\s\|\s/).every(cond => {
					var [funcName, ...rest] = cond.split(':');
					return validator[funcName](value, ...rest);
				});
			} else if (typeof rule === 'function') {
				ok = rule(input[key]);
			} else if (rule instanceof RegExp) {
				ok = rule.test(input[key]);
			}
			if (ok) {
				if (typeof normalizer === 'string') {
					normalizer.split(/\s\|\s/).forEach(norm => {
						var [funcName, ...rest] = norm.split(':');
						value = validator[funcName](value, ...rest);
					});
				} else if (typeof normalizer === 'function') {
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