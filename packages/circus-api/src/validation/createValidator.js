import Ajv from 'ajv';
import glob from 'glob-promise';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import * as path from 'path';

const loadSchemaFiles = async schemaRoot => {
	// Search all the schema YAML files under the root directory
	const schemaFiles = await glob(path.join(schemaRoot + '/*.yaml'));
	const schemas = {};
	for (const schemaFile of schemaFiles) {
		const basename = path.basename(schemaFile, '.yaml');
		const schemaData = yaml.safeLoad(await fs.readFile(schemaFile, 'utf8'));
		if (schemaData.$async !== true || schemaData.$id) {
			throw new TypeError('All schema must be async and have no $id field');
		}
		schemas[basename] = schemaData;
	}
	return schemas;
};

// Some custom formats
const intOrRange = '((0|[1-9][0-9]*)|(0|[1-9][0-9]*)-(0|[1-9][0-9]*))';

const customFormats = {
	dicomUid: s => (
		typeof s === 'string' &&
		s.length <= 64 &&
		/^(0|[1-9][0-9]*)(\.(0|[1-9][0-9]*))+$/.test(s)
	),
	multiIntegerRange: new RegExp(`^${intOrRange}(,${intOrRange})*$`),
};


/**
 * Creates the validator wrapping AJV instance.
 * This validator knows all the schemas under the 'schemas' directory
 * and can be used throughtout the API server.
 * The resulting object has two similar methods, `validate` and `validateWithDefaults`.
 */
export default async function createValidator(schemaRoot) {

	const schemas = await loadSchemaFiles(schemaRoot);

	/**
	 * Takes a JSON schema and returns another JSON schema where
	 * all properties are marked as 'required'.
	 * The input JSON schema must be an object validator at the root level,
	 * and must have a `properties` keyword.
	 */
	const allRequiredScheama = (input, except = []) => {
		const schema = typeof input === 'string' ? schemas[input] : input;
		if (!schema || !schema.properties) {
			throw new TypeError('Unsupported JSON schema');
		}
		const props = Object.keys(schema.properties).filter(p => except.indexOf(p) < 0);
		return {
			...schema,
			required: props
		};
	};

	const withDatesSchema = (input) => {
		const schema = typeof input === 'string' ? schemas[input] : input;
		if (!schema || !schema.properties) {
			throw new TypeError('Unsupported JSON schema');
		}
		return {
			...schema,
			properties: {
				...schema.properties,
				createdAt: { date: true },
				updatedAt: { date: true }
			}
		};
	};

	const sharedOpts = {
		allErrors: true,
		removeAdditional: true,
		async: 'es7',
		format: 'full',
		formats: customFormats
	};

	function toDate(schema, data, parentSchema, path, parentData, parentDataProperty) {
		const isoRegex = /(\d{4})-?(\d{2})-?(\d{2})([T ](\d{2})(:?(\d{2})(:?(\d{2}(\.\d+)?))?)?(Z|([+-])(\d{2}):?(\d{2})?)?)?/;
		if (isoRegex.test(data)) {
	 		parentData[parentDataProperty] = new Date(data);
			return true;
		} else {
			return false;
		}
	}

	function fromDate(schema, data, parentSchema, path, parentData, parentDataProperty) {
		if (data instanceof Date) {
			parentData[parentDataProperty] = data.toISOString();
			return true;
		} else {
			return false;
		}
	}

	function checkDate(schema, data) {
		return (data instanceof Date);
	}

	// We will keep several Avj instances with different options/keywords/etc
	// because Ajv does not allow changing options after `new Ajv()`.

	// The most plain validator
	const validator = new Ajv({ ...sharedOpts, schemas });
	validator.addKeyword('date', { validate: checkDate });

	// Convers ISO date strings into Date objects
	const toDateValidator = new Ajv({ ...sharedOpts, schemas });
	toDateValidator.addKeyword('date', { validate: toDate, modifying: true });

	// Convers Date objects into ISO date strings
	const fromDateValidator = new Ajv({ ...sharedOpts, schemas });
	fromDateValidator.addKeyword('date', { validate: fromDate, modifying: true });

	// Fills defaults
	const fillDefaultsValidator = new Ajv({ ...sharedOpts, useDefaults: true, schemas });

	const validateFunctions = {
		default() {
			return (schema, data) => validator.validate(schema, data);
		},
		toDate() {
			return (schema, data) => toDateValidator.validate(schema, data);
		},
		fromDate() {
			return (schema, data) => fromDateValidator.validate(schema, data);
		},
		fillDefaults() {
			return (schema, data) => fillDefaultsValidator.validate(schema, data);
		},
		allRequired() {
			return (schema, data) => validator.validate(allRequiredScheama(schema), data);
		},
		allRequiredExcept(except) {
			return (schema, data) => validator.validate(allRequiredScheama(schema, except), data);
		},
		dbEntry() {
			return (schema, data) => validator.validate(
				allRequiredScheama(withDatesSchema(schema)), data
			);
		}
	};

	// We return an object that wraps the two Ajv instances.
	return {
		validate: async(schema, data, options = { default: true }) => {
			for (const key in options) {
				const opt = options[key];
				if (!opt) continue;
				const func = validateFunctions[key](opt);
				data = await func(schema, data);
			}
			return data;
		},
		getSchema: key => {
			return validator.getSchema(key);
		}
	};
}
