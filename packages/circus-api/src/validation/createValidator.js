import Ajv from 'ajv';
import glob from 'glob-promise';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import * as path from 'path';

/**
 * Creates the validator instance that knows all the schemas
 * and can be used throughtout the API server.
 * The resulting object has two similar methods, `validate` and `validateWithDefaults`.
 */
export default async function createValidator(schemaRoot) {
	// Prepare some custom formats
	const intOrRange = '(0|[1-9][0-9]*)|(0|[1-9][0-9]*)-(0|[1-9][0-9]*)';
	const formats = {
		dicomUid: s => (
			typeof s === 'string' &&
			s.length <= 64 &&
			/^(0|[1-9][0-9]*)(\.(0|[1-9][0-9]*))+$/.test(s)
		),
		multiIntegerRange: new RegExp(`^${intOrRange}(,${intOrRange})*$`),
	};

	/**
	 * Takes a JSON schema and returns another JSON schema where
	 * all properties are marked as 'required'.
	 * The input JSON schema must be an object validator at the root level,
	 * and must have a `properties` keyword.
	 */
	const allRequired = (input, except = []) => {
		const schema = typeof input === 'string' ? schemas[input] : input;
		if (!schema || !schema.properties) {
			throw new TypeError('Unsupported JSON schema');
		}
		const props =
			Object.keys(schema.properties)
			.filter(p => except.indexOf(p) < 0);
		return { $async: true, allOf: [ schema, { required: props } ] };
	};

	// Install all the schema YAML files under "schemas" directory
	const schemaFiles = await glob(path.join(schemaRoot + '/*.yaml'));
	const schemas = {};
	for (const schemaFile of schemaFiles) {
		const basename = path.basename(schemaFile, '.yaml');
		const schemaData = yaml.safeLoad(await fs.readFile(schemaFile, 'utf8'));
		schemaData.$async = true; // just to make sure
		schemas[basename] = schemaData;
		schemas[basename + 'All'] = allRequired(schemaData);
	}

	const ajvOpts = {
		allErrors: true,
		removeAdditional: true,
		async: 'es7',
		format: 'full',
		formats,
		schemas
	};
	
	// We will keep two Avj instances with different options
	// because Ajv does not allow changing options after `new Ajv()`.
	const ajv = new Ajv(ajvOpts);
	const ajvWithDefaults = new Ajv({ ...ajvOpts, useDefaults: true });

	// We return an object that wraps the two Ajv instances.
	return {
		validate() {
			return ajv.validate.apply(ajv, arguments);
		},
		validateWithDefaults() {
			return ajvWithDefaults.validate.apply(ajvWithDefaults, arguments);
		},
		getSchema() {
			return ajv.getSchema.apply(ajv, arguments);
		},
		allRequired
	};
}

